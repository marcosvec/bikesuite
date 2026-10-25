'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, Wrench, AlertTriangle, Users } from 'lucide-react'
import { DemoBanner } from '@/components/demo-banner'
import { useDemoStore } from '@/lib/demo/use-demo-store'

export default function DashboardPage() {
  const { customers, transactions, workOrders, products } = useDemoStore()

  function getCustomerName(customerId: string | null): string {
    if (!customerId) return 'Walk-in'
    const customer = customers.find(c => c.id === customerId)
    return customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown'
  }

  const totalSales = transactions
    .filter(transaction => transaction.status === 'completed')
    .reduce((sum, transaction) => sum + transaction.total, 0)
  const activeWorkOrders = workOrders.filter(
    order => !['completed', 'picked_up'].includes(order.status),
  ).length
  const lowStockItems = products.filter(product => {
    if (product.is_service) return false
    const inventory = product.inventory?.[0]
    return inventory !== undefined && inventory.quantity <= inventory.reorder_point
  }).length

  const displayStats = [
    {
      title: "Today's Sales",
      value: `$${totalSales.toFixed(2)}`,
      description: 'Completed demo sales',
      icon: DollarSign,
    },
    {
      title: 'Active Work Orders',
      value: activeWorkOrders.toString(),
      description: 'Open work orders',
      icon: Wrench,
    },
    {
      title: 'Low Stock Items',
      value: lowStockItems.toString(),
      description: 'At or below reorder point',
      icon: AlertTriangle,
    },
    {
      title: 'Total Customers',
      value: customers.length.toString(),
      description: 'Saved customer records',
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <DemoBanner show />
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {displayStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest sales and returns</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 3).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.transaction_number}</TableCell>
                    <TableCell>{getCustomerName(transaction.customer_id)}</TableCell>
                    <TableCell>
                      <Badge variant="default">{transaction.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${transaction.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Order Status</CardTitle>
            <CardDescription>Overview of active work orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No work orders yet</p>
              )}
              {workOrders.map((wo) => (
                <div key={wo.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{wo.work_order_number}</p>
                    <p className="text-xs text-muted-foreground">{wo.intake_notes}</p>
                  </div>
                  <Badge variant={wo.status === 'in_progress' ? 'default' : 'secondary'}>
                    {wo.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
