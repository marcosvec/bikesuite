import type { Customer, Product, Transaction, WorkOrder } from '@/lib/types/database'

export const SERVICE_TAX_RATE = 0.08

export type WOLineItem = {
  id: string
  type: 'labor' | 'part'
  product_id: string | null
  name: string
  quantity: number
  unit_price: number
  total: number
}

export type ServiceReceiptLine = {
  name: string
  quantity: number
  unitPrice: number
  total: number
  type: 'labor' | 'part' | 'estimate'
}

export type ServiceReceipt = {
  id: string
  transactionId: string
  transactionNumber: string
  workOrderId: string
  workOrderNumber: string
  customerName: string
  method: 'cash' | 'card'
  lines: ServiceReceiptLine[]
  subtotal: number
  taxRate: number
  tax: number
  total: number
  promisedPickup: string | null
  createdAt: string
}

export type WorkOrderQuote = {
  labor: number
  parts: number
  subtotal: number
  tax: number
  total: number
  usingLaborEstimate: boolean
  usingPartsEstimate: boolean
}

export function cents(value: number) {
  return Math.round(value * 100) / 100
}

export function customerName(
  customerId: string | null,
  customers: Pick<Customer, 'id' | 'first_name' | 'last_name'>[] = [],
) {
  if (!customerId) return 'Walk-in'
  const customer = customers.find(item => item.id === customerId)
  return customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown'
}

export function availableStock(product: Product): number | null {
  if (product.is_service) return null
  return (product.inventory ?? []).reduce((sum, row) => sum + row.quantity, 0)
}

export function reservePart(
  products: Product[],
  productId: string | null,
  quantity: number,
  now: string,
): { products: Product[] } | { error: string } {
  if (!productId) return { error: 'Choose a product from inventory.' }
  if (!Number.isFinite(quantity) || quantity < 1) return { error: 'Enter a quantity of at least 1.' }
  if (!Number.isInteger(quantity)) return { error: 'Parts use whole quantities.' }
  const product = products.find(item => item.id === productId)
  if (!product || !product.is_active) return { error: 'That product is not in inventory.' }
  if (product.is_service) return { error: 'Add services as labor, not parts.' }
  const available = availableStock(product) ?? 0
  if (available < quantity) {
    return {
      error: available === 0
        ? `${product.name} is out of stock.`
        : `Only ${available} ${product.name} in stock.`,
    }
  }
  let remaining = quantity
  const inventory = (product.inventory ?? []).map(row => {
    if (remaining <= 0 || row.quantity <= 0) return row
    const take = Math.min(row.quantity, remaining)
    remaining -= take
    return { ...row, quantity: row.quantity - take, updated_at: now }
  })
  return {
    products: products.map(item => item.id === productId ? { ...item, inventory, updated_at: now } : item),
  }
}

export function restorePart(
  products: Product[],
  productId: string | null,
  quantity: number,
  now: string,
): { products: Product[]; warning?: string } {
  if (!productId || quantity <= 0) return { products }
  const product = products.find(item => item.id === productId)
  if (!product || product.is_service || !product.inventory?.length) {
    return {
      products,
      warning: 'The part was removed, and stock could not be put back because the product is no longer stocked.',
    }
  }
  const inventory = product.inventory.map((row, index) =>
    index === 0 ? { ...row, quantity: row.quantity + quantity, updated_at: now } : row,
  )
  return {
    products: products.map(item => item.id === productId ? { ...item, inventory, updated_at: now } : item),
  }
}

export function quoteWorkOrder(
  order: Pick<WorkOrder, 'labor_estimate' | 'parts_estimate'>,
  items: WOLineItem[],
): WorkOrderQuote {
  const laborItems = items.filter(item => item.type === 'labor')
  const partItems = items.filter(item => item.type === 'part')
  const usingLaborEstimate = laborItems.length === 0
  const usingPartsEstimate = partItems.length === 0
  const labor = cents(usingLaborEstimate ? order.labor_estimate : laborItems.reduce((sum, item) => sum + item.total, 0))
  const parts = cents(usingPartsEstimate ? order.parts_estimate : partItems.reduce((sum, item) => sum + item.total, 0))
  const subtotal = cents(labor + parts)
  const tax = cents(subtotal * SERVICE_TAX_RATE)
  return {
    labor,
    parts,
    subtotal,
    tax,
    total: cents(subtotal + tax),
    usingLaborEstimate,
    usingPartsEstimate,
  }
}

export function chargeLines(
  order: Pick<WorkOrder, 'labor_estimate' | 'parts_estimate'>,
  items: WOLineItem[],
): ServiceReceiptLine[] {
  const quote = quoteWorkOrder(order, items)
  const lines: ServiceReceiptLine[] = items.map(item => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
    type: item.type,
  }))
  if (quote.usingLaborEstimate && quote.labor > 0) {
    lines.push({
      name: items.length > 0 ? 'Labor estimate' : 'Labor',
      quantity: 1,
      unitPrice: quote.labor,
      total: quote.labor,
      type: 'estimate',
    })
  }
  if (quote.usingPartsEstimate && quote.parts > 0) {
    lines.push({
      name: items.length > 0 ? 'Parts estimate' : 'Parts',
      quantity: 1,
      unitPrice: quote.parts,
      total: quote.parts,
      type: 'estimate',
    })
  }
  if (lines.length === 0) {
    lines.push({ name: 'No charge', quantity: 1, unitPrice: 0, total: 0, type: 'estimate' })
  }
  return lines
}

export function matchesWorkOrderQuery(
  order: Pick<WorkOrder, 'work_order_number' | 'intake_notes' | 'diagnosis_notes' | 'customer_id'>,
  customers: Pick<Customer, 'id' | 'first_name' | 'last_name'>[],
  query: string,
) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [
    order.work_order_number,
    order.intake_notes,
    order.diagnosis_notes,
    customerName(order.customer_id, customers),
  ].some(value => value?.toLowerCase().includes(needle))
}

export const BOARD_COLUMNS = [
  { id: 'intake', label: 'Intake', statuses: ['intake'] },
  { id: 'in_progress', label: 'In Progress', statuses: ['diagnosed', 'in_progress', 'quality_check'] },
  { id: 'waiting_parts', label: 'Waiting on Parts', statuses: ['waiting_parts'] },
  { id: 'ready', label: 'Ready', statuses: ['ready'] },
  { id: 'finished', label: 'Finished', statuses: ['completed', 'picked_up'] },
] as const

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]['id']

export function columnForStatus(status: string): BoardColumnId {
  const column = BOARD_COLUMNS.find(item => (item.statuses as readonly string[]).includes(status))
  return column?.id ?? 'in_progress'
}

export function nextWorkOrderActions(status: string): { status: WorkOrder['status']; label: string }[] {
  switch (status) {
    case 'intake':
      return [{ status: 'in_progress', label: 'Start work' }]
    case 'diagnosed':
    case 'in_progress':
    case 'quality_check':
      return [
        { status: 'waiting_parts', label: 'Waiting on parts' },
        { status: 'ready', label: 'Mark ready for pickup' },
      ]
    case 'waiting_parts':
      return [{ status: 'in_progress', label: 'Resume work' }]
    case 'completed':
      return [{ status: 'picked_up', label: 'Mark picked up' }]
    default:
      return []
  }
}

export function formatWorkOrderStatus(status: string) {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function hasReceipt(receipts: ServiceReceipt[], workOrderId: string) {
  return receipts.some(receipt => receipt.workOrderId === workOrderId)
}

export function settleWorkOrder(input: {
  order: WorkOrder
  items: WOLineItem[]
  method: 'cash' | 'card'
  customers: Customer[]
  now?: Date
  ids?: { transactionId: string; receiptId: string; transactionNumber: string }
}): {
  order: WorkOrder
  transaction: Transaction
  receipt: ServiceReceipt
  customers: Customer[]
} {
  const now = input.now ?? new Date()
  const iso = now.toISOString()
  const quote = quoteWorkOrder(input.order, input.items)
  const transactionId = input.ids?.transactionId ?? `trans-${crypto.randomUUID()}`
  const receiptId = input.ids?.receiptId ?? `rcpt-${crypto.randomUUID()}`
  const transactionNumber = input.ids?.transactionNumber
    ?? `TXN-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`
  const transaction: Transaction = {
    id: transactionId,
    organization_id: input.order.organization_id,
    location_id: input.order.location_id,
    staff_id: 'demo-user-001',
    customer_id: input.order.customer_id,
    transaction_number: transactionNumber,
    type: 'sale',
    status: 'completed',
    subtotal: quote.subtotal,
    tax_rate: SERVICE_TAX_RATE,
    tax_amount: quote.tax,
    discount_amount: 0,
    total: quote.total,
    notes: `Service receipt for ${input.order.work_order_number}`,
    created_at: iso,
    completed_at: iso,
  }
  const receipt: ServiceReceipt = {
    id: receiptId,
    transactionId,
    transactionNumber,
    workOrderId: input.order.id,
    workOrderNumber: input.order.work_order_number,
    customerName: customerName(input.order.customer_id, input.customers),
    method: input.method,
    lines: chargeLines(input.order, input.items),
    subtotal: quote.subtotal,
    taxRate: SERVICE_TAX_RATE,
    tax: quote.tax,
    total: quote.total,
    promisedPickup: input.order.estimated_completion,
    createdAt: iso,
  }
  const order: WorkOrder = {
    ...input.order,
    status: 'completed',
    actual_labor: quote.labor,
    actual_parts: quote.parts,
    completed_at: iso,
    updated_at: iso,
  }
  const customers = input.order.customer_id
    ? input.customers.map(customer => customer.id === input.order.customer_id
      ? {
          ...customer,
          total_spent: cents(customer.total_spent + quote.total),
          visit_count: customer.visit_count + 1,
          last_visit: iso,
          updated_at: iso,
        }
      : customer)
    : input.customers
  return { order, transaction, receipt, customers }
}
