import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import WorkOrdersPage from '@/app/(dashboard)/work-orders/page'
import SettingsPage from '@/app/(dashboard)/settings/page'
import { mockCustomers, mockProducts, mockTransactions, mockWorkOrders } from '@/lib/demo/mock-data'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/work-orders',
}))

beforeEach(() => localStorage.clear())

it('charges a ready work order at the tax rate saved in settings', async () => {
  const order = {
    ...mockWorkOrders[0],
    id: 'wo-tax',
    work_order_number: 'WO-TAX',
    status: 'ready',
    labor_estimate: 50,
    parts_estimate: 0,
    intake_notes: 'Tax check',
  }
  localStorage.setItem('bikesuite_settings', JSON.stringify({ taxRate: '10' }))
  localStorage.setItem('bikesuite_work_orders', JSON.stringify([order]))
  localStorage.setItem('bikesuite_customers', JSON.stringify(mockCustomers))
  localStorage.setItem('bikesuite_products', JSON.stringify(mockProducts))
  localStorage.setItem('bikesuite_transactions', JSON.stringify(mockTransactions))

  render(<WorkOrdersPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Open WO-TAX/ }))
  fireEvent.click(await screen.findByRole('button', { name: /Collect Payment/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Record card payment of $55.00' }))
  expect(await screen.findByRole('heading', { name: 'Payment recorded' })).toBeTruthy()
  expect(document.getElementById('service-receipt')?.textContent).toMatch(/\$55\.00/)
  await waitFor(() => {
    const transactions = JSON.parse(localStorage.getItem('bikesuite_transactions') || '[]') as { total: number; tax_rate: number }[]
    expect(transactions[0]).toMatchObject({ total: 55, tax_rate: 0.1 })
  })
})

it('asks before resetting demo data', () => {
  localStorage.setItem('bikesuite_settings', JSON.stringify({ taxRate: '10' }))
  render(<SettingsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Reset demo data' }))
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(localStorage.getItem('bikesuite_settings')).toContain('10')
})
