'use client'

import { useReducer, useState } from 'react'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  User, CreditCard, Banknote, CheckCircle2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { CartItem, Customer, Product, Transaction } from '@/lib/types/database'
import { useDemoStore } from '@/lib/demo/use-demo-store'

const TAX_RATE  = 0.08
const CATEGORIES = ['All', 'Bicycles', 'Components', 'Accessories', 'Service']

// ── Cart reducer ──────────────────────────────────────────────────────────────

type CartState = {
  items:      CartItem[]
  customerId: string | null
  subtotal:   number
  taxAmount:  number
  discount:   number
  total:      number
}

type CartAction =
  | { type: 'ADD';          product: Product }
  | { type: 'REMOVE';       id: string }
  | { type: 'INC';          id: string }
  | { type: 'DEC';          id: string }
  | { type: 'SET_CUSTOMER'; customerId: string | null }
  | { type: 'CLEAR' }

function recalc(items: CartItem[]): Pick<CartState, 'subtotal' | 'taxAmount' | 'total'> {
  const subtotal  = items.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * TAX_RATE
  return { subtotal, taxAmount, total: subtotal + taxAmount }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const idx = state.items.findIndex(
        i => i.product.id === action.product.id && !action.product.is_serialized
      )
      let items: CartItem[]
      if (idx >= 0) {
        items = state.items.map((item, i) =>
          i === idx
            ? { ...item, quantity: item.quantity + 1, total: item.unitPrice * (item.quantity + 1) }
            : item
        )
      } else {
        items = [...state.items, {
          id:        `${action.product.id}-${Date.now()}`,
          product:   action.product,
          quantity:  1,
          unitPrice: action.product.base_price,
          discount:  0,
          total:     action.product.base_price,
        }]
      }
      return { ...state, items, ...recalc(items) }
    }
    case 'REMOVE': {
      const items = state.items.filter(i => i.id !== action.id)
      return { ...state, items, ...recalc(items) }
    }
    case 'INC': {
      const items = state.items.map(i =>
        i.id === action.id
          ? { ...i, quantity: i.quantity + 1, total: i.unitPrice * (i.quantity + 1) }
          : i
      )
      return { ...state, items, ...recalc(items) }
    }
    case 'DEC': {
      const items = state.items
        .map(i =>
          i.id === action.id
            ? { ...i, quantity: i.quantity - 1, total: i.unitPrice * (i.quantity - 1) }
            : i
        )
        .filter(i => i.quantity > 0)
      return { ...state, items, ...recalc(items) }
    }
    case 'SET_CUSTOMER':
      return { ...state, customerId: action.customerId }
    case 'CLEAR':
      return { items: [], customerId: null, subtotal: 0, taxAmount: 0, discount: 0, total: 0 }
    default:
      return state
  }
}

const initialCart: CartState = {
  items: [], customerId: null, subtotal: 0, taxAmount: 0, discount: 0, total: 0,
}

// ── Customer picker dialog ────────────────────────────────────────────────────

function CustomerDialog({
  open, onOpenChange, selectedId, onSelect, customers,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  selectedId:   string | null
  onSelect:     (id: string | null) => void
  customers:    Customer[]
}) {
  const [q, setQ] = useState('')
  const filtered  = customers.filter(c => {
    const s = q.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(s) ||
      c.last_name.toLowerCase().includes(s)  ||
      c.email?.toLowerCase().includes(s)     ||
      c.phone?.toLowerCase().includes(s)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, or phone…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        {selectedId && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => { onSelect(null); onOpenChange(false) }}
          >
            <X className="mr-2 size-4" /> Remove customer
          </Button>
        )}
        <ScrollArea className="max-h-72">
          <div className="space-y-1 pr-3">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); onOpenChange(false) }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selectedId === c.id ? 'bg-accent' : ''}`}
              >
                <p className="font-medium">{c.first_name} {c.last_name}</p>
                <p className="text-muted-foreground text-xs">{c.phone} · {c.email}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">No customers found</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ── Payment dialog ────────────────────────────────────────────────────────────

function PaymentDialog({
  open, onOpenChange, total, onComplete,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  total:        number
  onComplete:   () => void
}) {
  const [method,   setMethod]   = useState<'cash' | 'card'>('card')
  const [tendered, setTendered] = useState('')
  const [done,     setDone]     = useState(false)

  const tenderedAmt = parseFloat(tendered) || 0
  const change      = Math.max(0, tenderedAmt - total)
  const canCharge   = method === 'card' || tenderedAmt >= total

  const quickAmounts = [...new Set(
    [
      Math.ceil(total),
      Math.ceil(total / 5) * 5,
      Math.ceil(total / 10) * 10,
      Math.ceil(total / 20) * 20,
    ].filter(v => v >= total)
  )].slice(0, 4)

  function handleCharge() {
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setTendered('')
      setMethod('card')
      onComplete()
      onOpenChange(false)
    }, 1800)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!done) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Checkout — ${total.toFixed(2)}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="size-14 text-green-500" />
            <p className="text-lg font-semibold">Payment Complete!</p>
            {method === 'cash' && change > 0 && (
              <p className="text-muted-foreground">
                Change due: <strong>${change.toFixed(2)}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={method === 'card' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMethod('card')}
              >
                <CreditCard className="mr-2 size-4" /> Card
              </Button>
              <Button
                variant={method === 'cash' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMethod('cash')}
              >
                <Banknote className="mr-2 size-4" /> Cash
              </Button>
            </div>

            {method === 'cash' && (
              <div className="space-y-2">
                <Label>Amount Tendered</Label>
                <Input
                  type="number"
                  min={total}
                  step="0.01"
                  placeholder="0.00"
                  value={tendered}
                  onChange={e => setTendered(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-1.5">
                  {quickAmounts.map(a => (
                    <Button
                      key={a}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setTendered(String(a))}
                    >
                      ${a}
                    </Button>
                  ))}
                </div>
                {tenderedAmt >= total && (
                  <p className="text-sm font-medium">Change: ${change.toFixed(2)}</p>
                )}
              </div>
            )}

            <Separator />
            <Button className="w-full" disabled={!canCharge} onClick={handleCharge}>
              {method === 'card' ? 'Charge Card' : 'Complete Cash Sale'} — ${total.toFixed(2)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const stock        = product.inventory?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const isService    = product.is_service
  const reorderPoint = product.inventory?.[0]?.reorder_point ?? 0
  const outOfStock   = !isService && stock === 0

  return (
    <button
      disabled={outOfStock}
      onClick={onAdd}
      className="group relative flex flex-col rounded-lg border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <p className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</p>
        {isService ? (
          <Badge variant="secondary" className="shrink-0 text-[10px]">Service</Badge>
        ) : outOfStock ? (
          <Badge variant="destructive" className="shrink-0 text-[10px]">Out</Badge>
        ) : stock <= reorderPoint ? (
          <Badge className="shrink-0 bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Low</Badge>
        ) : null}
      </div>
      {product.sku && (
        <p className="text-muted-foreground mb-1 font-mono text-[10px]">{product.sku}</p>
      )}
      <div className="mt-auto flex items-end justify-between pt-1">
        <span className="text-base font-bold">${product.base_price.toFixed(2)}</span>
        {!isService && <span className="text-muted-foreground text-xs">{stock} in stock</span>}
      </div>
      <Plus className="absolute right-2 top-2 size-4 text-primary opacity-0 transition-opacity group-hover:opacity-60 group-enabled:group-active:opacity-100" />
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function POSPage() {
  const {
    products,
    customers,
    setProducts,
    setCustomers,
    setTransactions,
  } = useDemoStore()
  const [cart,               dispatch]              = useReducer(cartReducer, initialCart)
  const [searchQuery,        setSearchQuery]         = useState('')
  const [activeCategory,     setActiveCategory]      = useState('All')
  const [customerDialogOpen, setCustomerDialogOpen]  = useState(false)
  const [paymentDialogOpen,  setPaymentDialogOpen]   = useState(false)

  const selectedCustomer = cart.customerId
    ? customers.find(c => c.id === cart.customerId) ?? null
    : null

  const filteredProducts = products.filter(p => {
    if (!p.is_active) return false
    if (activeCategory !== 'All' && p.category?.name !== activeCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)  ||
        p.barcode?.includes(q)
      )
    }
    return true
  })

  const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0)

  return (
    // Full-height layout: uses actual viewport minus header (h-16) with no extra padding from layout
    <div className="flex h-[calc(100vh-4rem)] gap-3 overflow-hidden p-3">

      {/* ── LEFT: product browser ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="relative shrink-0">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, SKU, or barcode…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="shrink-0 flex-wrap h-auto gap-1">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">{cat}</TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat} value={cat} className="mt-2 min-h-0 flex-1">
              <ScrollArea className="h-full">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <ShoppingCart className="text-muted-foreground mb-4 size-12" />
                    <p className="text-muted-foreground text-sm">No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pr-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredProducts.map(p => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onAdd={() => dispatch({ type: 'ADD', product: p })}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── RIGHT: cart ── */}
      <Card className="flex w-[260px] shrink-0 flex-col overflow-hidden sm:w-72 lg:w-80 xl:w-[340px]">
        {/* Cart header */}
        <CardHeader className="shrink-0 space-y-0 pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Current Sale
              {totalQty > 0 && <Badge variant="secondary" className="text-xs">{totalQty}</Badge>}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 max-w-[130px] truncate px-2 text-xs"
              onClick={() => setCustomerDialogOpen(true)}
            >
              <User className="mr-1 size-3 shrink-0" />
              <span className="truncate">
                {selectedCustomer
                  ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                  : 'Customer'}
              </span>
            </Button>
          </div>
        </CardHeader>

        <Separator />

        {/* Cart items — scrollable */}
        <ScrollArea className="min-h-0 flex-1">
          <CardContent className="px-3 py-2">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <ShoppingCart className="text-muted-foreground mb-2 size-8" />
                <p className="text-muted-foreground text-xs">Add products to start a sale</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.items.map(item => (
                  <div key={item.id} className="space-y-1 rounded-md bg-muted/30 p-2">
                    {/* Row 1: name + line total */}
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-medium leading-tight">
                        {item.product.name}
                      </p>
                      <p className="shrink-0 text-xs font-semibold">
                        ${item.total.toFixed(2)}
                      </p>
                    </div>
                    {/* Row 2: unit price + qty controls */}
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-[10px]">
                        ${item.unitPrice.toFixed(2)} ea
                      </p>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: 'DEC', id: item.id })}
                          aria-label="Decrease"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-5 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: 'INC', id: item.id })}
                          aria-label="Increase"
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-destructive hover:text-destructive"
                          onClick={() => dispatch({ type: 'REMOVE', id: item.id })}
                          aria-label="Remove"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>

        <Separator />

        {/* Totals + actions — always visible */}
        <div className="shrink-0 space-y-1.5 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
            <span>${cart.taxAmount.toFixed(2)}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              disabled={cart.items.length === 0}
              onClick={() => dispatch({ type: 'CLEAR' })}
            >
              Clear
            </Button>
            <Button
              className="min-w-0 flex-1 truncate text-xs"
              size="sm"
              disabled={cart.items.length === 0}
              onClick={() => setPaymentDialogOpen(true)}
            >
              Charge ${cart.total.toFixed(2)}
            </Button>
          </div>
        </div>
      </Card>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        selectedId={cart.customerId}
        onSelect={id => dispatch({ type: 'SET_CUSTOMER', customerId: id })}
        customers={customers}
      />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={cart.total}
        onComplete={() => {
          const now = new Date().toISOString()
          const transaction: Transaction = {
            id: `trans-${crypto.randomUUID()}`,
            organization_id: 'demo-org',
            location_id: 'loc-001',
            staff_id: 'demo-user-001',
            customer_id: cart.customerId,
            transaction_number: `TXN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
            type: 'sale',
            status: 'completed',
            subtotal: cart.subtotal,
            tax_rate: TAX_RATE,
            tax_amount: cart.taxAmount,
            discount_amount: cart.discount,
            total: cart.total,
            notes: null,
            created_at: now,
            completed_at: now,
          }

          setTransactions(previous => [transaction, ...previous])
          setProducts(previous => previous.map(product => {
            const item = cart.items.find(cartItem => cartItem.product.id === product.id)
            if (!item || product.is_service || !product.inventory?.length) return product
            return {
              ...product,
              inventory: product.inventory.map((inventory, index) =>
                index === 0
                  ? { ...inventory, quantity: Math.max(0, inventory.quantity - item.quantity), updated_at: now }
                  : inventory,
              ),
              updated_at: now,
            }
          }))
          if (cart.customerId) {
            setCustomers(previous => previous.map(customer =>
              customer.id === cart.customerId
                ? {
                    ...customer,
                    total_spent: customer.total_spent + cart.total,
                    visit_count: customer.visit_count + 1,
                    last_visit: now,
                    updated_at: now,
                  }
                : customer,
            ))
          }
          dispatch({ type: 'CLEAR' })
        }}
      />
    </div>
  )
}
