'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  buildAnkiCards,
  CARD_DETAILS,
  CARD_DIRECTIONS,
  downloadAnkiPackage,
  exportToAnkiConnect,
  type CardType,
} from '@/lib/anki'
import type { CompoundData, CompoundSearchHit } from '@/lib/pubchem'
import { ChevronDown, FlaskConical, LoaderCircle, Moon, Search, Settings2, Sun, Upload, X } from 'lucide-react'

const INITIAL_QUERY = 'methyl salicylate'
const DEFAULT_HISTORY = ['methyl salicylate', 'aspirin', 'benzene']

function formatFormula(formula: string) {
  return formula.replace(/\d+/g, (digits) => digits.split('').map((digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)] ?? digit).join(''))
}

function formatWeight(weight: string) {
  if (!weight || weight === '—') return '—'
  return weight.toLowerCase().includes('g') ? weight : `${weight} g/mol`
}

function MoleculePreview({ compound }: { compound: CompoundData }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [compound.imageUrl])

  return (
    <div className="relative flex min-h-60 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white">
      <div className="absolute left-4 top-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        <span className="size-2 rounded-full bg-emerald-500" /> 2D Structure
      </div>
      {failed ? (
        <p className="px-6 text-center text-sm text-zinc-500">No 2D diagram available for CID {compound.cid}.</p>
      ) : (
        // PubChem PNGs are white-background bond-line diagrams; keep a light stage in both themes.
        <img
          src={compound.imageUrl}
          alt={`2D bond-line diagram of ${compound.title}`}
          className="max-h-72 w-full max-w-[320px] object-contain p-6"
          onError={() => setFailed(true)}
        />
      )}
      <span className="absolute bottom-3 right-3 rounded bg-zinc-100 px-2 py-1 font-mono text-[10px] text-zinc-600">
        {formatFormula(compound.formula)}
      </span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-xs font-medium break-all">{value}</span>
    </div>
  )
}

function CompoundSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-7 p-5 lg:grid-cols-[minmax(270px,0.75fr)_1.25fr] lg:p-7">
        <div className="min-h-60 animate-pulse rounded-xl bg-muted/60" />
        <div className="flex flex-col gap-5">
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-y py-3 sm:grid-cols-3">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [dark, setDark] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [expanded, setExpanded] = useState<'uses' | null>('uses')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [selectedDirections, setSelectedDirections] = useState<CardType[]>(['image-to-name', 'name-to-properties'])
  const [selectedDetails, setSelectedDetails] = useState(['Formula', 'Molecular weight', 'Physical properties'])
  const [customNotes, setCustomNotes] = useState('')
  const [ankiEndpoint, setAnkiEndpoint] = useState('http://localhost:8765')
  const [deckName, setDeckName] = useState('Organic Chemistry')
  const [endpointDraft, setEndpointDraft] = useState('http://localhost:8765')
  const [deckNameDraft, setDeckNameDraft] = useState('Organic Chemistry')
  const [exporting, setExporting] = useState<'anki' | 'apkg' | null>(null)
  const [exportProgress, setExportProgress] = useState('')
  const [exportError, setExportError] = useState('')
  const [ankiStatus, setAnkiStatus] = useState<'unknown' | 'connected' | 'unavailable'>('unknown')
  const [history, setHistory] = useState(DEFAULT_HISTORY)
  const [hits, setHits] = useState<CompoundSearchHit[]>([])
  const [compound, setCompound] = useState<CompoundData | null>(null)
  const [loading, setLoading] = useState(true)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const skipDebounce = useRef(true)

  const suggestions = useMemo(() => {
    if (!query.trim()) return history.map((item) => ({ label: item, cid: null as number | null, meta: 'Recent' }))
    const seen = new Set<string>()
    const items: Array<{ label: string; cid: number | null; meta: string }> = []
    for (const hit of hits) {
      const label = hit.title
      if (seen.has(label.toLowerCase())) continue
      seen.add(label.toLowerCase())
      items.push({ label, cid: hit.cid, meta: hit.formula })
    }
    for (const item of history) {
      if (!item.toLowerCase().includes(query.trim().toLowerCase())) continue
      if (seen.has(item.toLowerCase())) continue
      seen.add(item.toLowerCase())
      items.push({ label: item, cid: null, meta: 'Recent' })
    }
    return items
  }, [hits, history, query])

  const exportCards = useMemo(
    () =>
      compound
        ? buildAnkiCards(
            compound,
            { cardTypes: selectedDirections, details: selectedDetails, customNotes },
            `chemanki-${compound.cid}.png`,
          )
        : [],
    [compound, customNotes, selectedDetails, selectedDirections],
  )

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setDropdownOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setDropdownOpen(true)
      }
      if (event.key === 'Escape') setDropdownOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setHits([])
      setSuggestLoading(false)
      return
    }

    if (skipDebounce.current) {
      skipDebounce.current = false
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setSuggestLoading(true)
      try {
        const response = await fetch(`/api/pubchem?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        const data = (await response.json()) as { results?: CompoundSearchHit[] }
        setHits(data.results ?? [])
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setHits([])
      } finally {
        setSuggestLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query])

  async function loadCompound(options: { cid?: number; q?: string; label?: string }) {
    const id = (requestId.current += 1)
    setLoading(true)
    setError('')
    setDropdownOpen(false)

    try {
      const path = options.cid
        ? `/api/pubchem?cid=${options.cid}`
        : `/api/pubchem?q=${encodeURIComponent(options.q ?? '')}&full=1`
      const response = await fetch(path)
      const data = await response.json()
      if (id !== requestId.current) return

      const next: CompoundData | null = options.cid ? data : data.compound
      if (!response.ok || !next) {
        setCompound(null)
        setError('No matching compound was found. Try a name, SMILES string, or formula.')
        return
      }

      setCompound(next)
      if (data.results) setHits(data.results)
      const historyLabel = options.label ?? next.title
      setHistory((prev) => [historyLabel, ...prev.filter((item) => item.toLowerCase() !== historyLabel.toLowerCase())].slice(0, 8))
    } catch {
      if (id !== requestId.current) return
      setCompound(null)
      setError('PubChem lookup failed. Check your connection and try again.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    void loadCompound({ q: INITIAL_QUERY, label: INITIAL_QUERY })
    // Initial compound hydrate only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(message: string, tone: 'success' | 'error' = 'success') {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 4200)
  }

  function toggleCardType(type: CardType) {
    setSelectedDirections((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    )
  }

  function toggleItem(value: string, list: string[], setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  async function pushCardsToAnki() {
    if (!compound) return
    setExporting('anki')
    setExportError('')
    try {
      const addedCount = await exportToAnkiConnect(
        compound,
        exportCards,
        ankiEndpoint,
        deckName,
        setExportProgress,
      )
      setAnkiStatus('connected')
      setExportOpen(false)
      const skippedCount = exportCards.length - addedCount
      if (addedCount === 0 && skippedCount > 0) {
        showToast(`No new cards were added; all ${skippedCount} selected cards already exist in '${deckName}'.`)
      } else {
        const duplicateMessage = skippedCount > 0 ? ` ${skippedCount} duplicate card${skippedCount === 1 ? '' : 's'} skipped.` : ''
        showToast(`${addedCount} card${addedCount === 1 ? '' : 's'} exported to Anki deck '${deckName}' successfully!${duplicateMessage}`)
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'AnkiConnect export failed. Check your settings and try again.'
      setAnkiStatus('unavailable')
      setExportError(message)
      showToast(message, 'error')
    } finally {
      setExporting(null)
      setExportProgress('')
    }
  }

  async function downloadCardsAsApkg() {
    if (!compound) return
    setExporting('apkg')
    setExportError('')
    try {
      await downloadAnkiPackage(compound, exportCards, deckName, setExportProgress)
      setExportOpen(false)
      showToast(`Downloaded ${exportCards.length} cards in '${deckName}.apkg'. Import the file into Anki.`)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Could not create the Anki package. Try again.'
      setExportError(message)
      showToast(message, 'error')
    } finally {
      setExporting(null)
      setExportProgress('')
    }
  }

  function selectSuggestion(item: { label: string; cid: number | null }) {
    setQuery(item.label)
    void loadCompound(item.cid ? { cid: item.cid, label: item.label } : { q: item.label, label: item.label })
  }

  function submitSearch() {
    const trimmed = query.trim()
    if (!trimmed) return
    if (hits[0]) {
      void loadCompound({ cid: hits[0].cid, label: hits[0].title })
      setQuery(hits[0].title)
      return
    }
    void loadCompound({ q: trimmed, label: trimmed })
  }

  return (
    <div className={dark ? 'dark min-h-screen' : 'min-h-screen'}>
      <main className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/70 bg-background/95">
          <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3 lg:px-8">
            <div className="flex min-w-fit items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
                <FlaskConical />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight">ChemAnki</p>
                <p className="hidden text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Chemistry flashcard builder</p>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitSearch()
                  }
                }}
                className="h-9 bg-muted/50 pl-9 pr-16 text-sm"
                placeholder="Search compounds, SMILES, or formulas"
                aria-label="Search compounds"
                aria-autocomplete="list"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘ K</kbd>
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-11 z-10 rounded-lg border bg-popover p-1.5 shadow-lg">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {suggestLoading ? 'Searching PubChem…' : hits.length ? 'Matches' : 'Search history'}
                  </p>
                  {suggestLoading && (
                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                      <LoaderCircle className="size-3 animate-spin" /> Looking up name, SMILES, then formula
                    </div>
                  )}
                  {!suggestLoading && suggestions.length === 0 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">No matches yet. Try a compound name, SMILES, or formula.</p>
                  )}
                  {suggestions.map((item, index) => (
                    <button
                      key={`${item.label}-${item.cid ?? item.meta}`}
                      onClick={() => selectSuggestion(item)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                    >
                      <Search className="size-3 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {index === 0 && hits[0]?.cid === item.cid && (
                        <Badge className="ml-auto text-[9px]" variant="secondary">Top match</Badge>
                      )}
                      {item.meta !== 'Recent' && (
                        <span className="font-mono text-[10px] text-muted-foreground">{formatFormula(item.meta)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">
                {dark ? <Sun /> : <Moon />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
                <Settings2 />
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-7 lg:grid-cols-[220px_1fr] lg:px-8">
          <aside className="hidden lg:block">
            <div className="sticky top-6 flex flex-col gap-6">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                <nav className="flex flex-col gap-1">
                  <button className="rounded-md bg-muted px-3 py-2 text-left text-sm font-medium">Compound search</button>
                  <button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">
                    Card library <span className="float-right text-xs">0</span>
                  </button>
                  <button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Export history</button>
                </nav>
              </div>
              <Separator />
              <div className="rounded-lg border border-dashed p-3">
                <Upload className="mb-2 size-4 text-muted-foreground" />
                <p className="text-xs font-medium">Import a structure</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Paste a SMILES string or upload a molfile.</p>
                <Button variant="outline" size="sm" className="mt-3 w-full">Browse files</Button>
              </div>
            </div>
          </aside>
          <section className="min-w-0">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Search result</p>
                <h1 className="text-2xl font-semibold tracking-tight">Compound details</h1>
              </div>
              <Badge variant="outline" className="hidden gap-1.5 sm:flex">
                <span className={`size-1.5 rounded-full ${loading ? 'bg-amber-500' : compound ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                {loading ? 'Looking up PubChem' : compound ? 'PubChem live' : 'No compound'}
              </Badge>
            </div>

            {loading && <CompoundSkeleton />}

            {!loading && error && (
              <Card>
                <CardContent className="p-8 text-sm text-muted-foreground">{error}</CardContent>
              </Card>
            )}

            {!loading && compound && (
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{compound.title}</CardTitle>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">CID {compound.cid} · {compound.title}</p>
                    </div>
                    <Badge variant="secondary">{hits.length || 1} result{hits.length === 1 ? '' : 's'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-7 p-5 lg:grid-cols-[minmax(270px,0.75fr)_1.25fr] lg:p-7">
                  <MoleculePreview compound={compound} />
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">IUPAC name</p>
                      <h2 className="text-xl font-semibold tracking-tight">{compound.iupacName}</h2>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {compound.commonNames.length ? (
                          compound.commonNames.map((name) => (
                            <Badge variant="outline" key={name}>{name}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No additional common names listed.</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 border-y py-2 sm:grid-cols-3">
                      <DetailRow label="Formula" value={formatFormula(compound.formula)} />
                      <DetailRow label="Molecular weight" value={formatWeight(compound.molecularWeight)} />
                      <DetailRow label="SMILES" value={compound.smiles || '—'} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setExpanded(expanded === 'uses' ? null : 'uses')}
                        className="flex items-center justify-between py-1 text-left text-sm font-medium"
                      >
                        <span>Uses & descriptions</span>
                        <ChevronDown className={`size-4 transition-transform ${expanded === 'uses' ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded === 'uses' && (
                        <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                          {compound.description || 'No PubChem description is available for this compound.'}
                        </p>
                      )}
                    </div>
                    <Button onClick={() => setExportOpen(true)} className="mt-auto w-full sm:w-fit">
                      <Upload data-icon="inline-start" /> Export to Anki
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cards ready</p>
                  <p className="mt-2 text-2xl font-semibold">{exportCards.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Based on selected card types</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AnkiConnect</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    <span className={`size-2 rounded-full ${ankiStatus === 'connected' ? 'bg-emerald-500' : ankiStatus === 'unavailable' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    {ankiStatus === 'connected' ? 'Connected' : ankiStatus === 'unavailable' ? 'Unavailable' : 'Not checked'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{ankiEndpoint}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target deck</p>
                  <p className="mt-2 text-sm font-semibold">{deckName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Default destination</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        <Dialog
          open={settingsOpen}
          onOpenChange={(open) => {
            if (open) {
              setEndpointDraft(ankiEndpoint)
              setDeckNameDraft(deckName)
            }
            setSettingsOpen(open)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AnkiConnect settings</DialogTitle>
              <DialogDescription>Configure where your generated cards should be sent.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                AnkiConnect endpoint
                <Input value={endpointDraft} onChange={(event) => setEndpointDraft(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Target deck name
                <Input value={deckNameDraft} onChange={(event) => setDeckNameDraft(event.target.value)} />
              </label>
              <Button
                onClick={() => {
                  if (!deckNameDraft.trim()) {
                    showToast('Enter a target deck name before saving settings.', 'error')
                    return
                  }
                  setAnkiEndpoint(endpointDraft.trim())
                  setDeckName(deckNameDraft.trim())
                  setSettingsOpen(false)
                  showToast('Settings saved successfully')
                }}
              >
                Save settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Anki export</DialogTitle>
              <DialogDescription>
                Choose the card types and details to generate for {compound?.title ?? 'this compound'}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-6">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Card types</legend>
                <div className="grid gap-2">
                  {CARD_DIRECTIONS.map(({ type, label }) => (
                    <label key={type} className="flex items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/50">
                      <Checkbox
                        checked={selectedDirections.includes(type)}
                        onCheckedChange={() => toggleCardType(type)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Include in cards</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CARD_DETAILS.map((detail) => (
                    <label key={detail} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                      <Checkbox checked={selectedDetails.includes(detail)} onCheckedChange={() => toggleItem(detail, selectedDetails, setSelectedDetails)} />
                      {detail}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Custom notes
                <Input
                  value={customNotes}
                  onChange={(event) => setCustomNotes(event.target.value)}
                  placeholder="Optional notes for the back of each card"
                  disabled={!selectedDetails.includes('Custom notes')}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {exportCards.length} card{exportCards.length === 1 ? '' : 's'} will be generated in deck “{deckName}”.
              </p>
              {exporting && (
                <div role="status" className="flex items-center gap-2 rounded-md bg-muted/60 p-3 text-sm">
                  <LoaderCircle className="size-4 animate-spin" />
                  {exportProgress || 'Preparing export…'}
                </div>
              )}
              {exportError && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{exportError}</p>}
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
                <Button className="flex-1" disabled={exporting !== null || !compound} onClick={() => void pushCardsToAnki()}>
                  {exporting === 'anki' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                  {exporting === 'anki' ? 'Pushing to Anki…' : 'Direct push to Anki'}
                </Button>
                <Button variant="outline" className="flex-1" disabled={exporting !== null || !compound} onClick={() => void downloadCardsAsApkg()}>
                  {exporting === 'apkg' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
                  {exporting === 'apkg' ? 'Building .apkg…' : 'Download .apkg file'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {toast && (
          <div
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="fixed bottom-5 right-5 z-50 flex max-w-[min(90vw,36rem)] items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg"
          >
            <span className={`size-2 shrink-0 rounded-full ${toast.tone === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            {toast.message}
            <button onClick={() => setToast(null)} aria-label="Dismiss notification">
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
