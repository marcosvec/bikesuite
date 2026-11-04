'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Search, Plus, Wrench, Clock, User, Check, Trash2, CreditCard, Banknote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkOrder, Product } from '@/lib/types/database'
import { PromisedPickup } from '@/components/promised-pickup'
import { ServiceReceiptView } from '@/components/work-orders/service-receipt'
import { WorkOrderBoard } from '@/components/work-orders/status-board'
import { createWorkOrder } from '@/lib/demo/create-work-order'
import { RECEIPTS_STORAGE_KEY } from '@/lib/demo/storage-keys'
import {
  availableStock,
  cents,
  chargeLines,
  customerName,
  formatWorkOrderStatus,
  hasReceipt,
  matchesWorkOrderQuery,
  nextWorkOrderActions,
  quoteWorkOrder,
  reservePart,
  restorePart,
  settleWorkOrder,
  type ServiceReceipt,
  type WOLineItem,
} from '@/lib/demo/work-order-service'
import { formatTaxPercent } from '@/lib/demo/shop-settings'
import { useShopTaxRate } from '@/lib/demo/use-shop-tax-rate'
import { usePersistentState } from '@/lib/demo/use-persistent-state'
import { useDemoStore } from '@/lib/demo/use-demo-store'

// ── Types / constants ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'all',           label: 'All' },
  { value: 'intake',        label: 'Intake' },
  { value: 'in_progress',   label: 'In Progress' },
  { value: 'waiting_parts', label: 'Waiting Parts' },
  { value: 'ready',         label: 'Ready' },
  { value: 'completed',     label: 'Completed' },
] as const

const STATUS_STEP: Record<string, number> = {
  intake: 0, in_progress: 1, waiting_parts: 1,
  diagnosed: 1, quality_check: 1, ready: 2, completed: 3, picked_up: 3,
}

const statusColors: Record<string, string> = {
  intake:        'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-300',
  diagnosed:     'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  in_progress:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  waiting_parts: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  quality_check: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  ready:         'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-300',
  completed:     'bg-gray-100   text-gray-800   dark:bg-gray-800   dark:text-gray-300',
  picked_up:     'bg-gray-100   text-gray-800   dark:bg-gray-800   dark:text-gray-300',
}

const priorityColors: Record<string, string> = {
  low:    'bg-gray-100   text-gray-700   border-gray-200',
  normal: 'bg-blue-100   text-blue-700   border-blue-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  rush:   'bg-red-100    text-red-700    border-red-200',
}

// ── Product search combobox ───────────────────────────────────────────────────
// Shows service products for "labor" type, physical products for "part" type.
// Auto-fills price on select; shows stock badge for parts.

function ProductSearchInput({
  type,
  products,
  selectedName,
  onSelect,
}: {
  type:         'labor' | 'part'
  products:     Product[]
  selectedName: string
  onSelect:     (p: Product) => void
}) {
  const [query, setQuery] = useState(selectedName)
  const [open,  setOpen]  = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  // Ref so PopoverContent can tell if a pointer event came from the Input
  // itself (in which case it should NOT close the popover).
  const anchorRef = useRef<HTMLInputElement>(null)

  // Keep local query in sync when a selection is made externally
  useEffect(() => { setQuery(selectedName) }, [selectedName])

  const options = products
    .filter(p => type === 'labor' ? p.is_service : !p.is_service)
    .filter(p => p.is_active)
    .filter(p =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(query.toLowerCase())
    )
  const highlighted = Math.min(activeIndex, Math.max(options.length - 1, 0))

  function choose(product: Product) {
    onSelect(product)
    setOpen(false)
  }

  return (
    // Use Radix Popover + PopoverAnchor so the dropdown is portalled to <body>
    // and won't be clipped by the dialog's overflow-y-auto scroll container.
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={anchorRef}
          className="h-8 text-xs"
          role="combobox"
          aria-expanded={open}
          aria-controls="wo-product-list"
          aria-autocomplete="list"
          aria-activedescendant={open && options[highlighted] ? `wo-product-option-${options[highlighted].id}` : undefined}
          aria-label={type === 'labor' ? 'Search services' : 'Search inventory'}
          placeholder={type === 'labor' ? 'Search services…' : 'Search inventory…'}
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}   // reopen if focus was kept but popover was closed
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex(index => Math.min(options.length - 1, index + 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex(index => Math.max(0, index - 1))
            } else if (event.key === 'Escape') {
              setOpen(false)
            } else if (event.key === 'Enter' && open && options[highlighted]) {
              event.preventDefault()
              choose(options[highlighted])
            }
          }}
          autoFocus
        />
      </PopoverAnchor>
      <PopoverContent
        // Match the Input's width; prevent focus from jumping into the list
        className="w-[var(--radix-popover-anchor-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={e => e.preventDefault()}
        // When the pointer event comes from the anchor Input itself, Radix
        // would otherwise close the popover (anchor ≠ trigger in Radix's
        // model). Prevent that so clicking/focusing the input keeps it open.
        onPointerDownOutside={e => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault()
        }}
        onInteractOutside={e => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault()
        }}
      >
        <div id="wo-product-list" role="listbox" aria-label={type === 'labor' ? 'Services' : 'Inventory'} className="max-h-44 overflow-y-auto">
          {options.length > 0 ? options.map((p, index) => {
            const stock = availableStock(p)
            return (
              <button
                key={p.id}
                id={`wo-product-option-${p.id}`}
                type="button"
                role="option"
                aria-selected={index === highlighted}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                  index === highlighted && 'bg-muted',
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={e => {
                  e.preventDefault()       // keep focus on the Input
                  choose(p)
                }}
              >
                <span className="min-w-0 truncate">{p.name}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-muted-foreground">${p.base_price.toFixed(2)}</span>
                  {stock !== null && (
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      stock === 0  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : stock <= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground',
                    )}>
                      {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                    </span>
                  )}
                </div>
              </button>
            )
          }) : (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              No {type === 'labor' ? 'services' : 'products'} found.
              {type === 'part' && ' Add items in Inventory first.'}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Status stepper ────────────────────────────────────────────────────────────

const STEPPER_STEPS = ['Intake', 'In Progress', 'Ready', 'Completed']

function WorkOrderStepper({ status }: { status: string }) {
  const currentStep = STATUS_STEP[status] ?? 0
  return (
    <div role="group" className="flex items-start" aria-label={`Progress: ${formatWorkOrderStatus(status)}`}>
      {STEPPER_STEPS.map((label, i) => {
        const done   = i < currentStep
        const active = i === currentStep
        return (
          <div key={label} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done   && 'bg-foreground text-background',
                active && 'border-2 border-foreground bg-background text-foreground',
                !done && !active && 'border-2 border-muted-foreground/30 bg-background text-muted-foreground/40',
              )}>
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <span className={cn(
                'max-w-[64px] truncate text-center text-[10px] font-medium leading-tight',
                active ? 'text-foreground' : done ? 'text-foreground/60' : 'text-muted-foreground/40',
              )}>
                {label}
              </span>
            </div>
            {i < STEPPER_STEPS.length - 1 && (
              <div className={cn(
                'mx-1 mt-3.5 h-0.5 flex-1 transition-colors',
                i < currentStep ? 'bg-foreground' : 'bg-border',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── New work order form ───────────────────────────────────────────────────────

type NewWOForm = {
  customerId: string; bikeDescription: string; intakeNotes: string
  priority: 'low' | 'normal' | 'high' | 'rush'
  laborEstimate: string; partsEstimate: string
}
const emptyWOForm: NewWOForm = {
  customerId: '', bikeDescription: '', intakeNotes: '',
  priority: 'normal', laborEstimate: '', partsEstimate: '',
}

// ── New Work Order dialog ────────────────────────────────────────────────────
function NewWorkOrderDialog({
  open, onOpenChange, onSave, customers,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onSave: (wo: WorkOrder) => void
  customers: { id: string; first_name: string; last_name: string }[]
}) {
  const [form, setForm] = useState<NewWOForm>(emptyWOForm)
  useEffect(() => { if (open) setForm(emptyWOForm) }, [open])

  function set<K extends keyof NewWOForm>(key: K, value: NewWOForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      onSave(createWorkOrder({
        customerId: form.customerId,
        bikeDescription: form.bikeDescription,
        intakeNotes: form.intakeNotes,
        priority: form.priority,
        laborEstimate: form.laborEstimate,
        partsEstimate: form.partsEstimate,
      }))
      onOpenChange(false)
    } catch {
      return
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Work Order</DialogTitle>
          <DialogDescription>Create a repair ticket for a bike dropped off at the shop.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customer">Customer</Label>
            <Select value={form.customerId} onValueChange={v => set('customerId', v)}>
              <SelectTrigger id="customer"><SelectValue placeholder="Walk-in / select customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bike">Bike Description *</Label>
            <Input id="bike" placeholder="e.g. 2022 Trek FX 3, blue"
              value={form.bikeDescription} onChange={e => set('bikeDescription', e.target.value)}
              required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake_notes">Intake Notes</Label>
            <Textarea id="intake_notes" placeholder="What does the customer report?"
              value={form.intakeNotes} onChange={e => set('intakeNotes', e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as NewWOForm['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="labor_est">Labor Est. ($)</Label>
              <Input id="labor_est" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.laborEstimate} onChange={e => set('laborEstimate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parts_est">Parts Est. ($)</Label>
              <Input id="parts_est" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.partsEstimate} onChange={e => set('partsEstimate', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Work Order</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Payment dialog ────────────────────────────────────────────────────────────

function WorkOrderPaymentDialog({
  open, onOpenChange, workOrder, lineItems, onPaid,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  workOrder: WorkOrder | null; lineItems: WOLineItem[]
  onPaid: (method: 'cash' | 'card') => void
}) {
  const taxRate = useShopTaxRate()
  if (!workOrder) return null
  const quote = quoteWorkOrder(workOrder, lineItems, taxRate)
  const lines = chargeLines(workOrder, lineItems, taxRate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>Record a demo cash or card sale. Nothing is charged.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {workOrder.work_order_number}
            </p>
            <PromisedPickup value={workOrder.estimated_completion} className="mb-2 text-xs text-muted-foreground" />
            {lines.map(line => (
              <div key={`${line.type}-${line.name}`} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-muted-foreground">
                  {line.quantity !== 1 ? `${line.quantity}× ` : ''}{line.name}
                </span>
                <span className="shrink-0">${line.total.toFixed(2)}</span>
              </div>
            ))}
            <Separator className="my-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>${quote.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Tax ({formatTaxPercent(taxRate)}%)</span><span>${quote.tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>${quote.total.toFixed(2)}</span></div>
          </div>
          <p className="text-center text-sm text-muted-foreground">Select payment method. This demo does not capture a card or cash.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" aria-label={`Record cash payment of $${quote.total.toFixed(2)}`} className="h-16 flex-col gap-1.5 hover:bg-green-50 hover:border-green-400 dark:hover:bg-green-900/30" onClick={() => onPaid('cash')}>
              <Banknote className="size-5" /><span className="text-sm font-medium">Cash</span>
            </Button>
            <Button type="button" variant="outline" aria-label={`Record card payment of $${quote.total.toFixed(2)}`} className="h-16 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-900/30" onClick={() => onPaid('card')}>
              <CreditCard className="size-5" /><span className="text-sm font-medium">Card</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Work order detail dialog ──────────────────────────────────────────────────

type AddLineItemForm = {
  type:       'labor' | 'part'
  product_id: string | null
  name:       string           // auto-filled from product, shown as read-only after selection
  quantity:   string
  unit_price: string           // auto-filled, but editable for overrides
}

const emptyLineItemForm: AddLineItemForm = {
  type: 'labor', product_id: null, name: '', quantity: '1', unit_price: '',
}

function WorkOrderDetailDialog({
  workOrder, lineItems, customers, products, receipt, onClose, onStatusChange,
  onAddLineItem, onRemoveLineItem, onOpenPayment, onViewReceipt,
}: {
  workOrder:        WorkOrder | null
  lineItems:        WOLineItem[]
  customers:        { id: string; first_name: string; last_name: string }[]
  products:         Product[]
  receipt:          ServiceReceipt | null
  onClose:          () => void
  onStatusChange:   (id: string, status: WorkOrder['status']) => void
  onAddLineItem:    (woId: string, item: WOLineItem) => string | null
  onRemoveLineItem: (woId: string, itemId: string) => void
  onOpenPayment:    () => void
  onViewReceipt:    () => void
}) {
  const [addForm,      setAddForm]      = useState<AddLineItemForm>(emptyLineItemForm)
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)

  useEffect(() => {
    if (!workOrder) { setShowAddForm(false); setAddForm(emptyLineItemForm); setLineError(null) }
  }, [workOrder])

  const taxRate = useShopTaxRate()
  if (!workOrder) return null

  const status = workOrder.status
  const actions = nextWorkOrderActions(status)
  const laborItems = lineItems.filter(i => i.type === 'labor')
  const partItems  = lineItems.filter(i => i.type === 'part')
  const quote = quoteWorkOrder(workOrder, lineItems, taxRate)

  function handleProductSelect(p: Product) {
    setAddForm(f => ({
      ...f,
      product_id: p.id,
      name:       p.name,
      unit_price: p.base_price.toFixed(2),
    }))
  }

  function handleTypeChange(newType: 'labor' | 'part') {
    // Reset selection when switching type — products are incompatible
    setLineError(null)
    setAddForm({ ...emptyLineItemForm, type: newType })
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const qty   = parseFloat(addForm.quantity)
    const price = parseFloat(addForm.unit_price)
    if (!addForm.product_id || !addForm.name) {
      setLineError(addForm.type === 'labor' ? 'Choose a service.' : 'Choose a product from inventory.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setLineError('Enter a quantity greater than zero.')
      return
    }
    if (addForm.type === 'part' && !Number.isInteger(qty)) {
      setLineError('Parts use whole quantities.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setLineError('Enter a price above zero.')
      return
    }

    const item: WOLineItem = {
      id:         `li-${crypto.randomUUID()}`,
      type:       addForm.type,
      product_id: addForm.product_id,
      name:       addForm.name,
      quantity:   qty,
      unit_price: price,
      total:      cents(qty * price),
    }
    const error = onAddLineItem(workOrder!.id, item)
    if (error) {
      setLineError(error)
      return
    }
    setLineError(null)
    setAddForm(f => ({ ...emptyLineItemForm, type: f.type }))
    setShowAddForm(false)
  }

  // Stock badge for a selected product
  const selectedProduct  = addForm.product_id ? products.find(p => p.id === addForm.product_id) : null
  const selectedStock    = selectedProduct ? availableStock(selectedProduct) : null
  const partBlocked = addForm.type === 'part' && selectedStock === 0

  return (
    <Dialog open={!!workOrder} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span>{workOrder.work_order_number}</span>
            <Badge variant="outline" className={priorityColors[workOrder.priority]}>
              {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {customerName(workOrder.customer_id, customers)}. Add parts from inventory, update the status, or collect payment when the bike is ready.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="shrink-0 px-1 pb-2 pt-1">
          <WorkOrderStepper status={workOrder.status} />
        </div>

        <Separator className="shrink-0" />

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 pt-1">
          {/* Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{customerName(workOrder.customer_id, customers)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{new Date(workOrder.created_at).toLocaleDateString()}</p>
            </div>
            <div className="col-span-2">
              <PromisedPickup value={workOrder.estimated_completion} showEmpty className="text-sm text-muted-foreground" />
            </div>
            {workOrder.intake_notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Intake Notes</p>
                <p>{workOrder.intake_notes}</p>
              </div>
            )}
            {workOrder.diagnosis_notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Diagnosis</p>
                <p>{workOrder.diagnosis_notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Line items ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Items &amp; Labor</p>
              {status !== 'completed' && status !== 'picked_up' && (
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => { setLineError(null); setShowAddForm(v => !v) }}>
                  {showAddForm ? 'Cancel' : '+ Add Item'}
                </Button>
              )}
            </div>

            {/* ── Add item form ── */}
            {showAddForm && (
              <form onSubmit={handleAddItem} className="mb-3 space-y-3 rounded-md border bg-muted/20 p-3">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="wo-line-type">Type</Label>
                    <Select value={addForm.type} onValueChange={v => handleTypeChange(v as 'labor' | 'part')}>
                      <SelectTrigger id="wo-line-type" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Labor / Service</SelectItem>
                        <SelectItem value="part">Part / Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qty */}
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="wo-line-qty">Qty</Label>
                    <Input id="wo-line-qty" className="h-8 text-xs" type="number" min={addForm.type === 'part' ? '1' : '0.25'} step={addForm.type === 'part' ? '1' : '0.25'}
                      value={addForm.quantity}
                      onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                </div>

                {/* Product picker — full width */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    {addForm.type === 'labor' ? 'Service' : 'Product'}{' '}
                    <span className="text-destructive">*</span>
                  </Label>

                  {/* If nothing selected yet, show the search combobox.
                      key=type forces a full remount when switching labor↔part
                      so autoFocus re-fires and the dropdown opens cleanly. */}
                  {!addForm.product_id ? (
                    <ProductSearchInput
                      key={addForm.type}
                      type={addForm.type}
                      products={products}
                      selectedName={addForm.name}
                      onSelect={handleProductSelect}
                    />
                  ) : (
                    /* Once a product is selected, show a chip with a clear button */
                    <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
                      <span className="flex-1 truncate text-xs font-medium">{addForm.name}</span>
                      {selectedStock !== null && (
                        <span className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                          selectedStock === 0  ? 'bg-red-100 text-red-700'
                          : selectedStock <= 5 ? 'bg-amber-100 text-amber-700'
                          : 'bg-muted text-muted-foreground',
                        )}>
                          {selectedStock === 0 ? 'Out of stock' : `${selectedStock} in stock`}
                        </span>
                      )}
                      <button
                        type="button"
                        className="shrink-0 text-[10px] text-muted-foreground underline hover:text-foreground"
                        onClick={() => { setLineError(null); setAddForm(f => ({ ...f, product_id: null, name: '', unit_price: '' })) }}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Price — auto-filled but editable */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Unit Price ($)
                    {addForm.product_id && (
                      <span className="ml-1 text-muted-foreground font-normal">— edit to override</span>
                    )}
                  </Label>
                  <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0.00"
                    value={addForm.unit_price}
                    onChange={e => setAddForm(f => ({ ...f, unit_price: e.target.value }))}
                    required />
                </div>

                {/* Preview total */}
                {addForm.product_id && addForm.unit_price && (
                  <p className="text-right text-xs text-muted-foreground">
                    Line total:{' '}
                    <span className="font-semibold text-foreground">
                      ${(parseFloat(addForm.quantity || '1') * parseFloat(addForm.unit_price || '0')).toFixed(2)}
                    </span>
                  </p>
                )}

                {lineError && <p role="alert" className="text-xs text-destructive">{lineError}</p>}
                {partBlocked && !lineError && (
                  <p role="alert" className="text-xs text-destructive">{addForm.name} is out of stock.</p>
                )}
                <Button type="submit" size="sm" className="h-7 w-full text-xs"
                  disabled={!addForm.product_id || !addForm.unit_price || partBlocked}>
                  Add to Work Order
                </Button>
              </form>
            )}

            {/* Items list */}
            {lineItems.length > 0 ? (
              <div className="space-y-0.5">
                {laborItems.length > 0 && (
                  <>
                    <p className="mt-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Labor</p>
                    {laborItems.map(item => (
                      <LineItemRow key={item.id} item={item} canRemove={status !== 'completed' && status !== 'picked_up'}
                        onRemove={() => onRemoveLineItem(workOrder.id, item.id)} />
                    ))}
                  </>
                )}
                {partItems.length > 0 && (
                  <>
                    <p className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Parts</p>
                    {partItems.map(item => (
                      <LineItemRow key={item.id} item={item} canRemove={status !== 'completed' && status !== 'picked_up'}
                        onRemove={() => onRemoveLineItem(workOrder.id, item.id)} />
                    ))}
                  </>
                )}
              </div>
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No items yet.{' '}
                {(workOrder.labor_estimate > 0 || workOrder.parts_estimate > 0)
                  ? `Estimates on file: labor $${workOrder.labor_estimate.toFixed(2)}, parts $${workOrder.parts_estimate.toFixed(2)}.`
                  : 'Add services and parts from inventory above.'}
              </p>
            )}

            {quote.total > 0 && (
              <div className="mt-3 space-y-1 rounded-md bg-muted/40 p-2.5 text-sm">
                {quote.usingLaborEstimate && quote.labor > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Labor estimate</span><span>${quote.labor.toFixed(2)}</span></div>
                )}
                {quote.usingPartsEstimate && quote.parts > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Parts estimate</span><span>${quote.parts.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>${quote.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Tax ({formatTaxPercent(taxRate)}%)</span><span>${quote.tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>${quote.total.toFixed(2)}</span></div>
              </div>
            )}
          </div>

          {actions.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2 pb-1">
                {actions.map(action => (
                  <Button key={action.status} type="button" size="sm" variant="outline"
                    onClick={() => { onStatusChange(workOrder.id, action.status); onClose() }}>
                    {action.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t pt-4">
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <div className="flex gap-2">
              {receipt && (
                <Button type="button" variant="outline" onClick={onViewReceipt}>View receipt</Button>
              )}
              {status === 'ready' && (
                <Button type="button" className="bg-green-600 text-white hover:bg-green-700" onClick={onOpenPayment}>
                  <CreditCard className="mr-2 size-4" />
                  Collect Payment · ${quote.total.toFixed(2)}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Small sub-component to keep the detail dialog readable
function LineItemRow({ item, onRemove, canRemove }: { item: WOLineItem; onRemove: () => void; canRemove: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40">
      <span className="min-w-0 flex-1 truncate">
        {item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">${item.unit_price.toFixed(2)}/ea</span>
      <span className="min-w-[48px] shrink-0 text-right font-medium">${item.total.toFixed(2)}</span>
      {canRemove && (
        <Button type="button" variant="ghost" size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${item.name}`}
          onClick={onRemove}>
          <Trash2 className="size-3" />
        </Button>
      )}
    </div>
  )
}

// ── Work order card (gradient glow on hover) ──────────────────────────────────

function WorkOrderCard({
  order, customers, items, onClick,
}: {
  order: WorkOrder
  customers: { id: string; first_name: string; last_name: string }[]
  items: WOLineItem[]
  onClick: () => void
}) {
  const taxRate = useShopTaxRate()
  const quote = quoteWorkOrder(order, items, taxRate)
  const name = customerName(order.customer_id, customers)
  return (
    <div className="group relative rounded-xl">
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-(--card-glow-from) via-(--card-glow-via) to-(--card-glow-to) opacity-0 blur-md transition-opacity duration-300 motion-reduce:transition-none group-hover:opacity-[--card-glow-opacity]" />
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open ${order.work_order_number}, ${name}, ${formatWorkOrderStatus(order.status)}`}
        className="relative flex w-full flex-col gap-3 rounded-xl border bg-card px-6 py-6 text-left text-card-foreground shadow-sm transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:-translate-y-0.5 group-hover:shadow-lg"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold">{order.work_order_number}</span>
          <Badge variant="outline" className={priorityColors[order.priority]}>
            {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
          </Badge>
        </span>
        <Badge variant="outline" className={`w-fit ${statusColors[order.status]}`}>
          {formatWorkOrderStatus(order.status)}
        </Badge>
        <span className="h-px w-full bg-border" />
        <span className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <User className="size-3.5 shrink-0" />
            <span className="truncate">{name}</span>
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-3.5 shrink-0" />
            <span>Created {new Date(order.created_at).toLocaleDateString()}</span>
          </span>
          <PromisedPickup value={order.estimated_completion} />
        </span>
        {order.intake_notes && (
          <span className="line-clamp-2 text-xs text-muted-foreground">{order.intake_notes}</span>
        )}
        {quote.total > 0 && <span className="text-sm font-medium text-foreground">${quote.total.toFixed(2)}</span>}
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function EmptyWorkOrders({ searching, onCreate }: { searching: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <Wrench className="mb-4 size-12 text-muted-foreground" />
      <h2 className="mb-1 text-lg font-semibold">No work orders</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {searching ? 'Try a different search.' : 'Click "New Work Order" to create one.'}
      </p>
      {!searching && (
        <Button type="button" onClick={onCreate}>
          <Plus className="mr-2 size-4" /> New Work Order
        </Button>
      )}
    </div>
  )
}

export default function WorkOrdersPage() {
  const {
    customers, products, workOrders, setWorkOrders, setProducts, setCustomers, setTransactions,
  } = useDemoStore()
  const [lineItems, setLineItems] = usePersistentState<Record<string, WOLineItem[]>>('bikesuite_work_order_items', {})
  const [receipts, setReceipts] = usePersistentState<ServiceReceipt[]>(RECEIPTS_STORAGE_KEY, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [layout, setLayout] = useState<'board' | 'cards'>('board')
  const [activeTab, setActiveTab] = useState('all')
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<ServiceReceipt | null>(null)
  const [receiptTitle, setReceiptTitle] = useState('Receipt')
  const taxRate = useShopTaxRate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const query = params.get('q')
    const order = params.get('order')
    if (query) setSearchQuery(query)
    if (order) setDetailId(order)
  }, [])

  const detailOrder = detailId ? workOrders.find(order => order.id === detailId) ?? null : null

  function handleCreate(wo: WorkOrder) { setWorkOrders(prev => [wo, ...prev]) }

  function handleStatusChange(id: string, status: WorkOrder['status']) {
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status, updated_at: new Date().toISOString() } : wo))
  }

  function handleAddLineItem(woId: string, item: WOLineItem) {
    if (item.type === 'part') {
      const reserved = reservePart(products, item.product_id, item.quantity, new Date().toISOString())
      if ('error' in reserved) return reserved.error
      setProducts(reserved.products)
    }
    setLineItems(prev => ({ ...prev, [woId]: [...(prev[woId] ?? []), item] }))
    return null
  }

  function handleRemoveLineItem(woId: string, itemId: string) {
    const item = (lineItems[woId] ?? []).find(entry => entry.id === itemId)
    if (!item) return
    if (item.type === 'part') {
      const restored = restorePart(products, item.product_id, item.quantity, new Date().toISOString())
      setProducts(restored.products)
      if (restored.warning) toast.error(restored.warning)
    }
    setLineItems(prev => ({ ...prev, [woId]: (prev[woId] ?? []).filter(entry => entry.id !== itemId) }))
  }

  function showReceipt(receipt: ServiceReceipt, title: string) {
    setReceiptTitle(title)
    setActiveReceipt(receipt)
    setPaymentOpen(false)
    setDetailId(null)
  }

  function handlePayment(method: 'cash' | 'card') {
    if (!detailOrder || hasReceipt(receipts, detailOrder.id)) return
    const settled = settleWorkOrder({
      order: detailOrder,
      items: lineItems[detailOrder.id] ?? [],
      method,
      customers,
      taxRate,
    })
    setWorkOrders(prev => prev.map(order => order.id === detailOrder.id ? settled.order : order))
    setTransactions(prev => [settled.transaction, ...prev])
    setCustomers(settled.customers)
    setReceipts(prev => [settled.receipt, ...prev])
    setPaymentOpen(false)
    showReceipt(settled.receipt, 'Payment recorded')
  }

  const filteredOrders = workOrders.filter(order => {
    const matchesTab = layout === 'board' || activeTab === 'all' || order.status === activeTab
    return matchesTab && matchesWorkOrderQuery(order, customers, searchQuery)
  })
  const currentLineItems = detailOrder ? (lineItems[detailOrder.id] ?? []) : []
  const currentReceipt = detailOrder ? receipts.find(receipt => receipt.workOrderId === detailOrder.id) ?? null : null

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground text-sm">Track repairs from intake through pickup</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Work order layout" className="flex rounded-md border p-0.5">
            <Button type="button" size="sm" variant={layout === 'board' ? 'default' : 'ghost'} aria-pressed={layout === 'board'} onClick={() => setLayout('board')}>Board</Button>
            <Button type="button" size="sm" variant={layout === 'cards' ? 'default' : 'ghost'} aria-pressed={layout === 'cards'} onClick={() => setLayout('cards')}>Cards</Button>
          </div>
          <Button type="button" onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-2 size-4" /> New Work Order
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Label htmlFor="work-order-search" className="sr-only">Search work orders</Label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="work-order-search" placeholder="Search work orders…" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {layout === 'board' ? (
        filteredOrders.length > 0 ? (
          <WorkOrderBoard
            orders={filteredOrders}
            customers={customers}
            lineItems={lineItems}
            onOpen={order => setDetailId(order.id)}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <EmptyWorkOrders searching={searchQuery.trim().length > 0} onCreate={() => setNewDialogOpen(true)} />
        )
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap gap-1">
            {STATUS_OPTIONS.map(option => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
                {option.value !== 'all' && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {workOrders.filter(order => order.status === option.value).length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {STATUS_OPTIONS.map(option => (
            <TabsContent key={option.value} value={option.value}>
              {filteredOrders.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredOrders.map(order => (
                    <WorkOrderCard
                      key={order.id}
                      order={order}
                      customers={customers}
                      items={lineItems[order.id] ?? []}
                      onClick={() => setDetailId(order.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyWorkOrders searching={searchQuery.trim().length > 0} onCreate={() => setNewDialogOpen(true)} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <NewWorkOrderDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} onSave={handleCreate} customers={customers} />
      <WorkOrderDetailDialog
        workOrder={detailOrder}
        lineItems={currentLineItems}
        customers={customers}
        products={products}
        receipt={currentReceipt}
        onClose={() => setDetailId(null)}
        onStatusChange={handleStatusChange}
        onAddLineItem={handleAddLineItem}
        onRemoveLineItem={handleRemoveLineItem}
        onOpenPayment={() => setPaymentOpen(true)}
        onViewReceipt={() => currentReceipt && showReceipt(currentReceipt, 'Receipt')}
      />
      <WorkOrderPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        workOrder={detailOrder}
        lineItems={currentLineItems}
        onPaid={handlePayment}
      />
      <Dialog open={!!activeReceipt} onOpenChange={open => { if (!open) setActiveReceipt(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{receiptTitle}</DialogTitle>
            <DialogDescription>Demo receipt for this work order. Printing uses the browser print dialog.</DialogDescription>
          </DialogHeader>
          {activeReceipt && (
            <ServiceReceiptView
              receipt={activeReceipt}
              onDone={() => setActiveReceipt(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
