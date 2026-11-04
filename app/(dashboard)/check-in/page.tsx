'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createWorkOrder } from '@/lib/demo/create-work-order'
import { useDemoStore } from '@/lib/demo/use-demo-store'
import type { Customer, WorkOrder } from '@/lib/types/database'

const priorities: WorkOrder['priority'][] = ['low', 'normal', 'high', 'rush']

function customerName(customerId: string | null, customers: Customer[]) {
  if (!customerId) return 'Walk-in'
  const customer = customers.find(item => item.id === customerId)
  return customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown customer'
}

function formatStatus(status: string) {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function OrderRow({ order, customers }: { order: WorkOrder; customers: Customer[] }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{order.work_order_number}</p>
        <p className="text-sm">{customerName(order.customer_id, customers)}</p>
        <p className="text-xs text-muted-foreground">{order.intake_notes || 'No intake notes'}</p>
      </div>
      <div className="shrink-0 text-right">
        <Badge variant="secondary">{formatStatus(order.status)}</Badge>
        <p className="mt-1 text-xs capitalize text-muted-foreground">{order.priority} priority</p>
      </div>
    </div>
  )
}

export default function CheckInPage() {
  const { customers, workOrders, setWorkOrders } = useDemoStore()
  const [customerId, setCustomerId] = useState('walk-in')
  const [bike, setBike] = useState('')
  const [problem, setProblem] = useState('')
  const [priority, setPriority] = useState<WorkOrder['priority']>('normal')
  const [error, setError] = useState('')
  const [created, setCreated] = useState('')

  const openOrders = workOrders
    .filter(order => order.status !== 'completed' && order.status !== 'picked_up')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const ready = openOrders.filter(order => order.status === 'ready')
  const inShop = openOrders.filter(order => order.status !== 'ready')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const order = createWorkOrder({
        customerId,
        bikeDescription: bike,
        intakeNotes: problem,
        priority,
      })
      setWorkOrders(current => [order, ...current])
      setCreated(order.work_order_number)
      setError('')
      setBike('')
      setProblem('')
      setPriority('normal')
    } catch (caught) {
      setCreated('')
      setError(caught instanceof Error ? caught.message : 'Check-in could not be saved.')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Check-in</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Drop off a bike and open a work order. Parts, labor, and payment stay on Work Orders.
            This demo saves the order in this browser only.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/work-orders">Work orders</Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <h2 className="leading-none font-semibold">New check-in</h2>
            <CardDescription>A bike description is required. The other fields can wait.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" aria-label="New check-in">
              <div className="space-y-1.5">
                <Label htmlFor="checkin-customer">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger id="checkin-customer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkin-bike">Bike description</Label>
                <Input
                  id="checkin-bike"
                  value={bike}
                  onChange={event => setBike(event.target.value)}
                  placeholder="e.g. 2022 Trek FX 3, blue"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkin-problem">Problem</Label>
                <Textarea
                  id="checkin-problem"
                  value={problem}
                  onChange={event => setProblem(event.target.value)}
                  placeholder="What does the customer report?"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkin-priority">Priority</Label>
                <Select value={priority} onValueChange={value => setPriority(value as WorkOrder['priority'])}>
                  <SelectTrigger id="checkin-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map(item => (
                      <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                New orders start at Intake. When Assume Immediate Work is on, they start In Progress.
              </p>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {created && (
                <p role="status" className="text-sm">
                  Checked in {created}. The bike is listed here and on Work Orders.
                </p>
              )}
              <Button type="submit">Check in</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {openOrders.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No bikes are currently checked in.
              </CardContent>
            </Card>
          )}
          {ready.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="leading-none font-semibold">Ready for pickup</h2>
                <CardDescription>These bikes can go home with the customer.</CardDescription>
              </CardHeader>
              <CardContent>
                {ready.map(order => <OrderRow key={order.id} order={order} customers={customers} />)}
              </CardContent>
            </Card>
          )}
          {inShop.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="leading-none font-semibold">In the shop</h2>
                <CardDescription>Open check-ins that are not ready for pickup yet.</CardDescription>
              </CardHeader>
              <CardContent>
                {inShop.map(order => <OrderRow key={order.id} order={order} customers={customers} />)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
