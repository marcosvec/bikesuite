import { describe, expect, it, vi } from 'vitest'
import { mockBikes, mockCustomers, mockTransactions, mockWorkOrders } from '@/lib/demo/mock-data'
import { clearDemoData, resetDemoData } from '@/lib/demo/reset-demo'
import { searchShop } from '@/lib/demo/global-search'
import {
  DEFAULT_TAX_RATE,
  parseTaxPercent,
  roundMoney,
  saleTax,
  taxRateFromSettings,
} from '@/lib/demo/shop-settings'
import { quoteWorkOrder, reservePart, restorePart, settleWorkOrder } from '@/lib/demo/work-order-service'
import { mockProducts } from '@/lib/demo/mock-data'

const now = '2026-11-04T18:00:00.000Z'
const shop = {
  customers: mockCustomers,
  bikes: mockBikes,
  workOrders: mockWorkOrders,
  transactions: mockTransactions,
}

describe('one shop tax rate', () => {
  it('keeps the seeded sales on the default 8 percent rate', () => {
    for (const sale of mockTransactions) {
      const tax = saleTax(sale.subtotal, DEFAULT_TAX_RATE)
      expect(sale.tax_rate).toBe(DEFAULT_TAX_RATE)
      expect(sale.tax_amount).toBe(tax)
      expect(sale.total).toBe(roundMoney(sale.subtotal - sale.discount_amount + tax))
    }
  })

  it('reads the Settings percent and ignores a rate outside 0 to 100', () => {
    expect(parseTaxPercent('10')).toBe(10)
    expect(parseTaxPercent('101')).toBeNull()
    expect(parseTaxPercent('-1')).toBeNull()
    expect(taxRateFromSettings(JSON.stringify({ taxRate: '10' }))).toBe(0.1)
    expect(taxRateFromSettings(JSON.stringify({ taxRate: 'nope' }))).toBe(DEFAULT_TAX_RATE)
    expect(taxRateFromSettings(null)).toBe(DEFAULT_TAX_RATE)
  })

  it('uses that rate for a new work-order total', () => {
    const quote = quoteWorkOrder({ labor_estimate: 50, parts_estimate: 0 }, [], 0.1)
    expect(quote).toMatchObject({ subtotal: 50, tax: 5, total: 55 })
  })
})

describe('stock in and out, then payment', () => {
  it('takes a part off the shelf and puts the same quantity back', () => {
    const pads = mockProducts.find(product => product.id === 'prod-006')!
    const reserved = reservePart([pads], 'prod-006', 2, now)
    expect('error' in reserved).toBe(false)
    if ('error' in reserved) return
    expect(reserved.products[0].inventory?.[0].quantity).toBe(6)
    expect(reservePart(reserved.products, 'prod-006', 7, now)).toEqual({ error: 'Only 6 Brake Pad Set - Disc in stock.' })
    const restored = restorePart(reserved.products, 'prod-006', 2, now)
    expect(restored.products[0].inventory?.[0].quantity).toBe(8)
  })

  it('records the payment at the shop rate and adds it to the customer', () => {
    const order = { ...mockWorkOrders[0], labor_estimate: 50, parts_estimate: 0 }
    const settled = settleWorkOrder({
      order,
      items: [],
      method: 'card',
      customers: mockCustomers,
      taxRate: 0.1,
      now: new Date(now),
      ids: { transactionId: 'trans-tax', receiptId: 'rcpt-tax', transactionNumber: 'TXN-TAX' },
    })
    expect(settled.transaction).toMatchObject({ tax_rate: 0.1, tax_amount: 5, total: 55, status: 'completed' })
    expect(settled.receipt.total).toBe(55)
    expect(settled.order.status).toBe('completed')
    expect(settled.customers[0]).toMatchObject({ total_spent: roundMoney(3249.97 + 55), visit_count: 13 })
  })
})

describe('shop search and reset', () => {
  it('finds a customer, a bike, a work order, and a sale', () => {
    expect(searchShop('pedalini', shop).map(hit => hit.kind)).toEqual(['customer', 'bike', 'work-order', 'sale'])
    expect(searchShop('WTU2019FX3', shop).map(hit => hit.kind)).toEqual(['bike'])
    expect(searchShop('TXN-2026-002', shop)[0]).toMatchObject({ kind: 'sale', href: '/?sale=trans-002' })
    expect(searchShop('   ', shop)).toEqual([])
  })

  it('clears the browser shop, including bikes and the tax setting', () => {
    localStorage.setItem('bikesuite_bikes', '[]')
    localStorage.setItem('bikesuite_settings', JSON.stringify({ taxRate: '10' }))
    localStorage.setItem('bikesuite_transactions', '[]')
    sessionStorage.setItem('bikesuite_workspace_unlocked', '1')
    clearDemoData()
    expect(localStorage.getItem('bikesuite_bikes')).toBeNull()
    expect(localStorage.getItem('bikesuite_settings')).toBeNull()
    expect(localStorage.getItem('bikesuite_transactions')).toBeNull()
    expect(sessionStorage.getItem('bikesuite_workspace_unlocked')).toBeNull()
    localStorage.setItem('bikesuite_settings', JSON.stringify({ taxRate: '10' }))
    const reload = vi.fn()
    resetDemoData(reload)
    expect(localStorage.getItem('bikesuite_settings')).toBeNull()
    expect(reload).toHaveBeenCalledOnce()
  })
})
