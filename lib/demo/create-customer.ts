import type { Customer } from '@/lib/types/database'

export type CustomerDraft = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
}

function blank(value: string | undefined) {
  return value?.trim() || null
}

// Same record the Customers page saves: demo-org, trimmed names, empty contacts as null,
// and zero spend until a sale changes them.
export function createCustomer(draft: CustomerDraft, now = new Date(), existing?: Customer): Customer {
  const firstName = draft.firstName.trim()
  const lastName = draft.lastName.trim()
  if (!firstName || !lastName) throw new Error('Enter a first and last name.')
  const iso = now.toISOString()
  return {
    id: existing?.id ?? `cust-${now.getTime()}`,
    organization_id: 'demo-org',
    first_name: firstName,
    last_name: lastName,
    email: blank(draft.email),
    phone: blank(draft.phone),
    address: blank(draft.address),
    city: blank(draft.city),
    state: blank(draft.state),
    zip: blank(draft.zip),
    notes: blank(draft.notes),
    total_spent: existing?.total_spent ?? 0,
    visit_count: existing?.visit_count ?? 0,
    last_visit: existing?.last_visit ?? null,
    created_at: existing?.created_at ?? iso,
    updated_at: iso,
  }
}
