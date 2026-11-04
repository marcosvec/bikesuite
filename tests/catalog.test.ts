import { describe, expect, it } from 'vitest'
import { isCatalogProduct, parseSnapshot, readCatalog, mergeCatalog } from '@/lib/catalog'
import trek from '@/public/catalogs/trek.json'
import giant from '@/public/catalogs/giant.json'
const snapshot = () => parseSnapshot(structuredClone(trek), 'trek')
describe('catalog integrity and import', () => {
  it('accepts collected snapshots and checks every reference', () => {
    expect(snapshot().products).toHaveLength(225)
    expect(parseSnapshot(giant, 'giant').products).toHaveLength(67)
    expect(trek.coverage.paginationComplete).toBe(true)
    expect(giant.coverage.paginationComplete).toBe(false)
  })
  it('imports an entire source and updates without duplicates', () => {
    const products = snapshot().products
    const first = mergeCatalog([], products)
    expect(first.added).toBe(225)
    const second = mergeCatalog(first.products, products.map(p => ({ ...p, price: 123 })))
    expect(second.added).toBe(0); expect(second.updated).toBe(225)
    expect(second.products).toHaveLength(225); expect(second.products[0].price).toBe(123)
  })
  it('preserves other manufacturers and unselected categories', () => {
    const original = snapshot().products
    const other = parseSnapshot(giant, 'giant').products
    const selected = original.filter(p => p.category === 'Mountain Bikes')
    const result = mergeCatalog([...original, ...other], selected)
    expect(result.products).toHaveLength(292); expect(result.updated).toBe(selected.length)
  })
  it('rejects invalid URLs, currency, prices, dates, and missing data', () => {
    const p = snapshot().products[0]
    for (const patch of [{ sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://evil.example/' }, { currency: 'bad' }, { price: -1 }, { price: NaN }, { collectedAt: 'bad' }, { year: 2 }, { name: null }, { specifications: [] }]) {
      expect(isCatalogProduct({ ...p, ...patch })).toBe(false)
    }
    expect(isCatalogProduct({ ...p, year: null, price: null })).toBe(true)
  })
  it('rejects duplicates and wrong-manufacturer snapshots', () => {
    const s = snapshot(); s.products.push(s.products[0])
    expect(() => parseSnapshot(s, 'trek')).toThrow('duplicate')
    expect(() => parseSnapshot(trek, 'giant')).toThrow('invalid records')
  })
  it('rejects malformed saved data instead of overwriting it', () => {
    expect(readCatalog(null)).toEqual([])
    expect(() => readCatalog('{}')).toThrow()
    expect(() => readCatalog('[{}]')).toThrow()
    expect(() => readCatalog('not json')).toThrow()
  })
})
