import type { Customer, CustomerBike, Transaction, WorkOrder } from '@/lib/types/database'

export type ShopSearchKind = 'customer' | 'bike' | 'work-order' | 'sale'

export type ShopSearchHit = {
  id: string
  kind: ShopSearchKind
  title: string
  detail: string
  href: string
}

export type ShopSearchData = {
  customers: Pick<Customer, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'>[]
  bikes: CustomerBike[]
  workOrders: Pick<WorkOrder, 'id' | 'work_order_number' | 'customer_id' | 'customer_bike_id' | 'intake_notes' | 'diagnosis_notes' | 'status'>[]
  transactions: Pick<Transaction, 'id' | 'transaction_number' | 'customer_id' | 'notes' | 'total' | 'status'>[]
}

function includes(value: string | number | null | undefined, needle: string) {
  return String(value ?? '').toLowerCase().includes(needle)
}

function customerName(customers: ShopSearchData['customers'], id: string | null) {
  if (!id) return 'Walk-in'
  const customer = customers.find(item => item.id === id)
  return customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown'
}

export function searchShop(query: string, shop: ShopSearchData): ShopSearchHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const hits: ShopSearchHit[] = []

  for (const customer of shop.customers) {
    const name = `${customer.first_name} ${customer.last_name}`
    if ([name, customer.email, customer.phone].some(value => includes(value, needle))) {
      hits.push({
        id: customer.id,
        kind: 'customer',
        title: name,
        detail: [customer.phone, customer.email].filter(Boolean).join(' · ') || 'Customer',
        href: `/customers?q=${encodeURIComponent(name)}`,
      })
    }
  }

  for (const bike of shop.bikes) {
    const title = [bike.year, bike.color, bike.brand, bike.model].filter(Boolean).join(' ')
    const owner = customerName(shop.customers, bike.customer_id)
    if ([title, bike.brand, bike.model, bike.color, bike.serial_number, bike.notes, owner].some(value => includes(value, needle))) {
      const order = shop.workOrders.find(item => item.customer_bike_id === bike.id)
      hits.push({
        id: bike.id,
        kind: 'bike',
        title: title || 'Bike',
        detail: [owner, bike.serial_number].filter(Boolean).join(' · '),
        href: order ? `/work-orders?order=${order.id}` : `/customers?q=${encodeURIComponent(owner)}`,
      })
    }
  }

  for (const order of shop.workOrders) {
    const name = customerName(shop.customers, order.customer_id)
    if ([order.work_order_number, order.intake_notes, order.diagnosis_notes, name, order.status].some(value => includes(value, needle))) {
      hits.push({
        id: order.id,
        kind: 'work-order',
        title: order.work_order_number,
        detail: `${name} · ${order.intake_notes ?? order.status}`,
        href: `/work-orders?order=${order.id}`,
      })
    }
  }

  for (const sale of shop.transactions) {
    const name = customerName(shop.customers, sale.customer_id)
    if ([sale.transaction_number, sale.notes, name, sale.status, sale.total.toFixed(2)].some(value => includes(value, needle))) {
      hits.push({
        id: sale.id,
        kind: 'sale',
        title: sale.transaction_number,
        detail: `${name} · $${sale.total.toFixed(2)} · ${sale.status}`,
        href: `/?sale=${sale.id}`,
      })
    }
  }

  return hits.slice(0, 24)
}
