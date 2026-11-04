'use client'

import { useEffect, useState } from 'react'
import { Database, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { parseSnapshot, readCatalog, mergeCatalog, type CatalogProduct, type Snapshot } from '@/lib/catalog'
const KEY = 'bikesuite_reference_catalog'
const sources = [
  { id: 'giant', name: 'Giant', available: true, note: 'US bicycle families' },
  { id: 'trek', name: 'Trek', available: true, note: 'US bicycle models and framesets' },
  { id: 'fuji', name: 'Fuji', available: false, note: 'Catalog unavailable: source could not be reached.' },
  { id: 'se', name: 'SE Bikes', available: false, note: 'Catalog unavailable: source rate limited requests.' },
  { id: 'cannondale', name: 'Cannondale', available: false, note: 'Collector not connected yet.' },
  { id: 'jbi', name: 'J&B Importers', available: false, note: 'Distributor catalog not connected yet.' },
]

export function CatalogImport() {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [productType, setProductType] = useState('all')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [saved, setSaved] = useState<CatalogProduct[]>([])
  const [viewSaved, setViewSaved] = useState(false)
  useEffect(() => {
    try {
      setSaved(readCatalog(localStorage.getItem(KEY)))
    } catch { setError('Saved catalog could not be read. Import a snapshot to try again.') }
  }, [])
  useEffect(() => {
    setSnapshot(null); setError(''); setNotice(''); setProductType('all'); setCategory('all'); setQuery(''); setPage(0)
    if (!source || !open || viewSaved) return
    const controller = new AbortController()
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/catalogs/${source}.json`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('This catalog snapshot is not available yet.')
        const data = parseSnapshot(await response.json(), source)
        if (!controller.signal.aborted) setSnapshot(data)
      })
      .catch(error => { if (error.name !== 'AbortError') setError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [source, open, viewSaved])
  const products = viewSaved ? saved : snapshot?.products || []
  const types = [...new Set(products.map(p => p.productType))].sort()
  const categories = [...new Set(products.filter(p => productType === 'all' || p.productType === productType).map(p => p.category))].sort()
  const selected = products.filter(p => (productType === 'all' || p.productType === productType) && (category === 'all' || p.category === category))
  const visible = selected.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
  function importCatalog() {
    try {
      const result = mergeCatalog(readCatalog(localStorage.getItem(KEY)), selected)
      localStorage.setItem(KEY, JSON.stringify(result.products))
      setSaved(result.products); setNotice(`Imported ${result.added} new records; updated ${result.updated}.`); setError('')
    } catch (error) { setError(error instanceof Error && error.message.startsWith('Saved catalog') ? error.message : 'Browser storage is full or unavailable. No import was saved.') }
  }
  return <>
    <Button variant="outline" onClick={() => { setSource(''); setViewSaved(false); setOpen(true) }}><Database className="mr-2 size-4" />Grab database</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{viewSaved ? 'Imported catalog' : source ? sources.find(s => s.id === source)?.name : 'Grab database'}</DialogTitle>
          <DialogDescription>Import product references by manufacturer and category. Catalog imports do not add stock or set shop selling prices.</DialogDescription>
        </DialogHeader>
        {!source && !viewSaved ? <div className="space-y-4 overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sources.map(s => <Button key={s.id} variant="outline" disabled={!s.available} className="h-auto min-h-24 flex-col items-start whitespace-normal p-4 text-left" onClick={() => setSource(s.id)}><span className="font-semibold">{s.name}</span><span className="mt-1 text-xs font-normal text-muted-foreground">{s.note}</span></Button>)}</div>
          <Button variant="secondary" disabled={!saved.length} onClick={() => setViewSaved(true)}>View imported catalog ({saved.length})</Button>
        </div> : <>
          <Button variant="ghost" className="self-start" onClick={() => { setSource(''); setViewSaved(false); setLoading(false) }}><ArrowLeft className="mr-2 size-4" />Manufacturers</Button>
          {loading && !viewSaved && <p role="status">Loading catalog…</p>}
          {snapshot && !viewSaved && <div className="text-sm text-muted-foreground"><p>{snapshot.coverage.scope}</p><p className="mt-1">Snapshot: {new Date(snapshot.collectedAt).toLocaleDateString()} · {snapshot.products.length} records. Unknown years and prices remain blank.</p></div>}
          {(snapshot || viewSaved) && <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label htmlFor="catalog-type">Product type</Label><select id="catalog-type" className="h-10 w-full rounded-md border bg-background px-3" value={productType} onChange={e => { setProductType(e.target.value); setCategory('all'); setPage(0) }}><option value="all">All product types</option>{types.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="space-y-1"><Label htmlFor="catalog-category">Category</Label><select id="catalog-category" className="h-10 w-full rounded-md border bg-background px-3" value={category} onChange={e => { setCategory(e.target.value); setPage(0) }}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="space-y-1"><Label htmlFor="catalog-search">Search preview</Label><Input id="catalog-search" value={query} onChange={e => { setQuery(e.target.value); setPage(0) }} placeholder="Model name" /></div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-card"><tr><th className="p-3">Model / family</th><th className="p-3">Category</th><th className="p-3">Year</th><th className="p-3">Listed price</th><th className="p-3">Source</th></tr></thead><tbody>{visible.slice(page * 50, (page + 1) * 50).map(p => <tr key={p.id} className="border-t"><td className="p-3">{p.name}{p.recordType === 'family' && <span className="block text-xs text-muted-foreground">Model family</span>}</td><td className="p-3">{p.category}</td><td className="p-3">{p.year ?? '—'}</td><td className="whitespace-nowrap p-3">{p.price === null ? '—' : `${p.recordType === 'family' ? 'From ' : ''}${new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency }).format(p.price)}`}</td><td className="p-3"><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Source for ${p.name}`}><ExternalLink className="size-4" /></a></td></tr>)}</tbody></table>
              {!visible.length && <p className="p-4 text-muted-foreground">No matching records.</p>}
            </div>
            <p className="text-xs text-muted-foreground">Previewing {visible.length ? page * 50 + 1 : 0}–{Math.min(visible.length, (page + 1) * 50)} of {visible.length} matches. Import includes all {selected.length} records in the selected categories, regardless of preview search.</p>
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous page</Button>
              <span className="text-sm">Page {page + 1} of {Math.max(1, Math.ceil(visible.length / 50))}</span>
              <Button variant="outline" disabled={(page + 1) * 50 >= visible.length} onClick={() => setPage(p => p + 1)}>Next page</Button>
            </div>
            {!viewSaved && <Button disabled={!selected.length} onClick={importCatalog}>Import {selected.length} records</Button>}
          </>}
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </DialogContent>
    </Dialog>
  </>
}
