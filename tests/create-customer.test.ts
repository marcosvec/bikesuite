import { describe, expect, it } from 'vitest'
import { createCustomer } from '@/lib/demo/create-customer'
import type { Customer } from '@/lib/types/database'

const now = new Date('2026-11-04T15:04:05.000Z')

describe('createCustomer', () => {
  it('builds the same customer record the Customers page stores', () => {
    const customer = createCustomer({
      firstName: '  Rae ',
      lastName: ' Dropoff ',
      phone: ' 555-0100 ',
      email: ' ',
    }, now)
    expect(customer).toEqual({
      id: `cust-${now.getTime()}`,
      organization_id: 'demo-org',
      first_name: 'Rae',
      last_name: 'Dropoff',
      email: null,
      phone: '555-0100',
      address: null,
      city: null,
      state: null,
      zip: null,
      notes: null,
      total_spent: 0,
      visit_count: 0,
      last_visit: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
  })

  it('keeps an existing customer id and history when editing', () => {
    const existing = {
      id: 'cust-001',
      organization_id: 'demo-org',
      first_name: 'Marco',
      last_name: 'Pedalini',
      email: 'marco.p@example.com',
      phone: '(555) 123-4567',
      address: null,
      city: null,
      state: null,
      zip: null,
      notes: null,
      total_spent: 40,
      visit_count: 2,
      last_visit: '2026-02-18T14:30:00.000Z',
      created_at: '2025-03-10T10:00:00.000Z',
      updated_at: '2026-02-18T14:30:00.000Z',
    } satisfies Customer
    const customer = createCustomer({ firstName: 'Marco', lastName: 'Pedalini', phone: '555-0199' }, now, existing)
    expect(customer.id).toBe('cust-001')
    expect(customer.total_spent).toBe(40)
    expect(customer.visit_count).toBe(2)
    expect(customer.created_at).toBe(existing.created_at)
    expect(customer.phone).toBe('555-0199')
    expect(customer.updated_at).toBe(now.toISOString())
  })

  it('requires a first and last name', () => {
    expect(() => createCustomer({ firstName: ' ', lastName: 'Dropoff' }, now)).toThrow(/first and last name/i)
  })
})
