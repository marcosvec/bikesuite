import { describe, expect, it } from 'vitest'
import { mockCustomers, mockProducts, mockWorkOrders } from '@/lib/demo/mock-data'
import { DEMO_RESET_KEYS } from '@/lib/demo/storage-keys'
import {
  chargeLines,
  columnForStatus,
  matchesWorkOrderQuery,
  quoteWorkOrder,
  reservePart,
  restorePart,
  settleWorkOrder,
  type WOLineItem,
} from '@/lib/demo/work-order-service'
import type { Product } from '@/lib/types/database'

const now = '2026-11-04T12:00:00.000Z'

function pads(quantity: number, extra?: Partial<Product>): Product {
  const product = mockProducts.find(item => item.id === 'prod-006')!
  return {
    ...product,
    ...extra,
    inventory: [
      { ...product.inventory![0], quantity },
      ...(extra?.inventory ?? []),
    ],
  }
}

describe('work order parts', () => {
  it('takes a part from every stock row that has quantity and refuses an oversell', () => {
    const product = pads(2)
    product.inventory = [
      { ...product.inventory![0], quantity: 2 },
      { ...product.inventory![0], id: 'inv-006b', quantity: 3 },
    ]
    const reserved = reservePart([product], 'prod-006', 4, now)
    expect('error' in reserved).toBe(false)
    if ('error' in reserved) return
    expect(reserved.products[0].inventory?.map(row => row.quantity)).toEqual([0, 1])

    const blocked = reservePart(reserved.products, 'prod-006', 2, now)
    expect(blocked).toEqual({ error: 'Only 1 Brake Pad Set - Disc in stock.' })
    expect(reservePart([pads(0)], 'prod-006', 1, now)).toEqual({ error: 'Brake Pad Set - Disc is out of stock.' })
    expect(reservePart([product], 'prod-006', 1.5, now)).toEqual({ error: 'Parts use whole quantities.' })
    expect(reservePart(mockProducts, 'prod-011', 1, now)).toEqual({ error: 'Add services as labor, not parts.' })
  })

  it('puts a removed part back on the first stock row', () => {
    const restored = restorePart([pads(1)], 'prod-006', 2, now)
    expect(restored.warning).toBeUndefined()
    expect(restored.products[0].inventory?.[0].quantity).toBe(3)
    const missing = restorePart(mockProducts.filter(item => item.id !== 'prod-006'), 'prod-006', 1, now)
    expect(missing.warning).toMatch(/no longer stocked/)
    expect(missing.products).toHaveLength(mockProducts.length - 1)
  })
})

describe('work order quotes and receipts', () => {
  const labor: WOLineItem = {
    id: 'labor-1', type: 'labor', product_id: 'prod-011', name: 'Basic Tune-Up', quantity: 1, unit_price: 75, total: 75,
  }
  const part: WOLineItem = {
    id: 'part-1', type: 'part', product_id: 'prod-006', name: 'Brake Pad Set - Disc', quantity: 1, unit_price: 32.99, total: 32.99,
  }

  it('keeps an estimate only for the side that has no lines', () => {
    const quote = quoteWorkOrder({ labor_estimate: 50, parts_estimate: 10 }, [part])
    expect(quote).toMatchObject({ labor: 50, parts: 32.99, usingLaborEstimate: true, usingPartsEstimate: false })
    expect(quote.total).toBe(89.63)
    expect(chargeLines({ labor_estimate: 50, parts_estimate: 10 }, [part]).map(line => line.name)).toEqual([
      'Brake Pad Set - Disc',
      'Labor estimate',
    ])
    expect(chargeLines({ labor_estimate: 0, parts_estimate: 0 }, []).map(line => line.name)).toEqual(['No charge'])
  })

  it('records a sale, a receipt, and the customer visit without charging a walk-in account', () => {
    const order = { ...mockWorkOrders[0], customer_id: null, labor_estimate: 50, parts_estimate: 0 }
    const settled = settleWorkOrder({
      order,
      items: [],
      method: 'cash',
      customers: mockCustomers,
      now: new Date(now),
      ids: { transactionId: 'trans-test', receiptId: 'rcpt-test', transactionNumber: 'TXN-TEST' },
    })
    expect(settled.order).toMatchObject({ status: 'completed', actual_labor: 50, actual_parts: 0, completed_at: now })
    expect(settled.transaction).toMatchObject({
      id: 'trans-test',
      transaction_number: 'TXN-TEST',
      customer_id: null,
      total: 54,
      tax_amount: 4,
      status: 'completed',
      notes: `Service receipt for ${order.work_order_number}`,
    })
    expect(settled.receipt).toMatchObject({ method: 'cash', customerName: 'Walk-in', total: 54 })
    expect(settled.customers[0].total_spent).toBe(mockCustomers[0].total_spent)
    expect(settled.customers[0].visit_count).toBe(mockCustomers[0].visit_count)
  })

  it('adds the receipt total to the saved customer', () => {
    const order = { ...mockWorkOrders[0], labor_estimate: 50, parts_estimate: 0 }
    const settled = settleWorkOrder({
      order,
      items: [labor],
      method: 'card',
      customers: mockCustomers,
      now: new Date(now),
      ids: { transactionId: 'trans-2', receiptId: 'rcpt-2', transactionNumber: 'TXN-2' },
    })
    expect(settled.order.actual_labor).toBe(75)
    expect(settled.order.actual_parts).toBe(0)
    expect(settled.customers[0]).toMatchObject({
      total_spent: 3249.97 + 81,
      visit_count: 13,
      last_visit: now,
    })
    expect(settled.receipt.lines.map(line => line.name)).toEqual(['Basic Tune-Up'])
  })

  it('matches the customer, the diagnosis, and the work order number', () => {
    expect(matchesWorkOrderQuery(mockWorkOrders[0], mockCustomers, 'pedalini')).toBe(true)
    expect(matchesWorkOrderQuery(mockWorkOrders[0], mockCustomers, 'worn')).toBe(true)
    expect(matchesWorkOrderQuery(mockWorkOrders[0], mockCustomers, 'WO-2026-002')).toBe(false)
    expect(columnForStatus('diagnosed')).toBe('in_progress')
    expect(columnForStatus('picked_up')).toBe('finished')
    expect(columnForStatus('unknown')).toBe('in_progress')
  })
})

it('clears demo receipts along with the other browser stores', () => {
  expect(DEMO_RESET_KEYS).toEqual([
    'bikesuite_products',
    'bikesuite_customers',
    'bikesuite_work_orders',
    'bikesuite_work_order_items',
    'bikesuite_transactions',
    'bikesuite_receipts',
    'bikesuite_settings',
    'bikesuite_navigation_preferences',
    'bikesuite_reference_catalog',
  ])
})
