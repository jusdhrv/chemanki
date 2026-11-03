'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, FlaskConical, Moon, Search, Settings2, Sun, Upload, X } from 'lucide-react'

const compound = {
  name: 'Methyl 2-hydroxybenzoate',
  common: ['Methyl salicylate', 'Oil of wintergreen', 'Salicylate ester'],
  smiles: 'COC(=O)c1ccccc1O',
  formula: 'C₈H₈O₃',
  weight: '152.15 g/mol',
  melting: '-9 °C',
  boiling: '223 °C',
  solubility: 'Slightly soluble in water',
}

const searchHistory = ['methyl salicylate', 'aspirin', 'benzene']
const directions = [
  'Bond-line Diagram → Compound Name(s)',
  'Compound Name(s) → Bond-line Diagram',
  'Common Name → IUPAC Name & Properties',
  'IUPAC Name → Common Name & Formula',
]

function MoleculePreview() {
  return (
    <div className="relative flex min-h-60 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/40">
      <div className="absolute left-4 top-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="size-2 rounded-full bg-emerald-500" /> 2D Structure
      </div>
      <svg viewBox="0 0 280 180" className="w-full max-w-[310px] text-foreground" aria-label="Methyl salicylate bond-line diagram" role="img">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6">
          <path d="M72 52 119 25l47 27v54l-47 27-47-27Z" />
          <path d="m84 59 35-20 35 20v40l-35 20-35-20Z" opacity=".45" />
          <path d="m166 52 30-17M166 106l30 17M196 35l28 16M196 123l28-16" />
          <path d="m224 51 26-15M224 107l26 15" />
          <path d="M72 52 47 37M47 37 28 48M72 106 47 121" />
        </g>
        <text x="23" y="45" fill="currentColor" fontSize="15" fontWeight="600">OH</text>
        <text x="188" y="29" fill="currentColor" fontSize="15" fontWeight="600">O</text>
        <text x="247" y="34" fill="currentColor" fontSize="15" fontWeight="600">CH₃</text>
        <text x="188" y="148" fill="currentColor" fontSize="15" fontWeight="600">O</text>
      </svg>
      <span className="absolute bottom-3 right-3 rounded bg-background/80 px-2 py-1 font-mono text-[10px] text-muted-foreground">C₈H₈O₃</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-0"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right font-mono text-xs font-medium">{value}</span></div>
}

export default function Page() {
  const [dark, setDark] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [query, setQuery] = useState('methyl salicylate')
  const [expanded, setExpanded] = useState<'physical' | 'uses' | null>('physical')
  const [toast, setToast] = useState('')
  const [selectedDirections, setSelectedDirections] = useState([0, 2])
  const [selectedDetails, setSelectedDetails] = useState(['Formula', 'Molecular weight', 'Physical properties'])
  const suggestions = useMemo(() => query ? [query, ...searchHistory.filter((item) => item.includes(query.toLowerCase()) && item !== query)] : searchHistory, [query])

  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(''), 3200) }
  function toggleItem(value: string, list: string[], setter: (next: string[]) => void) { setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]) }

  return (
    <div className={dark ? 'dark min-h-screen' : 'min-h-screen'}>
      <main className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/70 bg-background/95">
          <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3 lg:px-8">
            <div className="flex min-w-fit items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background"><FlaskConical /></div><div><p className="text-sm font-bold tracking-tight">ChemAnki</p><p className="hidden text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Chemistry flashcard builder</p></div></div>
            <div className="relative mx-auto w-full max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 bg-muted/50 pl-9 pr-16 text-sm" placeholder="Search compounds, SMILES, or formulas" /><kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘ K</kbd>{query && <div className="absolute left-0 right-0 top-11 z-10 rounded-lg border bg-popover p-1.5 shadow-lg"><p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Search history</p>{suggestions.map((item, i) => <button key={item} onClick={() => setQuery(item)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"><Search className="size-3 text-muted-foreground" />{item}{i === 0 && <Badge className="ml-auto text-[9px]" variant="secondary">Current</Badge>}</button>)}</div>}</div>
            <div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</Button><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings2 /></Button></div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-7 lg:grid-cols-[220px_1fr] lg:px-8">
          <aside className="hidden lg:block"><div className="sticky top-6 flex flex-col gap-6"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p><nav className="flex flex-col gap-1"><button className="rounded-md bg-muted px-3 py-2 text-left text-sm font-medium">Compound search</button><button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Card library <span className="float-right text-xs">0</span></button><button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Export history</button></nav></div><Separator /><div className="rounded-lg border border-dashed p-3"><Upload className="mb-2 size-4 text-muted-foreground" /><p className="text-xs font-medium">Import a structure</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Paste a SMILES string or upload a molfile.</p><Button variant="outline" size="sm" className="mt-3 w-full">Browse files</Button></div></div></aside>
          <section className="min-w-0"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="mb-1 text-xs font-medium text-muted-foreground">Search result</p><h1 className="text-2xl font-semibold tracking-tight">Compound details</h1></div><Badge variant="outline" className="hidden gap-1.5 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" /> Mock data mode</Badge></div>
            <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20 pb-4"><div className="flex items-center justify-between"><div><CardTitle className="text-base">{compound.name}</CardTitle><p className="mt-1 font-mono text-xs text-muted-foreground">CAS 119-36-8 · methyl salicylate</p></div><Badge variant="secondary">1 result</Badge></div></CardHeader><CardContent className="grid gap-7 p-5 lg:grid-cols-[minmax(270px,0.75fr)_1.25fr] lg:p-7"><MoleculePreview /><div className="flex flex-col gap-5"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">IUPAC name</p><h2 className="text-xl font-semibold tracking-tight">{compound.name}</h2><div className="mt-3 flex flex-wrap gap-1.5">{compound.common.map((name) => <Badge variant="outline" key={name}>{name}</Badge>)}</div></div><div className="grid grid-cols-2 gap-x-8 gap-y-1 border-y py-2 sm:grid-cols-3"><DetailRow label="Formula" value={compound.formula} /><DetailRow label="Molecular weight" value={compound.weight} /><DetailRow label="SMILES" value={compound.smiles} /></div><div className="flex flex-col gap-2"><button onClick={() => setExpanded(expanded === 'physical' ? null : 'physical')} className="flex items-center justify-between py-1 text-left text-sm font-medium"><span>Physical properties</span><ChevronDown className={`size-4 transition-transform ${expanded === 'physical' ? 'rotate-180' : ''}`} /></button>{expanded === 'physical' && <div className="grid grid-cols-1 gap-x-8 gap-y-1 rounded-md bg-muted/50 px-3 sm:grid-cols-3"><DetailRow label="Melting point" value={compound.melting} /><DetailRow label="Boiling point" value={compound.boiling} /><DetailRow label="Solubility" value={compound.solubility} /></div>}<button onClick={() => setExpanded(expanded === 'uses' ? null : 'uses')} className="flex items-center justify-between border-t py-3 text-left text-sm font-medium"><span>Uses & descriptions</span><ChevronDown className={`size-4 transition-transform ${expanded === 'uses' ? 'rotate-180' : ''}`} /></button>{expanded === 'uses' && <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">A colorless to pale yellow liquid with a characteristic wintergreen odor. Used as a flavoring agent, fragrance ingredient, and topical analgesic.</p>}</div><Button onClick={() => setExportOpen(true)} className="mt-auto w-full sm:w-fit"><Upload data-icon="inline-start" /> Export to Anki</Button></div></CardContent></Card>
            <div className="mt-5 grid gap-4 md:grid-cols-3"><Card><CardContent className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cards ready</p><p className="mt-2 text-2xl font-semibold">0</p><p className="mt-1 text-xs text-muted-foreground">Configure an export to begin</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AnkiConnect</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-amber-500" /> Not connected</p><p className="mt-1 text-xs text-muted-foreground">localhost:8765</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target deck</p><p className="mt-2 text-sm font-semibold">Organic Chemistry</p><p className="mt-1 text-xs text-muted-foreground">Default destination</p></CardContent></Card></div>
          </section>
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>AnkiConnect settings</DialogTitle><DialogDescription>Configure where your generated cards should be sent.</DialogDescription></DialogHeader><div className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-medium">AnkiConnect endpoint<Input defaultValue="http://localhost:8765" /></label><label className="flex flex-col gap-2 text-sm font-medium">Target deck name<Input defaultValue="Organic Chemistry" /></label><Button onClick={() => { setSettingsOpen(false); showToast('Settings saved successfully') }}>Save settings</Button></div></DialogContent></Dialog>
        <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Configure Anki export</DialogTitle><DialogDescription>Choose the card directions and details to generate for methyl salicylate.</DialogDescription></DialogHeader><div className="flex flex-col gap-6"><fieldset><legend className="mb-3 text-sm font-semibold">Card directions</legend><div className="grid gap-2">{directions.map((direction, index) => <label key={direction} className="flex items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"><Checkbox checked={selectedDirections.includes(index)} onCheckedChange={() => setSelectedDirections(selectedDirections.includes(index) ? selectedDirections.filter((item) => item !== index) : [...selectedDirections, index])} /><span>{direction}</span></label>)}</div></fieldset><fieldset><legend className="mb-3 text-sm font-semibold">Include in cards</legend><div className="grid gap-2 sm:grid-cols-2">{['Formula', 'Molecular weight', 'Physical properties', 'Custom notes'].map((detail) => <label key={detail} className="flex items-center gap-3 rounded-md border p-3 text-sm"><Checkbox checked={selectedDetails.includes(detail)} onCheckedChange={() => toggleItem(detail, selectedDetails, setSelectedDetails)} />{detail}</label>)}</div></fieldset><label className="flex flex-col gap-2 text-sm font-medium">Custom notes <Input placeholder="Optional notes for the back of each card" /></label><div className="flex flex-col gap-2 border-t pt-4 sm:flex-row"><Button className="flex-1" onClick={() => { setExportOpen(false); showToast('Cards pushed to AnkiConnect') }}><Upload data-icon="inline-start" /> Direct push to Anki</Button><Button variant="outline" className="flex-1" onClick={() => { setExportOpen(false); showToast('.apkg download prepared') }}>Download .apkg file</Button></div></div></DialogContent></Dialog>
        {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg"><span className="size-2 rounded-full bg-emerald-500" />{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X className="size-4 text-muted-foreground" /></button></div>}
      </main>
    </div>
  )
}
