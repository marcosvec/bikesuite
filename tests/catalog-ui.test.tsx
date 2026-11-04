import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CatalogImport } from '@/components/catalog-import'
import trek from '@/public/catalogs/trek.json'
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => trek })) })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function openTrek() {
  render(<CatalogImport />)
  fireEvent.click(screen.getByRole('button', { name: 'Grab database' }))
  fireEvent.click(screen.getByRole('button', { name: /Trek.*US/ }))
  await screen.findByRole('button', { name: 'Import 225 records' })
}
it('imports the whole catalog without creating stock and can reimport without duplication', async () => {
  localStorage.setItem('bikesuite_products', '[{"id":"unchanged"}]')
  await openTrek()
  fireEvent.click(screen.getByRole('button', { name: 'Import 225 records' }))
  expect(screen.getByText('Imported 225 new records; updated 0.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Import 225 records' }))
  expect(screen.getByText('Imported 0 new records; updated 225.')).toBeTruthy()
  expect(JSON.parse(localStorage.getItem('bikesuite_reference_catalog')!)).toHaveLength(225)
  expect(localStorage.getItem('bikesuite_products')).toBe('[{"id":"unchanged"}]')
})
it('paginates the preview and imports only the chosen category', async () => {
  await openTrek()
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(screen.getByText('Page 2 of 5')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Mountain Bikes' } })
  const count = trek.products.filter(p => p.category === 'Mountain Bikes').length
  fireEvent.click(screen.getByRole('button', { name: `Import ${count} records` }))
  const saved = JSON.parse(localStorage.getItem('bikesuite_reference_catalog')!)
  expect(saved).toHaveLength(count); expect(saved.every((p: { category: string }) => p.category === 'Mountain Bikes')).toBe(true)
})
it('keeps a corrupt saved catalog visible instead of offering a silent overwrite', async () => {
  localStorage.setItem('bikesuite_reference_catalog', '{}')
  render(<CatalogImport />)
  fireEvent.click(screen.getByRole('button', { name: 'Grab database' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(/Saved catalog is invalid/)
})
it('shows a fetch failure without an import button', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<CatalogImport />); fireEvent.click(screen.getByRole('button', { name: 'Grab database' }))
  fireEvent.click(screen.getByRole('button', { name: /Trek.*US/ }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This catalog snapshot is not available yet.')
  expect(screen.queryByRole('button', { name: /Import \d/ })).toBeNull()
})
it('does not claim success if storage rejects the import', async () => {
  await openTrek()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  fireEvent.click(screen.getByRole('button', { name: 'Import 225 records' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No import was saved'))
  expect(screen.queryByText('Imported 225 new records; updated 0.')).toBeNull()
})
