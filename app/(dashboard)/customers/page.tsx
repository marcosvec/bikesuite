'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Search, Plus, MoreHorizontal, Users, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import type { Customer } from '@/lib/types/database'
import { mockCustomers } from '@/lib/demo/mock-data'
import { usePersistentState } from '@/lib/demo/use-persistent-state'

// ── Animated underline input ──────────────────────────────────────────────────

function AnimatedInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  autoFocus,
  className,
}: {
  id: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  maxLength?: number
  autoFocus?: boolean
  className?: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className={cn(
          'peer w-full border-0 border-b border-border/50 bg-transparent px-1 py-2.5 text-sm',
          'text-foreground placeholder:text-muted-foreground/40 focus:outline-none',
          'transition-colors duration-150 hover:bg-muted/20 rounded-none',
          className
        )}
      />
      {/* Animated focus line */}
      <span className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 peer-focus:w-full" />
    </div>
  )
}

// ── Types / helpers ───────────────────────────────────────────────────────────

type CustomerForm = {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
}

const emptyForm: CustomerForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
}

function customerToForm(c: Customer): CustomerForm {
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    zip: c.zip ?? '',
    notes: c.notes ?? '',
  }
}

function formToCustomer(form: CustomerForm, existing?: Customer): Customer {
  const now = new Date().toISOString()
  return {
    id: existing?.id ?? `cust-${Date.now()}`,
    organization_id: 'demo-org',
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    zip: form.zip.trim() || null,
    notes: form.notes.trim() || null,
    total_spent: existing?.total_spent ?? 0,
    visit_count: existing?.visit_count ?? 0,
    last_visit: existing?.last_visit ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
}

// ── Customer form dialog (add & edit) ─────────────────────────────────────────

function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customer: Customer | null
  onSave: (c: Customer) => void
}) {
  const [form, setForm] = useState<CustomerForm>(emptyForm)

  // Re-initialize form every time the dialog opens or switches to a different customer
  useEffect(() => {
    if (open) setForm(customer ? customerToForm(customer) : emptyForm)
  }, [open, customer])

  function set(field: keyof CustomerForm, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) return
    onSave(formToCustomer(form, customer ?? undefined))
    onOpenChange(false)
  }

  const isEditing = !!customer

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `${customer.first_name} ${customer.last_name}` : 'New Customer'}
          </DialogTitle>
          {/* Stats strip when editing */}
          {isEditing && (
            <div className="flex gap-5 pt-1.5">
              <div>
                <p className="text-lg font-bold leading-none">${customer.total_spent.toFixed(0)}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">Spent</p>
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{customer.visit_count}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">Visits</p>
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">
                  {customer.last_visit
                    ? new Date(customer.last_visit).toLocaleDateString()
                    : 'Never'}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">Last Visit</p>
              </div>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-5 py-2">
            {/* First name */}
            <div>
              <label
                htmlFor="first_name"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                First Name <span className="text-destructive">*</span>
              </label>
              <AnimatedInput
                id="first_name"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Last name */}
            <div>
              <label
                htmlFor="last_name"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                Last Name <span className="text-destructive">*</span>
              </label>
              <AnimatedInput
                id="last_name"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                Email
              </label>
              <AnimatedInput
                id="email"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="customer@email.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                Phone
              </label>
              <AnimatedInput
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label
                htmlFor="address"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                Street Address
              </label>
              <AnimatedInput
                id="address"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            {/* City */}
            <div>
              <label
                htmlFor="city"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                City
              </label>
              <AnimatedInput
                id="city"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
            </div>

            {/* State + ZIP */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="state"
                  className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
                >
                  State
                </label>
                <AnimatedInput
                  id="state"
                  value={form.state}
                  onChange={e => set('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="OR"
                />
              </div>
              <div>
                <label
                  htmlFor="zip"
                  className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
                >
                  ZIP
                </label>
                <AnimatedInput
                  id="zip"
                  value={form.zip}
                  onChange={e => set('zip', e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label
                htmlFor="notes"
                className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase tracking-wider"
              >
                Notes
              </label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="resize-none text-sm"
                placeholder="Preferred contact method, bike preferences…"
              />
            </div>
          </div>

          <Separator className="my-4" />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Add Customer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = usePersistentState<Customer[]>('bikesuite_customers', mockCustomers)
  const [searchQuery, setSearchQuery] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  })

  function handleSave(c: Customer) {
    setCustomers(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      return idx >= 0 ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]
    })
  }

  function handleDelete(c: Customer) {
    setCustomers(prev => prev.filter(x => x.id !== c.id))
    setDeleteTarget(null)
  }

  function openAdd() {
    setEditingCustomer(null)
    setFormDialogOpen(true)
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c)
    setFormDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage your customer database</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search customers…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filteredCustomers.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-center">Visits</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map(customer => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(customer)}
                >
                  <TableCell className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone ?? '—'}</TableCell>
                  <TableCell className="text-right">${customer.total_spent.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{customer.visit_count}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.last_visit
                      ? new Date(customer.last_visit).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(customer)}>
                          <Edit className="mr-2 size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(customer)}
                        >
                          <Trash2 className="mr-2 size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="text-muted-foreground mb-4 size-12" />
          <h3 className="mb-1 text-lg font-semibold">No customers found</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {searchQuery ? 'Try a different search.' : 'Click "Add Customer" to get started.'}
          </p>
          {!searchQuery && (
            <Button onClick={openAdd}>
              <Plus className="mr-2 size-4" /> Add Customer
            </Button>
          )}
        </div>
      )}

      {/* Form dialog — handles both add and edit */}
      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        customer={editingCustomer}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
