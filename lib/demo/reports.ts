import type { Product, Transaction, WorkOrder } from '@/lib/types/database'
import type { WOLineItem } from '@/lib/demo/work-order-service'
import { DEFAULT_SHOP_TIME_ZONE, roundMoney } from '@/lib/demo/shop-settings'

export type RevenueBucket = {
  key: string
  total: number
  count: number
}

export type ServiceTotal = {
  name: string
  count: number
  total: number
}

export type LowStockPart = {
  id: string
  name: string
  quantity: number
  reorderPoint: number
}

function zoneOrDefault(timeZone: string) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone })
    return timeZone
  } catch {
    return DEFAULT_SHOP_TIME_ZONE
  }
}

export function shopCalendarDate(iso: string, timeZone = DEFAULT_SHOP_TIME_ZONE) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneOrDefault(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function mondayOf(civilDate: string) {
  const [year, month, day] = civilDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

function buckets(transactions: Transaction[], keyFor: (iso: string) => string): RevenueBucket[] {
  const totals = new Map<string, RevenueBucket>()
  for (const sale of transactions) {
    if (sale.status !== 'completed') continue
    const key = keyFor(sale.created_at)
    if (!key) continue
    const current = totals.get(key) ?? { key, total: 0, count: 0 }
    current.total = roundMoney(current.total + sale.total)
    current.count += 1
    totals.set(key, current)
  }
  return [...totals.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function revenueByDay(transactions: Transaction[], timeZone = DEFAULT_SHOP_TIME_ZONE) {
  return buckets(transactions, iso => shopCalendarDate(iso, timeZone))
}

export function revenueByWeek(transactions: Transaction[], timeZone = DEFAULT_SHOP_TIME_ZONE) {
  return buckets(transactions, iso => {
    const day = shopCalendarDate(iso, timeZone)
    return day ? mondayOf(day) : ''
  })
}

export function finishedOrders(orders: WorkOrder[]) {
  return orders.filter(order => order.status === 'completed' || order.status === 'picked_up')
}

export function laborVersusParts(orders: WorkOrder[]) {
  return finishedOrders(orders).reduce((sum, order) => ({
    labor: roundMoney(sum.labor + order.actual_labor),
    parts: roundMoney(sum.parts + order.actual_parts),
  }), { labor: 0, parts: 0 })
}

export function topServices(itemsByOrder: Record<string, WOLineItem[]>): ServiceTotal[] {
  const totals = new Map<string, ServiceTotal>()
  for (const items of Object.values(itemsByOrder)) {
    for (const item of items) {
      if (item.type !== 'labor') continue
      const current = totals.get(item.name) ?? { name: item.name, count: 0, total: 0 }
      current.count += item.quantity
      current.total = roundMoney(current.total + item.total)
      totals.set(item.name, current)
    }
  }
  return [...totals.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export function averageTurnaroundHours(orders: WorkOrder[]) {
  const hours = finishedOrders(orders).flatMap(order => {
    if (!order.completed_at) return []
    const span = new Date(order.completed_at).getTime() - new Date(order.created_at).getTime()
    if (!Number.isFinite(span) || span < 0) return []
    return [span / 3_600_000]
  })
  if (hours.length === 0) return null
  return roundMoney(hours.reduce((sum, value) => sum + value, 0) / hours.length)
}

export function isLowStock(product: Product) {
  if (product.is_service) return false
  const rows = product.inventory ?? []
  if (rows.length === 0) return false
  const quantity = rows.reduce((sum, row) => sum + row.quantity, 0)
  return quantity <= rows[0].reorder_point
}

export function lowStockParts(products: Product[]): LowStockPart[] {
  return products.filter(isLowStock).map(product => ({
    id: product.id,
    name: product.name,
    quantity: (product.inventory ?? []).reduce((sum, row) => sum + row.quantity, 0),
    reorderPoint: product.inventory?.[0]?.reorder_point ?? 0,
  })).sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))
}
