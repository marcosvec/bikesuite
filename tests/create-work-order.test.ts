import { beforeEach, describe, expect, it } from 'vitest'
import { createWorkOrder } from '@/lib/demo/create-work-order'

const now = new Date('2026-11-04T15:04:05.000Z')

beforeEach(() => localStorage.clear())

describe('createWorkOrder', () => {
  it('stores a walk-in intake and keeps the bike description with the notes', () => {
    const order = createWorkOrder({
      customerId: 'walk-in',
      bikeDescription: 'Blue Trek FX',
      intakeNotes: 'Flat rear tire',
      priority: 'normal',
    }, now)
    expect(order.customer_id).toBeNull()
    expect(order.status).toBe('intake')
    expect(order.intake_notes).toBe('Blue Trek FX — Flat rear tire')
    expect(order.work_order_number).toBe(`WO-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`)
    expect(order.labor_estimate).toBe(0)
    expect(order.parts_estimate).toBe(0)
  })

  it('keeps a selected customer, estimates, and immediate-work status', () => {
    localStorage.setItem('bikesuite_settings', JSON.stringify({ assumeImmediateWork: true }))
    const order = createWorkOrder({
      customerId: 'cust-001',
      bikeDescription: 'Red Giant',
      intakeNotes: '',
      priority: 'rush',
      laborEstimate: '40',
      partsEstimate: '12.50',
    }, now)
    expect(order.customer_id).toBe('cust-001')
    expect(order.status).toBe('in_progress')
    expect(order.priority).toBe('rush')
    expect(order.intake_notes).toBe('Red Giant')
    expect(order.labor_estimate).toBe(40)
    expect(order.parts_estimate).toBe(12.5)
  })

  it('rejects a blank bike and ignores unreadable shop settings', () => {
    localStorage.setItem('bikesuite_settings', '{')
    expect(() => createWorkOrder({
      customerId: '',
      bikeDescription: '   ',
      intakeNotes: 'Ignored',
      priority: 'low',
    }, now)).toThrow(/bike description/i)
  })
})
