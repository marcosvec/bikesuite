import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import CheckInPage from '@/app/(dashboard)/check-in/page'
import CustomersPage from '@/app/(dashboard)/customers/page'
import WorkOrdersPage from '@/app/(dashboard)/work-orders/page'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))

beforeEach(() => localStorage.clear())

function storedOrders() {
  return JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]') as { intake_notes: string | null }[]
}

function storedCustomers() {
  return JSON.parse(localStorage.getItem('bikesuite_customers') || '[]') as { first_name: string; last_name: string; phone: string | null }[]
}

it('keeps a new work order after the page hydrates again', async () => {
  const view = render(<WorkOrdersPage />)
  await screen.findByText('WO-2026-001')
  fireEvent.click(screen.getByRole('button', { name: 'New Work Order' }))
  fireEvent.change(screen.getByLabelText(/Bike Description/i), { target: { value: 'Blue Trek FX' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Work Order' }))
  expect(await screen.findByText('Blue Trek FX')).toBeTruthy()
  await waitFor(() => expect(storedOrders().some(order => order.intake_notes === 'Blue Trek FX')).toBe(true))
  view.unmount()

  render(<WorkOrdersPage />)
  expect(await screen.findByText('Blue Trek FX')).toBeTruthy()
  expect(storedOrders().some(order => order.intake_notes === 'Blue Trek FX')).toBe(true)
})

it('keeps a check-in customer after both pages hydrate again', async () => {
  const view = render(<CheckInPage />)
  await screen.findByText('WO-2026-001')
  fireEvent.click(screen.getByRole('button', { name: 'New customer' }))
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rae' } })
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Dropoff' } })
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '555-0100' } })
  fireEvent.change(screen.getByLabelText('Bike description'), { target: { value: 'Green Marin' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect((await screen.findByRole('status')).textContent).toMatch(/Checked in WO-/)
  await waitFor(() => expect(storedCustomers().some(customer => customer.first_name === 'Rae' && customer.phone === '555-0100')).toBe(true))
  view.unmount()

  const again = render(<CheckInPage />)
  expect((await screen.findAllByText('Rae Dropoff')).length).toBeGreaterThan(0)
  again.unmount()

  render(<CustomersPage />)
  expect(await screen.findByText('Rae Dropoff')).toBeTruthy()
  expect(screen.getByText('555-0100')).toBeTruthy()
  expect(storedCustomers().some(customer => customer.first_name === 'Rae' && customer.last_name === 'Dropoff')).toBe(true)
})
