import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PromisedPickup } from '@/components/promised-pickup'
import {
  BOARD_COLUMNS,
  customerName,
  formatWorkOrderStatus,
  nextWorkOrderActions,
  quoteWorkOrder,
  type WOLineItem,
} from '@/lib/demo/work-order-service'
import type { WorkOrder } from '@/lib/types/database'

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  rush: 'bg-red-100 text-red-700 border-red-200',
}

export function WorkOrderBoard({
  orders,
  customers,
  lineItems,
  onOpen,
  onStatusChange,
}: {
  orders: WorkOrder[]
  customers: { id: string; first_name: string; last_name: string }[]
  lineItems: Record<string, WOLineItem[]>
  onOpen: (order: WorkOrder) => void
  onStatusChange: (id: string, status: WorkOrder['status']) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {BOARD_COLUMNS.map(column => {
        const columnOrders = orders.filter(order => (column.statuses as readonly string[]).includes(order.status))
        return (
          <section key={column.id} aria-labelledby={`wo-col-${column.id}`} className="flex min-w-0 flex-col gap-2">
            <h2 id={`wo-col-${column.id}`} className="flex items-center justify-between text-sm font-semibold">
              {column.label}
              <span className="sr-only">, {columnOrders.length}</span>
              <span aria-hidden="true" className="text-muted-foreground tabular-nums">{columnOrders.length}</span>
            </h2>
            <ul className="flex min-h-24 flex-col gap-2">
              {columnOrders.length === 0 && (
                <li className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">None</li>
              )}
              {columnOrders.map(order => {
                const name = customerName(order.customer_id, customers)
                const quote = quoteWorkOrder(order, lineItems[order.id] ?? [])
                const actions = nextWorkOrderActions(order.status)
                return (
                  <li key={order.id}>
                    <Card>
                      <CardContent className="space-y-2 p-3">
                        <button
                          type="button"
                          className="w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Open ${order.work_order_number}, ${name}, ${formatWorkOrderStatus(order.status)}`}
                          onClick={() => onOpen(order)}
                        >
                          <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <span className="whitespace-nowrap font-medium">{order.work_order_number}</span>
                            <Badge variant="outline" className={priorityColors[order.priority]}>
                              {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                            </Badge>
                          </span>
                          <span className="mt-1 block text-sm">{name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{formatWorkOrderStatus(order.status)}</span>
                          {order.intake_notes && (
                            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{order.intake_notes}</span>
                          )}
                          <PromisedPickup value={order.estimated_completion} />
                          {quote.total > 0 && <span className="mt-1 block text-sm font-medium text-foreground">${quote.total.toFixed(2)}</span>}
                        </button>
                        {actions.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {actions.map(action => (
                              <Button
                                key={action.status}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-auto whitespace-normal py-1 text-xs"
                                aria-label={`${action.label} for ${order.work_order_number}`}
                                onClick={() => onStatusChange(order.id, action.status)}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
