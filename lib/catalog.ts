export type CatalogProduct = {
  id: string; manufacturer: string; name: string; productType: string; category: string
  year: number | null; price: number | null; currency: string; sourceUrl: string
  collectedAt: string; recordType: 'model' | 'family'; priceKind: string; specifications: Record<string, string>
}
export type Snapshot = { collectedAt: string; coverage: { scope: string; paginationComplete: boolean }; products: CatalogProduct[] }
const hosts: Record<string, string> = { trek: 'www.trekbikes.com', giant: 'www.giant-bicycles.com', cannondale: 'www.cannondale.com', fuji: 'www.fujibikes.com', se: 'www.sebikes.com', jbi: 'www.jbi.bike' }
export function isCatalogProduct(value: unknown): value is CatalogProduct {
  if (!value || typeof value !== 'object') return false
  const p = value as CatalogProduct
  if (![p.id, p.manufacturer, p.name, p.productType, p.category, p.priceKind].every(v => typeof v === 'string' && v.trim().length > 0)) return false
  if (!p.id.startsWith(p.manufacturer + ':') || !hosts[p.manufacturer]) return false
  if (p.year !== null && (!Number.isInteger(p.year) || p.year < 1900 || p.year > 2100)) return false
  if (p.price !== null && (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0)) return false
  if (p.currency !== 'USD' || !['model', 'family'].includes(p.recordType)) return false
  if (typeof p.collectedAt !== 'string' || !Number.isFinite(Date.parse(p.collectedAt))) return false
  if (!p.specifications || typeof p.specifications !== 'object' || Array.isArray(p.specifications) || !Object.values(p.specifications).every(v => typeof v === 'string')) return false
  try {
    const url = new URL(p.sourceUrl)
    return url.protocol === 'https:' && url.hostname === hosts[p.manufacturer] && !url.username && !url.password
  } catch { return false }
}
export function parseSnapshot(value: unknown, manufacturer: string): Snapshot {
  if (!value || typeof value !== 'object') throw new Error('Catalog format is invalid.')
  const s = value as Snapshot
  if (typeof s.collectedAt !== 'string' || !Number.isFinite(Date.parse(s.collectedAt)) || typeof s.coverage?.scope !== 'string' || typeof s.coverage?.paginationComplete !== 'boolean' || !Array.isArray(s.products)) throw new Error('Catalog format is invalid.')
  if (!s.products.every(p => isCatalogProduct(p) && p.manufacturer === manufacturer)) throw new Error('Catalog contains invalid records.')
  if (new Set(s.products.map(p => p.id)).size !== s.products.length) throw new Error('Catalog contains duplicate source IDs.')
  return s
}
export function readCatalog(raw: string | null): CatalogProduct[] {
  const value: unknown = JSON.parse(raw || '[]')
  if (!Array.isArray(value) || !value.every(isCatalogProduct)) throw new Error('Saved catalog is invalid. Reset demo data before importing again.')
  return value
}
export function mergeCatalog(saved: CatalogProduct[], selected: CatalogProduct[]) {
  const merged = new Map(saved.map(p => [p.id, p]))
  let added = 0
  for (const p of selected) { if (!merged.has(p.id)) added++; merged.set(p.id, p) }
  return { products: [...merged.values()], added, updated: selected.length - added }
}
