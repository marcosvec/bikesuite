import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import CheckInPage from '@/app/(dashboard)/check-in/page'
import { mockWorkOrders } from '@/lib/demo/mock-data'

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
})
