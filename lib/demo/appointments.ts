import type { WorkOrder } from '@/lib/types/database'
import { createWorkOrder } from '@/lib/demo/create-work-order'

export type AppointmentStatus = 'booked' | 'arrived' | 'cancelled'

export type Appointment = {
  id: string
  customerId: string | null
  customerName: string
  bikeDescription: string
  notes: string
  slot: string
  status: AppointmentStatus
  workOrderId: string | null
  createdAt: string
}

export const DROP_OFF_HOURS = [9, 10, 11, 12, 13, 14, 15, 16] as const
export const DEFAULT_DAILY_CAPACITY = 6

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfWeek(date: Date) {
  const day = startOfDay(date)
  const weekday = day.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  day.setDate(day.getDate() + diff)
  return day
}

export function slotOn(day: Date, hour: number) {
  const slot = startOfDay(day)
  slot.setHours(hour, 0, 0, 0)
  return slot
}

export function sameDay(a: Date | string, b: Date | string) {
  const left = startOfDay(new Date(a)).getTime()
  const right = startOfDay(new Date(b)).getTime()
  return left === right
}

export function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function timeLabel(value: Date | string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function parseDailyCapacity(value: unknown): number | null {
  const capacity = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 24) return null
  return capacity
}

export function dailyCapacityFromSettings(raw: string | null | undefined) {
  if (!raw) return DEFAULT_DAILY_CAPACITY
  try {
    const parsed = JSON.parse(raw) as { dailyDropoffCapacity?: unknown }
    return parseDailyCapacity(parsed.dailyDropoffCapacity) ?? DEFAULT_DAILY_CAPACITY
  } catch {
    return DEFAULT_DAILY_CAPACITY
  }
}

export function appointmentsOnDay(appointments: Appointment[], day: Date) {
  return appointments
    .filter(appointment => sameDay(appointment.slot, day))
    .sort((a, b) => a.slot.localeCompare(b.slot))
}

export function countedTowardCapacity(appointment: Appointment) {
  return appointment.status !== 'cancelled'
}

export function dayLoad(appointments: Appointment[], day: Date) {
  return appointmentsOnDay(appointments, day).filter(countedTowardCapacity).length
}

export function bookDropoff(input: {
  appointments: Appointment[]
  capacity: number
  slot: Date
  customerId: string | null
  customerName: string
  bikeDescription: string
  notes: string
  now?: Date
  id?: string
}): { appointment: Appointment } | { error: string } {
  const bike = input.bikeDescription.trim()
  const name = input.customerName.trim()
  if (!bike) return { error: 'Enter a bike description.' }
  if (!name) return { error: 'Enter a customer name.' }
  if (!DROP_OFF_HOURS.includes(input.slot.getHours() as (typeof DROP_OFF_HOURS)[number]) || input.slot.getMinutes() !== 0) {
    return { error: 'Choose a drop-off hour between 9 AM and 4 PM.' }
  }
  const capacity = parseDailyCapacity(input.capacity) ?? DEFAULT_DAILY_CAPACITY
  if (dayLoad(input.appointments, input.slot) >= capacity) {
    return { error: `That day already has ${capacity} drop-offs.` }
  }
  const now = input.now ?? new Date()
  const appointment: Appointment = {
    id: input.id ?? `appt-${now.getTime()}`,
    customerId: input.customerId,
    customerName: name,
    bikeDescription: bike,
    notes: input.notes.trim(),
    slot: input.slot.toISOString(),
    status: 'booked',
    workOrderId: null,
    createdAt: now.toISOString(),
  }
  return { appointment }
}

export function cancelAppointment(appointments: Appointment[], id: string): Appointment[] | { error: string } {
  const current = appointments.find(appointment => appointment.id === id)
  if (!current) return { error: 'That appointment is no longer on the calendar.' }
  if (current.status !== 'booked') return { error: 'Only a booked drop-off can be cancelled.' }
  return appointments.map(appointment => appointment.id === id ? { ...appointment, status: 'cancelled' } : appointment)
}

// Arrival always opens an Intake work order. A booked slot is a promise to
// start at the desk, even when Assume Immediate Work is on for walk-up check-in.
export function arriveAppointment(appointment: Appointment, now = new Date()): { appointment: Appointment; workOrder: WorkOrder } | { error: string } {
  if (appointment.status !== 'booked') return { error: 'Only a booked drop-off can be checked in.' }
  let workOrder: WorkOrder
  try {
    workOrder = createWorkOrder({
      customerId: appointment.customerId ?? 'walk-in',
      bikeDescription: appointment.bikeDescription,
      intakeNotes: appointment.notes ? `Scheduled drop-off. ${appointment.notes}` : 'Scheduled drop-off.',
      priority: 'normal',
    }, now)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not open a work order.' }
  }
  workOrder = { ...workOrder, status: 'intake' }
  return {
    workOrder,
    appointment: { ...appointment, status: 'arrived', workOrderId: workOrder.id },
  }
}

export function seedAppointments(today = new Date()): Appointment[] {
  const day = startOfDay(today)
  const created = day.toISOString()
  return [
    {
      id: 'appt-marco',
      customerId: 'cust-001',
      customerName: 'Marco Pedalini',
      bikeDescription: 'Blue Trek FX 3',
      notes: 'Front brake rub',
      slot: slotOn(day, 9).toISOString(),
      status: 'booked',
      workOrderId: null,
      createdAt: created,
    },
    {
      id: 'appt-suzie',
      customerId: 'cust-004',
      customerName: 'Suzie Chainring',
      bikeDescription: 'Silver Specialized Sirrus',
      notes: 'Annual tune',
      slot: slotOn(day, 14).toISOString(),
      status: 'booked',
      workOrderId: null,
      createdAt: created,
    },
    {
      id: 'appt-jane',
      customerId: 'cust-002',
      customerName: 'Jane Doe',
      bikeDescription: 'City bike',
      notes: 'Loose headset',
      slot: slotOn(addDays(day, 1), 10).toISOString(),
      status: 'booked',
      workOrderId: null,
      createdAt: created,
    },
  ]
}
