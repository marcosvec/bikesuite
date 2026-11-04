import type { WorkOrder } from '@/lib/types/database'

export type WorkOrderDraft = {
  customerId: string
  bikeDescription: string
  intakeNotes: string
  priority: WorkOrder['priority']
  laborEstimate?: string
  partsEstimate?: string
  promisedPickup?: string
}

export function formatPromisedPickup(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function promisedPickup(value: string | undefined) {
  if (!value?.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid pickup time, or leave it blank.')
  return date.toISOString()
}

function money(value: string | undefined) {
  const amount = parseFloat(value ?? '')
  return amount || 0
}

function assumeImmediateWork() {
  try {
    const raw = localStorage.getItem('bikesuite_settings')
    return raw ? !!JSON.parse(raw).assumeImmediateWork : false
  } catch {
    return false
  }
}

// Bike text is stored in intake_notes. WorkOrder has no separate bike field;
// the work-order dialog uses the same "bike — notes" shape.
export function createWorkOrder(draft: WorkOrderDraft, now = new Date()): WorkOrder {
  const bike = draft.bikeDescription
  if (!bike.trim()) throw new Error('Enter a bike description.')
  const notes = [bike, draft.intakeNotes].filter(Boolean).join(' — ')
  const iso = now.toISOString()
  return {
    id: `wo-${now.getTime()}`,
    organization_id: 'demo-org',
    location_id: 'loc-001',
    customer_id: !draft.customerId || draft.customerId === 'walk-in' ? null : draft.customerId,
    customer_bike_id: null,
    assigned_to: null,
    work_order_number: `WO-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`,
    status: assumeImmediateWork() ? 'in_progress' : 'intake',
    priority: draft.priority,
    intake_notes: notes,
    diagnosis_notes: null,
    internal_notes: null,
    estimated_completion: promisedPickup(draft.promisedPickup),
    labor_estimate: money(draft.laborEstimate),
    parts_estimate: money(draft.partsEstimate),
    actual_labor: 0,
    actual_parts: 0,
    created_at: iso,
    updated_at: iso,
    completed_at: null,
  }
}
