'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDemoStore } from '@/lib/demo/use-demo-store'
import { usePersistentState } from '@/lib/demo/use-persistent-state'
import { SETTINGS_STORAGE_KEY } from '@/lib/demo/storage-keys'
import { SETTINGS_CHANGED_EVENT } from '@/lib/demo/shop-settings'
import {
  DROP_OFF_HOURS,
  addDays,
  appointmentsOnDay,
  arriveAppointment,
  bookDropoff,
  cancelAppointment,
  dailyCapacityFromSettings,
  dayLabel,
  dayLoad,
  seedAppointments,
  slotOn,
  startOfDay,
  startOfWeek,
  timeLabel,
  type Appointment,
} from '@/lib/demo/appointments'

function customerLabel(id: string, customers: { id: string; first_name: string; last_name: string }[]) {
  if (id === 'walk-in') return 'Walk-in'
  const customer = customers.find(item => item.id === id)
  return customer ? `${customer.first_name} ${customer.last_name}` : 'Walk-in'
}

export default function AppointmentsPage() {
  const { customers, setWorkOrders } = useDemoStore()
  const [appointments, setAppointments] = usePersistentState<Appointment[]>('bikesuite_appointments', seedAppointments())
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState<'day' | 'week'>('day')
  const [capacity, setCapacity] = useState(6)
  const [booking, setBooking] = useState<Date | null>(null)
  const [customerId, setCustomerId] = useState('walk-in')
  const [bike, setBike] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = () => setCapacity(dailyCapacityFromSettings(localStorage.getItem(SETTINGS_STORAGE_KEY)))
    load()
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
      window.removeEventListener('storage', load)
    }
  }, [])

  const days = view === 'day' ? [cursor] : Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index))
  const focus = view === 'day' ? cursor : startOfWeek(cursor)

  function openBook(slot: Date) {
    setBooking(slot)
    setCustomerId('walk-in')
    setBike('')
    setNotes('')
    setError(null)
  }

  function saveBooking(event: React.FormEvent) {
    event.preventDefault()
    if (!booking) return
    const result = bookDropoff({
      appointments,
      capacity,
      slot: booking,
      customerId: customerId === 'walk-in' ? null : customerId,
      customerName: customerLabel(customerId, customers),
      bikeDescription: bike,
      notes,
    })
    if ('error' in result) {
      setError(result.error)
      return
    }
    setAppointments(current => [...current, result.appointment])
    setBooking(null)
    toast.success('Drop-off booked')
  }

  function checkIn(appointment: Appointment) {
    const result = arriveAppointment(appointment)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setAppointments(current => current.map(item => item.id === appointment.id ? result.appointment : item))
    setWorkOrders(current => [result.workOrder, ...current])
    toast.success(`Opened ${result.workOrder.work_order_number} at Intake`)
  }

  function cancel(id: string) {
    const result = cancelAppointment(appointments, id)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setAppointments(result)
  }

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">Book a drop-off. Checking the bike in opens an Intake work order.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Calendar layout" className="flex rounded-md border p-0.5">
            <Button type="button" size="sm" variant={view === 'day' ? 'default' : 'ghost'} aria-pressed={view === 'day'} onClick={() => setView('day')}>Day</Button>
            <Button type="button" size="sm" variant={view === 'week' ? 'default' : 'ghost'} aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(current => addDays(current, view === 'day' ? -1 : -7))}>Previous</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Today</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(current => addDays(current, view === 'day' ? 1 : 7))}>Next</Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {view === 'day' ? dayLabel(cursor) : `Week of ${dayLabel(focus)}`} · {capacity} drop-offs per day. Change that in Settings.
      </p>
      <div className={view === 'week' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-7' : 'grid gap-3'}>
        {days.map(day => {
          const load = dayLoad(appointments, day)
          const full = load >= capacity
          const booked = appointmentsOnDay(appointments, day)
          return (
            <section key={day.toISOString()} aria-label={dayLabel(day)} className="rounded-lg border p-3">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">{dayLabel(day)}</h2>
                <p className="text-xs text-muted-foreground">{load} of {capacity}</p>
              </div>
              {full && <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">This day is full.</p>}
              {view === 'week' && (
                <div className="space-y-2">
                  {booked.filter(appointment => appointment.status !== 'cancelled').length === 0 && (
                    <p className="text-xs text-muted-foreground">No drop-offs</p>
                  )}
                  {booked.filter(appointment => appointment.status !== 'cancelled').map(appointment => (
                    <p key={appointment.id} className="text-sm">
                      <span className="font-medium">{timeLabel(appointment.slot)}</span> {appointment.customerName}
                    </p>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => { setCursor(startOfDay(day)); setView('day') }}>
                    Open day
                  </Button>
                </div>
              )}
              {view === 'day' && <ol className="space-y-2">
                {DROP_OFF_HOURS.map(hour => {
                  const slot = slotOn(day, hour)
                  const here = booked.filter(appointment => new Date(appointment.slot).getHours() === hour)
                  return (
                    <li key={hour} className="rounded-md bg-muted/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{timeLabel(slot)}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" disabled={full} onClick={() => openBook(slot)}>
                          Book
                        </Button>
                      </div>
                      {here.length === 0 && <p className="text-xs text-muted-foreground">Open</p>}
                      <ul className="space-y-2">
                        {here.map(appointment => (
                          <li key={appointment.id} className="rounded border bg-card p-2 text-sm">
                            <p className="font-medium">{appointment.customerName}</p>
                            <p className="text-xs text-muted-foreground">{appointment.bikeDescription}</p>
                            <p className="text-xs capitalize">{appointment.status}</p>
                            {appointment.status === 'booked' && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button type="button" size="sm" onClick={() => checkIn(appointment)}>
                                  Check in {appointment.customerName}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => cancel(appointment.id)}>
                                  Cancel {appointment.customerName}
                                </Button>
                              </div>
                            )}
                            {appointment.workOrderId && (
                              <Link href={`/work-orders?order=${appointment.workOrderId}`} className="mt-1 inline-block text-xs underline">
                                Intake work order
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ol>}
            </section>
          )
        })}
      </div>

      <Dialog open={booking !== null} onOpenChange={open => { if (!open) setBooking(null) }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book a drop-off</DialogTitle>
            <DialogDescription>
              {booking ? `${dayLabel(booking)} at ${timeLabel(booking)}` : 'Choose a slot.'} The bike stays booked until it is checked in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveBooking} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-customer">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="appt-customer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.first_name} {customer.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-bike">Bike description</Label>
              <Input id="appt-bike" value={bike} onChange={event => setBike(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-notes">Notes</Label>
              <Textarea id="appt-notes" value={notes} onChange={event => setNotes(event.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBooking(null)}>Close</Button>
              <Button type="submit">Book drop-off</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
