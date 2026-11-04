'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { mockTransactions, mockWorkOrderItems, mockWorkOrders } from '@/lib/demo/mock-data'
import { useDemoStore } from '@/lib/demo/use-demo-store'
import { usePersistentState } from '@/lib/demo/use-persistent-state'
import { useShopTimeZone } from '@/lib/demo/use-shop-tax-rate'
import {
  averageTurnaroundHours,
  laborVersusParts,
  lowStockParts,
  revenueByDay,
  revenueByWeek,
  topServices,
} from '@/lib/demo/reports'
import type { WOLineItem } from '@/lib/demo/work-order-service'

function money(value: number) {
  return `$${value.toFixed(2)}`
}

function hoursLabel(hours: number | null) {
  if (hours === null) return 'No finished work orders yet'
  const days = hours / 24
  if (days >= 1) return `${Number(days.toFixed(1))} days`
  return `${hours.toFixed(1)} hours`
}

export default function ReportsPage() {
  const { transactions, workOrders, products } = useDemoStore()
  const timeZone = useShopTimeZone()
  const [lineItems] = usePersistentState<Record<string, WOLineItem[]>>('bikesuite_work_order_items', mockWorkOrderItems)
  const days = revenueByDay(transactions.length ? transactions : mockTransactions, timeZone)
  const weeks = revenueByWeek(transactions, timeZone)
  const split = laborVersusParts(workOrders)
  const services = topServices(lineItems)
  const turnaround = averageTurnaroundHours(workOrders)
  const low = lowStockParts(products)
  const splitTotal = split.labor + split.parts
  const maxDay = Math.max(0, ...days.map(day => day.total))

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Figures from the sales and work orders stored in this browser.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle><h2>Revenue by day</h2></CardTitle>
            <CardDescription>Completed sales, grouped by calendar day in {timeZone}.</CardDescription>
          </CardHeader>
          <CardContent>
            {days.length === 0 && <p className="text-sm text-muted-foreground">No completed sales yet.</p>}
            <Table>
              <caption className="sr-only">Revenue by day</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map(day => (
                  <TableRow key={day.key}>
                    <TableCell>{day.key}</TableCell>
                    <TableCell>{day.count}</TableCell>
                    <TableCell className="text-right">
                      <span className="mb-1 block">{money(day.total)}</span>
                      <span className="block h-1.5 rounded bg-muted" aria-hidden>
                        <span className="block h-1.5 rounded bg-primary" style={{ width: `${maxDay ? (day.total / maxDay) * 100 : 0}%` }} />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><h2>Revenue by week</h2></CardTitle>
            <CardDescription>Weeks start on Monday in {timeZone}.</CardDescription>
          </CardHeader>
          <CardContent>
            {weeks.length === 0 && <p className="text-sm text-muted-foreground">No completed sales yet.</p>}
            <Table>
              <caption className="sr-only">Revenue by week</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Week of</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map(week => (
                  <TableRow key={week.key}>
                    <TableCell>{week.key}</TableCell>
                    <TableCell>{week.count}</TableCell>
                    <TableCell className="text-right">{money(week.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle><h2>Labor vs parts</h2></CardTitle>
            <CardDescription>Actual amounts on finished work orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex justify-between"><span>Labor</span><span>{money(split.labor)}</span></p>
            <p className="flex justify-between"><span>Parts</span><span>{money(split.parts)}</span></p>
            <div className="flex h-3 overflow-hidden rounded bg-muted" aria-hidden>
              <div className="bg-primary" style={{ width: `${splitTotal ? (split.labor / splitTotal) * 100 : 0}%` }} />
              <div className="bg-amber-500" style={{ width: `${splitTotal ? (split.parts / splitTotal) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Labor is the dark share. Parts are the amber share.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><h2>Top services</h2></CardTitle>
            <CardDescription>Labor lines on work orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 && <p className="text-sm text-muted-foreground">No labor lines yet.</p>}
            <ul className="space-y-2 text-sm">
              {services.map(service => (
                <li key={service.name} className="flex justify-between gap-3">
                  <span>{service.name}</span>
                  <span className="text-muted-foreground">{service.count} · {money(service.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><h2>Turnaround</h2></CardTitle>
            <CardDescription>Average time from intake to finished.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{hoursLabel(turnaround)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Completed and picked-up orders with a finish time.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><h2>Low-stock parts</h2></CardTitle>
          <CardDescription>At or below the reorder point, including parts that are out.</CardDescription>
        </CardHeader>
        <CardContent>
          {low.length === 0 && <p className="text-sm text-muted-foreground">Nothing to reorder.</p>}
          <Table>
            <caption className="sr-only">Parts at or below the reorder point</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {low.map(part => (
                <TableRow key={part.id}>
                  <TableCell>
                    <Link href="/inventory" className="underline">{part.name}</Link>
                  </TableCell>
                  <TableCell className="text-right">{part.quantity}</TableCell>
                  <TableCell className="text-right">{part.reorderPoint}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
