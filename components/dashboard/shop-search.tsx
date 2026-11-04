'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { mockBikes, mockCustomers, mockTransactions, mockWorkOrders } from '@/lib/demo/mock-data'
import { BIKES_STORAGE_KEY } from '@/lib/demo/storage-keys'
import { searchShop, type ShopSearchData, type ShopSearchHit } from '@/lib/demo/global-search'
import type { Customer, CustomerBike, Transaction, WorkOrder } from '@/lib/types/database'

const kindLabel: Record<ShopSearchHit['kind'], string> = {
  customer: 'Customers',
  bike: 'Bikes',
  'work-order': 'Work orders',
  sale: 'Sales',
}

function readList<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function snapshot(): ShopSearchData {
  return {
    customers: readList<Customer>('bikesuite_customers', mockCustomers),
    bikes: readList<CustomerBike>(BIKES_STORAGE_KEY, mockBikes),
    workOrders: readList<WorkOrder>('bikesuite_work_orders', mockWorkOrders),
    transactions: readList<Transaction>('bikesuite_transactions', mockTransactions),
  }
}

export function ShopSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const hits = open ? searchShop(query, snapshot()) : []
  const groups = (['customer', 'bike', 'work-order', 'sale'] as const)
    .map(kind => ({ kind, hits: hits.filter(hit => hit.kind === kind) }))
    .filter(group => group.hits.length > 0)

  function show() {
    setQuery('')
    setOpen(true)
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-9 min-w-0 flex-1 justify-start px-3 sm:max-w-xs" onClick={show}>
        <Search className="size-4" />
        <span>Search</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search the shop</DialogTitle>
            <DialogDescription>Customers, bikes, work orders, and sales in this browser.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Search customers, bikes, work orders, and sales"
            placeholder="Name, bike, work order, or sale"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          {query.trim() && groups.length === 0 && (
            <p className="text-sm text-muted-foreground" role="status">No matches.</p>
          )}
          <div className="space-y-4">
            {groups.map(group => (
              <section key={group.kind} aria-label={kindLabel[group.kind]}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kindLabel[group.kind]}</h3>
                <ul className="space-y-1">
                  {group.hits.map(hit => (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <Link
                        href={hit.href}
                        className="block rounded-md px-2 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setOpen(false)}
                      >
                        <span className="block text-sm font-medium">{hit.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{hit.detail}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
