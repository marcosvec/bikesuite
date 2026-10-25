'use client'

import type { Customer, Product, Transaction, WorkOrder } from '@/lib/types/database'
import {
  mockCustomers,
  mockProducts,
  mockTransactions,
  mockWorkOrders,
} from '@/lib/demo/mock-data'
import { usePersistentState } from '@/lib/demo/use-persistent-state'

export function useDemoStore() {
  const [products, setProducts] = usePersistentState<Product[]>('bikesuite_products', mockProducts)
  const [customers, setCustomers] = usePersistentState<Customer[]>('bikesuite_customers', mockCustomers)
  const [transactions, setTransactions] = usePersistentState<Transaction[]>(
    'bikesuite_transactions',
    mockTransactions,
  )
  const [workOrders, setWorkOrders] = usePersistentState<WorkOrder[]>(
    'bikesuite_work_orders',
    mockWorkOrders,
  )

  return {
    products,
    setProducts,
    customers,
    setCustomers,
    transactions,
    setTransactions,
    workOrders,
    setWorkOrders,
  }
}
