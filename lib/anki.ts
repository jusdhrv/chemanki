import type { CompoundData } from '@/lib/pubchem'

export type CardType = 'image-to-name' | 'name-to-image' | 'name-to-properties'

export const CARD_DIRECTIONS: { type: CardType; label: string }[] = [
  { type: 'image-to-name', label: 'Bond-line structure → IUPAC name, common names & properties' },
  { type: 'name-to-image', label: 'IUPAC / common name → bond-line structure' },
  { type: 'name-to-properties', label: 'Common / shortened name → full IUPAC name & properties' },
]

export const CARD_DETAILS = ['Formula', 'Molecular weight', 'Physical properties', 'Custom notes']

export type AnkiCard = {
  id: string
  type: CardType
  front: string
  back: string
}

export type CardGenerationOptions = {
  cardTypes: CardType[]
  details: string[]
  customNotes: string
}

type ExportProgress = (message: string) => void

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character] ?? character
  })
}

function formatFormulaHtml(formula: string): string {
  return escapeHtml(formula).replace(/(\d+)/g, '<sub>$1</sub>')
}

function formatMolecularWeight(weight: string): string {
  if (!weight || weight === '—') return '—'
  return weight.toLowerCase().includes('g') ? weight : `${weight} g/mol`
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>()
  return names
    .map((name) => name.trim())
    .filter((name) => {
      const key = name.toLocaleLowerCase()
      if (!name || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function detailFields(
  compound: CompoundData,
  options: CardGenerationOptions,
): string {
  const rows: string[] = []
  if (options.details.includes('Formula')) {
    rows.push(`<p><strong>Formula:</strong> ${formatFormulaHtml(compound.formula)}</p>`)
  }
  if (options.details.includes('Molecular weight')) {
    rows.push(`<p><strong>Molecular weight:</strong> ${escapeHtml(formatMolecularWeight(compound.molecularWeight))}</p>`)
  }
  if (options.details.includes('Physical properties')) {
    const physicalProperties = compound.physicalProperties ?? []
    rows.push(
      physicalProperties.length
        ? physicalProperties
            .map((property) => `<p><strong>${escapeHtml(property.name)}:</strong> ${escapeHtml(property.value)}</p>`)
            .join('')
        : '<p><strong>Physical properties:</strong> No PubChem properties available</p>',
    )
  }
  if (options.details.includes('Custom notes') && options.customNotes.trim()) {
    rows.push(`<p><strong>Notes:</strong> ${escapeHtml(options.customNotes.trim())}</p>`)
  }
  return rows.join('')
}

function imageTag(filename: string, title: string): string {
  return `<img src="${escapeHtml(filename)}" alt="Bond-line structure of ${escapeHtml(title)}">`
}

export function buildAnkiCards(
  compound: CompoundData,
  options: CardGenerationOptions,
  imageFilename: string,
): AnkiCard[] {
  const cards: AnkiCard[] = []
  const fullName = compound.iupacName.trim() || compound.title
  const commonNames = uniqueNames(compound.commonNames).filter(
    (name) => name.toLocaleLowerCase() !== fullName.toLocaleLowerCase(),
  )
  const commonNamesHtml = commonNames.length
    ? commonNames.map((name) => `<li>${escapeHtml(name)}</li>`).join('')
    : '<li>No common names listed</li>'
  const properties = detailFields(compound, options)

  if (options.cardTypes.includes('image-to-name')) {
    cards.push({
      id: 'image-to-name',
      type: 'image-to-name',
      front: imageTag(imageFilename, compound.title),
      back: [
        `<p><strong>IUPAC name:</strong> ${escapeHtml(fullName)}</p>`,
        `<p><strong>Common names:</strong></p><ul>${commonNamesHtml}</ul>`,
        properties,
      ].join(''),
    })
  }

  if (options.cardTypes.includes('name-to-image')) {
    const names = uniqueNames([fullName, ...commonNames])
    names.forEach((name, index) => {
      cards.push({
        id: `name-to-image-${index}`,
        type: 'name-to-image',
        front: escapeHtml(name),
        back: imageTag(imageFilename, compound.title),
      })
    })
  }

  if (options.cardTypes.includes('name-to-properties')) {
    const shortNames = uniqueNames([compound.title, ...commonNames]).filter(
      (name) => name.toLocaleLowerCase() !== fullName.toLocaleLowerCase(),
    )
    shortNames.forEach((name, index) => {
      cards.push({
        id: `name-to-properties-${index}`,
        type: 'name-to-properties',
        front: escapeHtml(name),
        back: [
          `<p><strong>Full IUPAC name:</strong> ${escapeHtml(fullName)}</p>`,
          properties,
        ].join(''),
      })
    })
  }

  return cards
}

async function fetchStructureImage(cid: number): Promise<Blob> {
  const response = await fetch(`/api/pubchem/image?cid=${encodeURIComponent(cid)}`)
  if (!response.ok) {
    throw new Error('Could not load the bond-line image from PubChem. Try again before exporting.')
  }
  return response.blob()
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

type AnkiConnectResponse<T> = {
  result: T
  error: string | null
}

async function callAnkiConnect<T>(
  endpoint: string,
  action: string,
  params?: Record<string, unknown>,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, ...(params ? { params } : {}) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new Error(
      `Could not reach AnkiConnect at ${endpoint}. Make sure Anki is open and AnkiConnect is installed. If this site is open in a browser, add its origin to AnkiConnect's webCorsOriginList to allow the connection.`,
    )
  }

  let data: AnkiConnectResponse<T>
  try {
    data = (await response.json()) as AnkiConnectResponse<T>
  } catch {
    throw new Error(`AnkiConnect returned an unreadable response for "${action}".`)
  }

  if (!response.ok) {
    throw new Error(`AnkiConnect request "${action}" failed with HTTP ${response.status}.`)
  }
  if (data.error) {
    throw new Error(`AnkiConnect could not complete "${action}": ${data.error}`)
  }
  return data.result
}

function validateAnkiSettings(endpoint: string, deckName: string): string {
  let parsedEndpoint: URL
  try {
    parsedEndpoint = new URL(endpoint)
  } catch {
    throw new Error('Enter a valid AnkiConnect URL in AnkiConnect settings.')
  }
  if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) {
    throw new Error('The AnkiConnect URL must use HTTP or HTTPS.')
  }
  if (!deckName.trim()) throw new Error('Enter a target deck name in AnkiConnect settings.')
  return parsedEndpoint.toString()
}

export async function exportToAnkiConnect(
  compound: CompoundData,
  cards: AnkiCard[],
  endpoint: string,
  deckName: string,
  onProgress: ExportProgress,
): Promise<number> {
  if (!cards.length) throw new Error('Select at least one card type that can be generated for this compound.')
  const url = validateAnkiSettings(endpoint.trim(), deckName)
  const targetDeck = deckName.trim()

  onProgress('Checking AnkiConnect and target deck…')
  const deckNames = await callAnkiConnect<string[]>(url, 'deckNames')
  if (!deckNames.includes(targetDeck)) {
    onProgress(`Creating deck "${targetDeck}"…`)
    await callAnkiConnect<number>(url, 'createDeck', { deck: targetDeck })
  }

  onProgress('Loading the structure image…')
  const image = await fetchStructureImage(compound.cid)
  const imageFilename = `chemanki-${compound.cid}.png`
  const imageData = toBase64(new Uint8Array(await image.arrayBuffer()))
  await callAnkiConnect<string>(url, 'storeMediaFile', {
    filename: imageFilename,
    data: imageData,
    allowOverwrite: true,
  })

  onProgress(`Sending ${cards.length} card${cards.length === 1 ? '' : 's'} to Anki…`)
  const results = await callAnkiConnect<Array<number | null>>(url, 'addNotes', {
    notes: cards.map((card) => ({
      deckName: targetDeck,
      modelName: 'Basic',
      fields: { Front: card.front, Back: card.back },
      options: { allowDuplicate: false },
      tags: ['chemanki', card.type],
    })),
  })
  const addedCount = results.filter((noteId) => noteId !== null).length
  return addedCount
}

function makeDownloadFilename(deckName: string): string {
  const safeName = deckName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
  return `${safeName || 'ChemAnki'}.apkg`
}

export async function downloadAnkiPackage(
  compound: CompoundData,
  cards: AnkiCard[],
  deckName: string,
  onProgress: ExportProgress,
): Promise<void> {
  if (!cards.length) throw new Error('Select at least one card type that can be generated for this compound.')
  if (!deckName.trim()) throw new Error('Enter a target deck name in AnkiConnect settings.')

  onProgress('Loading the structure image…')
  const image = await fetchStructureImage(compound.cid)
  onProgress('Preparing the Anki package…')

  let exporter: import('anki-apkg-export').default | undefined
  try {
    const { default: AnkiExport } = await import('anki-apkg-export')
    exporter = await AnkiExport.create(deckName.trim(), {
      locateFile: () => '/api/anki/sql-wasm',
    })
    const imageFilename = `chemanki-${compound.cid}.png`
    exporter.addMedia(imageFilename, image)
    exporter.addCards(
      cards.map((card) => ({
        front: card.front,
        back: card.back,
        noteId: `${compound.cid}-${card.id}`,
        tags: ['chemanki', card.type],
      })),
    )

    onProgress('Building the .apkg file…')
    const blob = await exporter.save({ type: 'blob', compression: 'DEFLATE' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = makeDownloadFilename(deckName)
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } finally {
    exporter?.close()
  }
}
