import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import AppointmentsPage from '@/app/(dashboard)/appointments/page'
import InventoryPage from '@/app/(dashboard)/inventory/page'
import ReportsPage from '@/app/(dashboard)/reports/page'
import { lowStockParts } from '@/lib/demo/reports'
import { mockProducts } from '@/lib/demo/mock-data'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))

beforeEach(() => localStorage.clear())

it('checks a booked drop-off in as an Intake work order', async () => {
  render(<AppointmentsPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Check in Marco Pedalini' }))
  await waitFor(() => {
    const orders = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]') as { status: string; intake_notes: string | null }[]
    const created = orders.find(order => order.intake_notes?.includes('Scheduled drop-off'))
    expect(created?.status).toBe('intake')
  })
  expect(await screen.findByRole('link', { name: 'Intake work order' })).toBeTruthy()
})

it('shows demo revenue, services, and parts to reorder', async () => {
  render(<ReportsPage />)
  expect(await screen.findByRole('heading', { name: 'Revenue by day' })).toBeTruthy()
  expect(screen.getByText('2026-02-10')).toBeTruthy()
  expect(screen.getByText('Basic Tune-Up')).toBeTruthy()
  expect(screen.getByText('Handlebar Tape - Cork')).toBeTruthy()
  expect(screen.getByText('1.5 days')).toBeTruthy()
})

it('shows a low-stock badge on inventory', async () => {
  render(<InventoryPage />)
  const count = lowStockParts(mockProducts).length
  expect(await screen.findByRole('button', { name: `${count} parts to reorder` })).toBeTruthy()
})
