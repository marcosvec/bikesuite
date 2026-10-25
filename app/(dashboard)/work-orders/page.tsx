'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Search, Plus, Wrench, Clock, User, ChevronRight, Check,
  Trash2, CreditCard, Banknote, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
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
import { usePersistentState } from '@/lib/demo/use-persistent-state'
import { useDemoStore } from '@/lib/demo/use-demo-store'

// ── Types / constants ─────────────────────────────────────────────────────────

const TAX_RATE = 0.08

export type WOLineItem = {
  id:           string
  type:         'labor' | 'part'
  product_id:   string | null   // linked to inventory
  name:         string
  quantity:     number
  unit_price:   number
  total:        number
}

const STATUS_OPTIONS = [
  { value: 'all',           label: 'All' },
  { value: 'intake',        label: 'Intake' },
  { value: 'in_progress',   label: 'In Progress' },
  { value: 'waiting_parts', label: 'Waiting Parts' },
  { value: 'ready',         label: 'Ready' },
  { value: 'completed',     label: 'Completed' },
] as const

type StatusFilter    = (typeof STATUS_OPTIONS)[number]['value']
type WorkOrderStatus = Exclude<StatusFilter, 'all'>

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  intake:        'in_progress',
  in_progress:   'waiting_parts',
  waiting_parts: 'in_progress',
  ready:         'completed',
  completed:     null,
}

const STATUS_NEXT_LABEL: Record<WorkOrderStatus, string> = {
  intake:        'Start Work',
  in_progress:   'Waiting on Parts',
  waiting_parts: 'Resume Work',
  ready:         'Mark Completed',
  completed:     '',
}

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

function formatStatus(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function getCustomerName(customerId: string | null, customers: { id: string; first_name: string; last_name: string }[] = []) {
  if (!customerId) return 'Walk-in'
  const c = customers.find(x => x.id === customerId)
  return c ? `${c.first_name} ${c.last_name}` : 'Unknown'
}

function getStock(p: Product): number | null {
  return p.is_service ? null : (p.inventory?.[0]?.quantity ?? 0)
}

// ── Product search combobox ───────────────────────────────────────────────────
// Shows service products for "labor" type, physical products for "part" type.
// Auto-fills price on select; shows stock badge for parts.

function ProductSearchInput({
  type,
  selectedName,
  onSelect,
}: {
  type:         'labor' | 'part'
  selectedName: string
  onSelect:     (p: Product) => void
}) {
  const { products } = useDemoStore()
  const [query, setQuery] = useState(selectedName)
  const [open,  setOpen]  = useState(false)
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

  return (
    // Use Radix Popover + PopoverAnchor so the dropdown is portalled to <body>
    // and won't be clipped by the dialog's overflow-y-auto scroll container.
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={anchorRef}
          className="h-8 text-xs"
          placeholder={type === 'labor' ? 'Search services…' : 'Search inventory…'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}   // reopen if focus was kept but popover was closed
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
        <div className="max-h-44 overflow-y-auto">
          {options.length > 0 ? options.map(p => {
            const stock = getStock(p)
            return (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                onMouseDown={e => {
                  e.preventDefault()       // keep focus on the Input
                  onSelect(p)
                  setOpen(false)
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
    <div className="flex items-start">
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
  open, onOpenChange, onSave,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onSave: (wo: WorkOrder) => void
}) {
  const { customers } = useDemoStore()
  const [form, setForm] = useState<NewWOForm>(emptyWOForm)
  useEffect(() => { if (open) setForm(emptyWOForm) }, [open])

  function set<K extends keyof NewWOForm>(key: K, value: NewWOForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bikeDescription.trim()) return

    // Read "Assume Immediate Work" from localStorage settings
    let assumeImmediate = false
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('bikesuite_settings') : null
      if (raw) assumeImmediate = !!JSON.parse(raw).assumeImmediateWork
    } catch { /* use default */ }

    const now = new Date().toISOString()
    const num = `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    const wo: WorkOrder = {
      id: `wo-${Date.now()}`, organization_id: 'demo-org', location_id: 'loc-001',
      customer_id: form.customerId === 'walk-in' ? null : form.customerId || null, customer_bike_id: null,
      work_order_number: num,
      status: assumeImmediate ? 'in_progress' : 'intake',
      priority: form.priority,
      intake_notes: [form.bikeDescription, form.intakeNotes].filter(Boolean).join(' — ') || null,
      diagnosis_notes: null, internal_notes: null, estimated_completion: null,
      labor_estimate: parseFloat(form.laborEstimate) || 0,
      parts_estimate: parseFloat(form.partsEstimate) || 0,
      actual_labor: 0, actual_parts: 0, completed_at: null,
      created_at: now, updated_at: now, assigned_to: null,
    }
    onSave(wo)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
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
  const [paid, setPaid]     = useState(false)
  const [method, setMethod] = useState<'cash' | 'card' | null>(null)
  useEffect(() => { if (open) { setPaid(false); setMethod(null) } }, [open])
  if (!workOrder) return null

  const laborTotal = lineItems.filter(i => i.type === 'labor').reduce((s, i) => s + i.total, 0) || workOrder.labor_estimate
  const partsTotal = lineItems.filter(i => i.type === 'part').reduce((s, i) => s + i.total, 0)  || workOrder.parts_estimate
  const subtotal   = laborTotal + partsTotal
  const tax        = subtotal * TAX_RATE
  const total      = subtotal + tax

  function handlePay(m: 'cash' | 'card') {
    setMethod(m); setPaid(true); onPaid(m)
    setTimeout(() => onOpenChange(false), 1800)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && !paid && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
        {paid ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle2 className="size-9 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-semibold">Payment Received</p>
            <p className="text-muted-foreground text-sm capitalize">{method} · ${total.toFixed(2)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {workOrder.work_order_number}
              </p>
              {lineItems.length > 0 ? lineItems.map(item => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.name}
                  </span>
                  <span className="shrink-0">${item.total.toFixed(2)}</span>
                </div>
              )) : (
                <>
                  {laborTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Labor</span><span>${laborTotal.toFixed(2)}</span></div>}
                  {partsTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Parts</span><span>${partsTotal.toFixed(2)}</span></div>}
                </>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <p className="text-center text-sm text-muted-foreground">Select payment method</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex-col gap-1.5 hover:bg-green-50 hover:border-green-400 dark:hover:bg-green-900/30" onClick={() => handlePay('cash')}>
                <Banknote className="size-5" /><span className="text-sm font-medium">Cash</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-900/30" onClick={() => handlePay('card')}>
                <CreditCard className="size-5" /><span className="text-sm font-medium">Card</span>
              </Button>
            </div>
          </div>
        )}
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
  workOrder, lineItems, onClose, onStatusChange, onMarkReady,
  onAddLineItem, onRemoveLineItem, onOpenPayment,
}: {
  workOrder:        WorkOrder | null
  lineItems:        WOLineItem[]
  onClose:          () => void
  onStatusChange:   (id: string, status: WorkOrderStatus) => void
  onMarkReady:      (id: string) => void
  onAddLineItem:    (woId: string, item: WOLineItem) => void
  onRemoveLineItem: (woId: string, itemId: string) => void
  onOpenPayment:    () => void
}) {
  const { customers, products } = useDemoStore()
  const [addForm,      setAddForm]      = useState<AddLineItemForm>(emptyLineItemForm)
  const [showAddForm,  setShowAddForm]  = useState(false)

  useEffect(() => {
    if (!workOrder) { setShowAddForm(false); setAddForm(emptyLineItemForm) }
  }, [workOrder])

  if (!workOrder) return null

  const status     = workOrder.status as WorkOrderStatus
  const nextStatus = STATUS_TRANSITIONS[status]

  const laborItems = lineItems.filter(i => i.type === 'labor')
  const partItems  = lineItems.filter(i => i.type === 'part')
  const laborTotal = laborItems.reduce((s, i) => s + i.total, 0) || workOrder.labor_estimate
  const partsTotal = partItems.reduce((s, i) => s + i.total, 0)  || workOrder.parts_estimate
  const subtotal   = laborTotal + partsTotal
  const tax        = subtotal * TAX_RATE
  const total      = subtotal + tax

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
    setAddForm({ ...emptyLineItemForm, type: newType })
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const qty   = parseFloat(addForm.quantity)   || 1
    const price = parseFloat(addForm.unit_price) || 0
    if (!addForm.product_id || !addForm.name || price <= 0) return

    // Warn if part is out of stock (soft warning — still allows adding for now)
    const product = products.find(p => p.id === addForm.product_id)
    const stock   = product ? getStock(product) : null
    if (addForm.type === 'part' && stock === 0) {
      // Could show a toast here — for now just allow it (backorder scenario)
    }

    const item: WOLineItem = {
      id:         `li-${Date.now()}`,
      type:       addForm.type,
      product_id: addForm.product_id,
      name:       addForm.name,
      quantity:   qty,
      unit_price: price,
      total:      Math.round(qty * price * 100) / 100,
    }
    onAddLineItem(workOrder!.id, item)
    setAddForm(f => ({ ...emptyLineItemForm, type: f.type }))
    setShowAddForm(false)
  }

  // Stock badge for a selected product
  const selectedProduct  = addForm.product_id ? products.find(p => p.id === addForm.product_id) : null
  const selectedStock    = selectedProduct ? getStock(selectedProduct) : null

  return (
    <Dialog open={!!workOrder} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span>{workOrder.work_order_number}</span>
            <Badge variant="outline" className={priorityColors[workOrder.priority]}>
              {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}
            </Badge>
          </DialogTitle>
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
              <p className="font-medium">{getCustomerName(workOrder.customer_id, customers)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{new Date(workOrder.created_at).toLocaleDateString()}</p>
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
              {status !== 'completed' && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => setShowAddForm(v => !v)}>
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
                    <Label className="text-xs">Type</Label>
                    <Select value={addForm.type} onValueChange={v => handleTypeChange(v as 'labor' | 'part')}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Labor / Service</SelectItem>
                        <SelectItem value="part">Part / Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qty */}
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input className="h-8 text-xs" type="number" min="0.25" step="0.25"
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
                        onClick={() => setAddForm(f => ({ ...f, product_id: null, name: '', unit_price: '' }))}
                      >
                        change
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

                <Button type="submit" size="sm" className="h-7 w-full text-xs"
                  disabled={!addForm.product_id || !addForm.unit_price}>
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
                      <LineItemRow key={item.id} item={item}
                        onRemove={() => onRemoveLineItem(workOrder.id, item.id)} />
                    ))}
                  </>
                )}
                {partItems.length > 0 && (
                  <>
                    <p className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Parts</p>
                    {partItems.map(item => (
                      <LineItemRow key={item.id} item={item}
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

            {/* Totals */}
            {subtotal > 0 && (
              <div className="mt-3 space-y-1 rounded-md bg-muted/40 p-2.5 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            )}
          </div>

          {/* Status actions */}
          {status !== 'completed' && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2 pb-1">
                {nextStatus && status !== 'ready' && (
                  <Button size="sm" variant="outline"
                    onClick={() => { onStatusChange(workOrder.id, nextStatus); onClose() }}>
                    {STATUS_NEXT_LABEL[status]}
                    <ChevronRight className="ml-1 size-3.5" />
                  </Button>
                )}
                {status === 'in_progress' && (
                  <Button size="sm" variant="outline"
                    onClick={() => { onMarkReady(workOrder.id); onClose() }}>
                    Mark Ready for Pickup
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t pt-4">
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {status === 'ready' && (
              <Button className="bg-green-600 text-white hover:bg-green-700" onClick={onOpenPayment}>
                <CreditCard className="mr-2 size-4" />
                Collect Payment · ${total.toFixed(2)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Small sub-component to keep the detail dialog readable
function LineItemRow({ item, onRemove }: { item: WOLineItem; onRemove: () => void }) {
  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40">
      <span className="min-w-0 flex-1 truncate">
        {item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">${item.unit_price.toFixed(2)}/ea</span>
      <span className="min-w-[48px] shrink-0 text-right font-medium">${item.total.toFixed(2)}</span>
      <Button variant="ghost" size="icon"
        className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        onClick={onRemove}>
        <Trash2 className="size-3" />
      </Button>
    </div>
  )
}

// ── Work order card (gradient glow on hover) ──────────────────────────────────

function WorkOrderCard({ order, onClick }: { order: WorkOrder; onClick: () => void }) {
  const { customers } = useDemoStore()
  const total = (order.actual_labor || order.labor_estimate) + (order.actual_parts || order.parts_estimate)
  return (
    <div className="group relative rounded-xl">
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-(--card-glow-from) via-(--card-glow-via) to-(--card-glow-to) opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-[--card-glow-opacity]" />
      <Card className="relative cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" onClick={onClick}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{order.work_order_number}</CardTitle>
            <Badge variant="outline" className={priorityColors[order.priority]}>
              {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
            </Badge>
          </div>
          <Badge variant="outline" className={`w-fit ${statusColors[order.status]}`}>
            {formatStatus(order.status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <Separator />
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{getCustomerName(order.customer_id, customers)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 shrink-0" />
              <span>Created {new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {order.intake_notes && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{order.intake_notes}</p>
          )}
          {total > 0 && <p className="text-sm font-medium">${total.toFixed(2)}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const { customers, products, workOrders, setWorkOrders } = useDemoStore()
  const [lineItems, setLineItems] = usePersistentState<Record<string, WOLineItem[]>>('bikesuite_work_order_items', {})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab,   setActiveTab]   = useState('all')
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [detailOrder,   setDetailOrder]   = useState<WorkOrder | null>(null)
  const [paymentOpen,   setPaymentOpen]   = useState(false)

  function handleCreate(wo: WorkOrder) { setWorkOrders(prev => [wo, ...prev]) }

  function handleStatusChange(id: string, status: WorkOrderStatus) {
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status, updated_at: new Date().toISOString() } : wo))
  }

  function handleMarkReady(id: string) {
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status: 'ready', updated_at: new Date().toISOString() } : wo))
  }

  function handleAddLineItem(woId: string, item: WOLineItem) {
    setLineItems(prev => ({ ...prev, [woId]: [...(prev[woId] ?? []), item] }))
  }

  function handleRemoveLineItem(woId: string, itemId: string) {
    setLineItems(prev => ({ ...prev, [woId]: (prev[woId] ?? []).filter(i => i.id !== itemId) }))
  }

  function handlePayment(method: 'cash' | 'card') {
    if (!detailOrder) return
    const items      = lineItems[detailOrder.id] ?? []
    const laborTotal = items.filter(i => i.type === 'labor').reduce((s, i) => s + i.total, 0) || detailOrder.labor_estimate
    const partsTotal = items.filter(i => i.type === 'part').reduce((s, i) => s + i.total, 0)  || detailOrder.parts_estimate
    const now        = new Date().toISOString()
    setWorkOrders(prev => prev.map(wo =>
      wo.id === detailOrder.id
        ? { ...wo, status: 'completed', actual_labor: laborTotal, actual_parts: partsTotal, completed_at: now, updated_at: now }
        : wo
    ))
    setTimeout(() => { setPaymentOpen(false); setDetailOrder(null) }, 2000)
  }

  const filteredOrders = workOrders.filter(order => {
    const matchesTab    = activeTab === 'all' || order.status === activeTab
    const q             = searchQuery.toLowerCase()
    const matchesSearch = !q || order.work_order_number.toLowerCase().includes(q) ||
      order.intake_notes?.toLowerCase().includes(q) || getCustomerName(order.customer_id, customers).toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const currentLineItems = detailOrder ? (lineItems[detailOrder.id] ?? []) : []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground text-sm">Track and manage bike repairs and service</p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-2 size-4" /> New Work Order
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto flex-wrap gap-1">
            {STATUS_OPTIONS.map(o => (
              <TabsTrigger key={o.value} value={o.value}>
                {o.label}
                {o.value !== 'all' && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {workOrders.filter(w => w.status === o.value).length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search work orders…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {STATUS_OPTIONS.map(o => (
          <TabsContent key={o.value} value={o.value}>
            {filteredOrders.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map(order => (
                  <WorkOrderCard key={order.id} order={order} onClick={() => setDetailOrder(order)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <Wrench className="mb-4 size-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">No work orders</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery ? 'Try a different search.' : 'Click "New Work Order" to create one.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setNewDialogOpen(true)}>
                    <Plus className="mr-2 size-4" /> New Work Order
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <NewWorkOrderDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} onSave={handleCreate} />
      <WorkOrderDetailDialog
        workOrder={detailOrder} lineItems={currentLineItems}
        onClose={() => setDetailOrder(null)}
        onStatusChange={handleStatusChange} onMarkReady={handleMarkReady}
        onAddLineItem={handleAddLineItem} onRemoveLineItem={handleRemoveLineItem}
        onOpenPayment={() => setPaymentOpen(true)}
      />
      <WorkOrderPaymentDialog
        open={paymentOpen} onOpenChange={setPaymentOpen}
        workOrder={detailOrder} lineItems={currentLineItems}
        onPaid={handlePayment}
      />
    </div>
  )
}
