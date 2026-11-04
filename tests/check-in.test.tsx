import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import CheckInPage from '@/app/(dashboard)/check-in/page'
import CustomersPage from '@/app/(dashboard)/customers/page'
import { formatPromisedPickup } from '@/lib/demo/create-work-order'
import { mockCustomers, mockWorkOrders } from '@/lib/demo/mock-data'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))

beforeEach(() => localStorage.clear())

it('lists bikes still in the shop and hides finished orders', async () => {
  localStorage.setItem('bikesuite_work_orders', JSON.stringify([
    { ...mockWorkOrders[0], id: 'wo-open', work_order_number: 'WO-OPEN', status: 'intake', intake_notes: 'Still here' },
    { ...mockWorkOrders[0], id: 'wo-ready', work_order_number: 'WO-READY', status: 'ready', intake_notes: 'At the counter' },
    { ...mockWorkOrders[0], id: 'wo-gone', work_order_number: 'WO-GONE', status: 'picked_up', intake_notes: 'Already gone' },
    { ...mockWorkOrders[0], id: 'wo-done', work_order_number: 'WO-DONE', status: 'completed', intake_notes: 'Finished' },
  ]))
  render(<CheckInPage />)
  expect(await screen.findByText('WO-OPEN')).toBeTruthy()
  expect(screen.getByText('WO-READY')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Ready for pickup' })).toBeTruthy()
  expect(screen.queryByText('WO-GONE')).toBeNull()
  expect(screen.queryByText('WO-DONE')).toBeNull()
})

it('requires a bike description before saving', async () => {
  render(<CheckInPage />)
  await screen.findByText('WO-2026-001')
  const before = localStorage.getItem('bikesuite_work_orders')
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect(screen.getByRole('alert').textContent).toMatch(/bike description/i)
  expect(screen.queryByRole('status')).toBeNull()
  expect(localStorage.getItem('bikesuite_work_orders')).toBe(before)
})

it('checks in a walk-in bike and starts work immediately when that setting is on', async () => {
  localStorage.setItem('bikesuite_settings', JSON.stringify({ assumeImmediateWork: true }))
  render(<CheckInPage />)
  fireEvent.change(screen.getByLabelText('Bike description'), { target: { value: 'Blue Trek FX' } })
  fireEvent.change(screen.getByLabelText('Problem'), { target: { value: 'Flat rear tire' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect((await screen.findByRole('status')).textContent).toMatch(/Checked in WO-/)
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]')
    const created = saved.find((order: { intake_notes: string | null }) => order.intake_notes === 'Blue Trek FX — Flat rear tire')
    expect(created).toMatchObject({ status: 'in_progress', customer_id: null, priority: 'normal' })
  })
  expect(screen.getByText('Blue Trek FX — Flat rear tire')).toBeTruthy()
  const saved = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]')
  const created = saved.find((order: { intake_notes: string | null }) => order.intake_notes === 'Blue Trek FX — Flat rear tire')
  expect(created.estimated_completion).toBeNull()
})

it('saves a new customer in the Customers store and an optional pickup time', async () => {
  const view = render(<CheckInPage />)
  await screen.findByText('WO-2026-001')
  fireEvent.click(screen.getByRole('button', { name: 'New customer' }))
  fireEvent.change(screen.getByLabelText('Bike description'), { target: { value: 'Green Marin' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect(screen.getByRole('alert').textContent).toMatch(/first and last name/i)

  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rae' } })
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Dropoff' } })
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '555-0100' } })
  fireEvent.change(screen.getByLabelText('Promised pickup'), { target: { value: '2026-11-05T16:30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect((await screen.findByRole('status')).textContent).toMatch(/Checked in WO-/)
  const pickup = new Date('2026-11-05T16:30').toISOString()
  await waitFor(() => {
    const customers = JSON.parse(localStorage.getItem('bikesuite_customers') || '[]')
    const orders = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]')
    const customer = customers.find((item: { first_name: string }) => item.first_name === 'Rae')
    const order = orders.find((item: { intake_notes: string | null }) => item.intake_notes === 'Green Marin')
    expect(customer).toMatchObject({ last_name: 'Dropoff', phone: '555-0100', organization_id: 'demo-org', total_spent: 0, visit_count: 0 })
    expect(order).toMatchObject({ customer_id: customer.id, estimated_completion: pickup })
  })
  expect(screen.getByText(`Promised pickup ${formatPromisedPickup(pickup)}`)).toBeTruthy()
  expect(screen.getAllByText('Rae Dropoff').length).toBeGreaterThan(1)
  view.unmount()
  render(<CustomersPage />)
  expect(await screen.findByText('Rae Dropoff')).toBeTruthy()
  expect(screen.getByText('555-0100')).toBeTruthy()
})

it('lets check-in pick a customer already saved from Customers', async () => {
  localStorage.setItem('bikesuite_customers', JSON.stringify([
    { ...mockCustomers[0], id: 'cust-ada', first_name: 'Ada', last_name: 'Lovelace' },
  ]))
  render(<CheckInPage />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Customer' }))
  await user.click(await screen.findByRole('option', { name: 'Ada Lovelace' }))
  fireEvent.change(screen.getByLabelText('Bike description'), { target: { value: 'Silver mixte' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  await waitFor(() => {
    const orders = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]')
    const order = orders.find((item: { intake_notes: string | null }) => item.intake_notes === 'Silver mixte')
    expect(order.customer_id).toBe('cust-ada')
  })
  expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(1)
})
