'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, MoreHorizontal, Package, Edit, Trash2, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type { Product } from '@/lib/types/database'
import { mockProducts, mockCategories } from '@/lib/demo/mock-data'
import { usePersistentState } from '@/lib/demo/use-persistent-state'

type StockStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

const statusFilters: { value: StockStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

function getStockStatus(product: Product): 'in_stock' | 'low_stock' | 'out_of_stock' {
  const qty = product.inventory?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const reorder = product.inventory?.[0]?.reorder_point ?? 0
  if (qty === 0) return 'out_of_stock'
  if (qty <= reorder) return 'low_stock'
  return 'in_stock'
}

function getTotalStock(product: Product): number {
  return product.inventory?.reduce((s, i) => s + i.quantity, 0) ?? 0
}

function StatusBadge({ status }: { status: ReturnType<typeof getStockStatus> }) {
  if (status === 'in_stock')
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">In Stock</Badge>
  if (status === 'low_stock')
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Low Stock</Badge>
  return <Badge variant="destructive">Out of Stock</Badge>
}

// ── Product form ──────────────────────────────────────────────────────────────

type ProductForm = {
  name: string
  sku: string
  categoryId: string
  basePrice: string
  cost: string
  stock: string
  reorderPoint: string
  isService: boolean
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  categoryId: '',
  basePrice: '',
  cost: '',
  stock: '',
  reorderPoint: '',
  isService: false,
}

function productToForm(p: Product): ProductForm {
  return {
    name: p.name,
    sku: p.sku ?? '',
    categoryId: p.category_id ?? '',
    basePrice: String(p.base_price),
    cost: String(p.cost),
    stock: String(getTotalStock(p)),
    reorderPoint: String(p.inventory?.[0]?.reorder_point ?? 5),
    isService: p.is_service,
  }
}

function formToProduct(form: ProductForm, existing?: Product, categories = mockCategories): Product {
  const now = new Date().toISOString()
  const category = categories.find(c => c.id === form.categoryId)
  return {
    id: existing?.id ?? `prod-${Date.now()}`,
    organization_id: 'demo-org',
    category_id: form.categoryId || null,
    brand_id: existing?.brand_id ?? null,
    name: form.name,
    description: existing?.description ?? null,
    sku: form.sku || null,
    barcode: existing?.barcode ?? null,
    base_price: parseFloat(form.basePrice) || 0,
    cost: parseFloat(form.cost) || 0,
    is_serialized: existing?.is_serialized ?? false,
    is_service: form.isService,
    is_active: true,
    image_url: null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    category: category ?? undefined,
    brand: existing?.brand ?? undefined,
    inventory: form.isService ? [] : [{
      id: existing?.inventory?.[0]?.id ?? `inv-${Date.now()}`,
      product_id: existing?.id ?? `prod-${Date.now()}`,
      variant_id: null,
      location_id: 'loc-001',
      quantity: parseInt(form.stock) || 0,
      reorder_point: parseInt(form.reorderPoint) || 5,
      reorder_quantity: existing?.inventory?.[0]?.reorder_quantity ?? 10,
      updated_at: now,
    }],
  }
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  product: Product | null
  onSave: (p: Product) => void
}) {
  const categories = mockCategories
  const [form, setForm] = useState<ProductForm>(product ? productToForm(product) : emptyForm)

  // Reset form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(product ? productToForm(product) : emptyForm)
    onOpenChange(v)
  }

  function set(field: keyof ProductForm, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(formToProduct(form, product ?? undefined, categories))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={e => set('sku', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={form.categoryId} onValueChange={v => set('categoryId', v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="basePrice">Price ($) *</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={e => set('basePrice', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={e => set('cost', e.target.value)}
              />
            </div>

            {!form.isService && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => set('stock', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    min="0"
                    value={form.reorderPoint}
                    onChange={e => set('reorderPoint', e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isService"
                checked={form.isService}
                onChange={e => set('isService', e.target.checked)}
                className="size-4 rounded"
              />
              <Label htmlFor="isService" className="cursor-pointer">This is a service (no inventory tracking)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{product ? 'Save Changes' : 'Add Product'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [products, setProducts] = usePersistentState<Product[]>('bikesuite_products', mockProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StockStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const filtered = products.filter((product) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matches =
        product.name.toLowerCase().includes(q) ||
        product.sku?.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q)
      if (!matches) return false
    }

    if (categoryFilter !== 'all') {
      const categoryMap: Record<string, string> = {
        bikes: 'Bicycles',
        parts: 'Components',
        accessories: 'Accessories',
        service: 'Service',
      }
      if (product.category?.name !== categoryMap[categoryFilter]) return false
    }

    if (statusFilter !== 'all') {
      if (product.is_service) return false
      if (getStockStatus(product) !== statusFilter) return false
    }

    return true
  })

  function handleSave(p: Product) {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]
    })
  }

  function handleDelete(p: Product) {
    setProducts(prev => prev.filter(x => x.id !== p.id))
    setDeleteTarget(null)
  }

  function openAdd() {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  function openEdit(p: Product) {
    setEditingProduct(p)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage your products, stock levels, and pricing.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="bikes">Bicycles</SelectItem>
            <SelectItem value="parts">Components</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {statusFilters.map(f => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" className="-ml-3 h-8">
                  Product Name <ArrowUpDown className="size-3.5" />
                </Button>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" className="-mr-3 h-8">
                  Price <ArrowUpDown className="size-3.5" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" className="-mr-3 h-8">
                  Stock <ArrowUpDown className="size-3.5" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-60">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No products found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                          ? 'Try adjusting your filters.'
                          : 'Click "Add Product" to get started.'}
                      </p>
                    </div>
                    {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
                      <Button variant="outline" size="sm" onClick={openAdd}>
                        <Plus className="size-4" /> Add Product
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(product => {
                const totalStock = getTotalStock(product)
                const stockStatus = getStockStatus(product)

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {product.sku ?? '—'}
                    </TableCell>
                    <TableCell>{product.category?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">${product.base_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${product.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.is_service ? '—' : totalStock}
                    </TableCell>
                    <TableCell>
                      {product.is_service ? (
                        <Badge variant="secondary">Service</Badge>
                      ) : (
                        <StatusBadge status={stockStatus} />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(product)}>
                            <Edit className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(product)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Dialogs */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
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
