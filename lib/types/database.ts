// BikeSuite Database Types

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  organization_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  organization_id: string | null
  location_id: string | null
  first_name: string
  last_name: string
  email: string
  role: 'owner' | 'admin' | 'manager' | 'technician' | 'cashier'
  pin_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  organization_id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface Brand {
  id: string
  organization_id: string
  name: string
  logo_url: string | null
  created_at: string
}

export interface Product {
  id: string
  organization_id: string
  category_id: string | null
  brand_id: string | null
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  base_price: number
  cost: number
  is_serialized: boolean
  is_service: boolean
  is_active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
  // Joined fields
  category?: Category
  brand?: Brand
  inventory?: Inventory[]
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  sku: string | null
  barcode: string | null
  price_adjustment: number
  cost_adjustment: number
  is_active: boolean
  created_at: string
}

export interface Inventory {
  id: string
  product_id: string
  variant_id: string | null
  location_id: string
  quantity: number
  reorder_point: number
  reorder_quantity: number
  updated_at: string
}

export interface SerialNumber {
  id: string
  product_id: string
  variant_id: string | null
  location_id: string
  serial_number: string
  status: 'in_stock' | 'sold' | 'reserved' | 'returned'
  sold_at: string | null
  customer_id: string | null
  transaction_id: string | null
  created_at: string
}

export interface Customer {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  total_spent: number
  visit_count: number
  last_visit: string | null
  created_at: string
  updated_at: string
}

export interface CustomerBike {
  id: string
  customer_id: string
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  serial_number: string | null
  notes: string | null
  created_at: string
}

export interface Transaction {
  id: string
  organization_id: string
  location_id: string
  staff_id: string | null
  customer_id: string | null
  transaction_number: string
  type: 'sale' | 'return' | 'exchange' | 'layaway'
  status: 'pending' | 'completed' | 'voided' | 'refunded'
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  notes: string | null
  created_at: string
  completed_at: string | null
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string | null
  variant_id: string | null
  serial_number_id: string | null
  work_order_id: string | null
  name: string
  sku: string | null
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
  created_at: string
}

export interface Payment {
  id: string
  transaction_id: string
  method: 'cash' | 'card' | 'check' | 'gift_card' | 'store_credit' | 'other'
  amount: number
  reference_number: string | null
  created_at: string
}

export interface WorkOrder {
  id: string
  organization_id: string
  location_id: string
  customer_id: string | null
  customer_bike_id: string | null
  assigned_to: string | null
  work_order_number: string
  status: 'intake' | 'diagnosed' | 'waiting_parts' | 'in_progress' | 'quality_check' | 'ready' | 'completed' | 'picked_up'
  priority: 'low' | 'normal' | 'high' | 'rush'
  intake_notes: string | null
  diagnosis_notes: string | null
  internal_notes: string | null
  estimated_completion: string | null
  labor_estimate: number
  parts_estimate: number
  actual_labor: number
  actual_parts: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface WorkOrderItem {
  id: string
  work_order_id: string
  product_id: string | null
  variant_id: string | null
  type: 'labor' | 'part'
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
  is_completed: boolean
  created_at: string
}

// Cart types for POS
export interface CartItem {
  id: string
  product: Product
  variant?: ProductVariant
  serialNumber?: SerialNumber
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface Cart {
  items: CartItem[]
  customer: Customer | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
}
