const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

const HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'ChemAnki/0.1 (chemistry flashcard builder)',
}

export type CompoundData = {
  cid: number
  iupacName: string
  title: string
  commonNames: string[]
  formula: string
  molecularWeight: string
  smiles: string
  imageUrl: string
  description: string
}

export type CompoundSearchHit = {
  cid: number
  title: string
  formula: string
  iupacName: string
}

type CidListResponse = {
  IdentifierList?: { CID?: number[] }
  Waiting?: { ListKey?: string; Message?: string }
  Fault?: { Code?: string; Message?: string }
}

type PropertyResponse = {
  PropertyTable?: {
    Properties?: Array<{
      CID: number
      IUPACName?: string
      MolecularFormula?: string
      MolecularWeight?: string | number
      CanonicalSMILES?: string
      Title?: string
    }>
  }
}

type SynonymResponse = {
  InformationList?: {
    Information?: Array<{ CID?: number; Synonym?: string[] }>
  }
}

type DescriptionResponse = {
  InformationList?: {
    Information?: Array<{ CID?: number; Title?: string; Description?: string }>
  }
}

export function getCompoundImageUrl(cid: number): string {
  return `${PUBCHEM_BASE}/compound/cid/${cid}/PNG?image_size=400x400`
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, '+')
}

async function pugRequest(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { ...HEADERS, ...init?.headers },
      signal: init?.signal ?? AbortSignal.timeout(20_000),
      next: { revalidate: 86_400 },
    })
    if (response.status === 404) return null
    if (!response.ok) return null
    return response
  } catch {
    return null
  }
}

async function pugJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const response = await pugRequest(url, init)
  if (!response) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function readCids(url: string, init?: RequestInit): Promise<number[]> {
  let data = await pugJson<CidListResponse>(url, init)
  if (!data) return []

  if (data.IdentifierList?.CID?.length) {
    return data.IdentifierList.CID.filter((cid) => Number.isFinite(cid))
  }

  let listKey = data.Waiting?.ListKey
  for (let attempt = 0; attempt < 8 && listKey; attempt += 1) {
    await sleep(400)
    data = await pugJson<CidListResponse>(`${PUBCHEM_BASE}/compound/listkey/${listKey}/cids/JSON`)
    if (data?.IdentifierList?.CID?.length) {
      return data.IdentifierList.CID.filter((cid) => Number.isFinite(cid))
    }
    listKey = data?.Waiting?.ListKey
  }

  return []
}

async function cidsByName(query: string): Promise<number[]> {
  return readCids(`${PUBCHEM_BASE}/compound/name/${encodePathSegment(query)}/cids/JSON`)
}

async function cidsBySmiles(query: string): Promise<number[]> {
  const encodedGet = await readCids(
    `${PUBCHEM_BASE}/compound/smiles/${encodePathSegment(query)}/cids/JSON`,
  )
  if (encodedGet.length) return encodedGet

  return readCids(`${PUBCHEM_BASE}/compound/smiles/cids/JSON`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `smiles=${encodeURIComponent(query.trim())}`,
  })
}

async function cidsByFormula(query: string): Promise<number[]> {
  const formula = query.trim().replace(/[₀-₉]/g, (digit) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(digit)))
  const fast = await readCids(
    `${PUBCHEM_BASE}/compound/fastformula/${encodePathSegment(formula)}/cids/JSON?MaxRecords=8`,
  )
  if (fast.length) return fast
  return readCids(`${PUBCHEM_BASE}/compound/formula/${encodePathSegment(formula)}/cids/JSON`)
}

export async function resolveCompoundCids(query: string): Promise<number[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const byName = await cidsByName(trimmed)
  if (byName.length) return byName

  const bySmiles = await cidsBySmiles(trimmed)
  if (bySmiles.length) return bySmiles

  return cidsByFormula(trimmed)
}

async function getProperties(cids: number[]) {
  if (!cids.length) return []
  const data = await pugJson<PropertyResponse>(
    `${PUBCHEM_BASE}/compound/cid/${cids.join(',')}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,Title/JSON`,
  )
  return data?.PropertyTable?.Properties ?? []
}

function pickCommonNames(synonyms: string[], title: string, iupacName: string): string[] {
  const skip = new Set([title.toLowerCase(), iupacName.toLowerCase()])
  const names: string[] = []

  for (const synonym of synonyms) {
    const cleaned = synonym.trim()
    if (!cleaned || cleaned.length > 48) continue
    if (skip.has(cleaned.toLowerCase())) continue
    if (names.some((name) => name.toLowerCase() === cleaned.toLowerCase())) continue
    names.push(cleaned)
    if (names.length >= 8) break
  }

  return names
}

async function getSynonyms(cid: number): Promise<string[]> {
  const data = await pugJson<SynonymResponse>(`${PUBCHEM_BASE}/compound/cid/${cid}/synonyms/JSON`)
  return data?.InformationList?.Information?.[0]?.Synonym ?? []
}

async function getDescription(cid: number): Promise<string> {
  const data = await pugJson<DescriptionResponse>(
    `${PUBCHEM_BASE}/compound/cid/${cid}/description/JSON`,
  )
  const entries = data?.InformationList?.Information ?? []
  return entries.map((entry) => entry.Description?.trim()).find(Boolean) ?? ''
}

export async function getCompoundByCid(cid: number): Promise<CompoundData | null> {
  if (!Number.isFinite(cid) || cid <= 0) return null

  const [properties, synonyms, description] = await Promise.all([
    getProperties([cid]),
    getSynonyms(cid),
    getDescription(cid),
  ])

  const property = properties[0]
  if (!property) return null

  const title = property.Title?.trim() || property.IUPACName?.trim() || `CID ${cid}`
  const iupacName = property.IUPACName?.trim() || title
  const formula = property.MolecularFormula?.trim() || '—'
  const molecularWeight = String(property.MolecularWeight ?? '').trim()
  const smiles = property.CanonicalSMILES?.trim() || ''

  return {
    cid,
    iupacName,
    title,
    commonNames: pickCommonNames(synonyms, title, iupacName),
    formula,
    molecularWeight,
    smiles,
    imageUrl: getCompoundImageUrl(cid),
    description,
  }
}

export async function searchCompounds(query: string): Promise<CompoundSearchHit[]> {
  const cids = (await resolveCompoundCids(query)).slice(0, 8)
  if (!cids.length) return []

  const properties = await getProperties(cids)
  return properties.map((property) => ({
    cid: property.CID,
    title: property.Title?.trim() || property.IUPACName?.trim() || `CID ${property.CID}`,
    formula: property.MolecularFormula?.trim() || '—',
    iupacName: property.IUPACName?.trim() || '',
  }))
}

export async function lookupCompound(query: string): Promise<CompoundData | null> {
  const hits = await searchCompounds(query)
  if (!hits[0]) return null
  return getCompoundByCid(hits[0].cid)
}
