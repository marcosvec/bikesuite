import { beforeEach, describe, expect, it } from 'vitest'
import { mockCustomers, mockProducts, mockTransactions, mockWorkOrderItems, mockWorkOrders } from '@/lib/demo/mock-data'
import {
  arriveAppointment,
  bookDropoff,
  cancelAppointment,
  dayLoad,
  seedAppointments,
  slotOn,
  startOfDay,
} from '@/lib/demo/appointments'
import {
  averageTurnaroundHours,
  laborVersusParts,
  lowStockParts,
  revenueByDay,
  revenueByWeek,
  topServices,
} from '@/lib/demo/reports'

const today = startOfDay(new Date('2026-11-04T15:00:00'))

describe('drop-off appointments', () => {
  const capacity = 1
  const slot = slotOn(today, 10)

  it('books until the day is full, then frees the seat when the booking is cancelled', () => {
    const first = bookDropoff({
      appointments: [],
      capacity,
      slot,
      customerId: 'cust-001',
      customerName: 'Marco Pedalini',
      bikeDescription: 'Blue Trek FX 3',
      notes: 'Brake',
      now: today,
      id: 'appt-1',
    })
    expect('appointment' in first).toBe(true)
    if (!('appointment' in first)) return
    const blocked = bookDropoff({
      appointments: [first.appointment],
      capacity,
      slot: slotOn(today, 11),
      customerId: null,
      customerName: 'Walk-in',
      bikeDescription: 'Red bike',
      notes: '',
      now: today,
    })
    expect(blocked).toEqual({ error: 'That day already has 1 drop-offs.' })
    const cancelled = cancelAppointment([first.appointment], 'appt-1')
    expect(Array.isArray(cancelled)).toBe(true)
    if (!Array.isArray(cancelled)) return
    expect(dayLoad(cancelled, today)).toBe(0)
  })

  it('opens an Intake work order when the bike arrives', () => {
    localStorage.setItem('bikesuite_settings', JSON.stringify({ assumeImmediateWork: true }))
    const seeded = seedAppointments(today)[0]
    const arrived = arriveAppointment(seeded, today)
    expect('workOrder' in arrived).toBe(true)
    if (!('workOrder' in arrived)) return
    expect(arrived.workOrder.status).toBe('intake')
    expect(arrived.workOrder.customer_id).toBe('cust-001')
    expect(arrived.workOrder.intake_notes).toMatch(/Blue Trek FX 3/)
    expect(arrived.appointment).toMatchObject({ status: 'arrived', workOrderId: arrived.workOrder.id })
  })
})

describe('demo reports', () => {
  it('totals revenue by day and by Monday week', () => {
    const days = revenueByDay(mockTransactions)
    expect(days.map(day => day.key)).toEqual(['2026-02-10', '2026-02-11', '2026-02-12', '2026-02-15'])
    expect(days[0].total).toBe(1403.99)
    const weeks = revenueByWeek(mockTransactions)
    expect(weeks).toEqual([{ key: '2026-02-09', total: 2585.17, count: 4 }])
  })

  it('keeps a sale on the shop day when it is still the previous evening in America/New_York', () => {
    const evening = {
      ...mockTransactions[0],
      id: 'trans-before-midnight',
      created_at: '2026-02-11T04:30:00.000Z',
      total: 10,
    }
    const morning = { ...evening, id: 'trans-after-midnight', created_at: '2026-02-11T05:00:00.000Z', total: 20 }
    expect(revenueByDay([evening], 'America/New_York').map(day => day.key)).toEqual(['2026-02-10'])
    expect(revenueByDay([morning], 'America/New_York').map(day => day.key)).toEqual(['2026-02-11'])
    expect(revenueByDay([evening], 'UTC').map(day => day.key)).toEqual(['2026-02-11'])
    const sundayNight = { ...evening, id: 'trans-sunday', created_at: '2026-02-16T04:30:00.000Z', total: 10 }
    const mondayMorning = { ...morning, id: 'trans-monday', created_at: '2026-02-16T05:00:00.000Z', total: 20 }
    expect(revenueByWeek([sundayNight, mondayMorning], 'America/New_York')).toEqual([
      { key: '2026-02-09', total: 10, count: 1 },
      { key: '2026-02-16', total: 20, count: 1 },
    ])
  })

  it('splits labor and parts, ranks services, and averages turnaround', () => {
    const finished = mockWorkOrders.filter(order => order.id === 'wo-004' || order.id === 'wo-005')
    expect(laborVersusParts(finished)).toEqual({ labor: 274, parts: 69.98 })
    expect(topServices(mockWorkOrderItems)[0]).toMatchObject({ name: 'Full Overhaul', total: 199 })
    expect(topServices(mockWorkOrderItems).find(service => service.name === 'Basic Tune-Up')?.count).toBe(2)
    expect(averageTurnaroundHours(finished)).toBe(36)
  })

  it('lists parts at or below the reorder point', () => {
    const names = lowStockParts(mockProducts).map(part => part.name)
    expect(names).toContain('Handlebar Tape - Cork')
    expect(names).toContain("Marco's Trailblazer MTB")
    expect(names.every(name => !name.includes('Tune'))).toBe(true)
    expect(mockCustomers.length).toBeGreaterThan(0)
  })
})
