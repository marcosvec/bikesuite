import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import WorkOrdersPage from '@/app/(dashboard)/work-orders/page'
import { mockCustomers, mockProducts, mockTransactions, mockWorkOrders } from '@/lib/demo/mock-data'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('moves a bike across the status board and finds it by customer or diagnosis', async () => {
  render(<WorkOrdersPage />)
  expect(await screen.findByRole('heading', { name: /In Progress/ })).toBeTruthy()
  expect(screen.getByRole('region', { name: /In Progress/ }).textContent).toMatch(/WO-2026-001/)
  expect(screen.getByRole('region', { name: /Waiting on Parts/ }).textContent).toMatch(/WO-2026-002/)
  expect(screen.getByRole('region', { name: /Ready/ }).textContent).toMatch(/WO-2026-003/)

  fireEvent.click(screen.getByRole('button', { name: 'Mark ready for pickup for WO-2026-001' }))
  await waitFor(() => {
    expect(screen.getByRole('region', { name: /Ready/ }).textContent).toMatch(/WO-2026-001/)
  })
  const saved = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]') as { id: string; status: string }[]
  expect(saved.find(order => order.id === 'wo-001')?.status).toBe('ready')

  fireEvent.change(screen.getByLabelText('Search work orders'), { target: { value: 'Pedalini' } })
  expect(screen.getByText('WO-2026-001')).toBeTruthy()
  expect(screen.queryByText('WO-2026-002')).toBeNull()
  fireEvent.change(screen.getByLabelText('Search work orders'), { target: { value: 'worn' } })
  expect(screen.getByText('WO-2026-001')).toBeTruthy()
  expect(screen.queryByText('WO-2026-003')).toBeNull()
})

it('records a demo receipt, updates the customer, and can mark the bike picked up', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {})
  const order = {
    ...mockWorkOrders[0],
    id: 'wo-pay',
    work_order_number: 'WO-PAY',
    status: 'ready',
    labor_estimate: 50,
    parts_estimate: 0,
    intake_notes: 'Flat repair',
  }
  localStorage.setItem('bikesuite_work_orders', JSON.stringify([order]))
  localStorage.setItem('bikesuite_customers', JSON.stringify(mockCustomers))
  localStorage.setItem('bikesuite_products', JSON.stringify(mockProducts))
  localStorage.setItem('bikesuite_transactions', JSON.stringify(mockTransactions))

  render(<WorkOrdersPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Open WO-PAY, Marco Pedalini, Ready/ }))
  fireEvent.click(await screen.findByRole('button', { name: /Collect Payment/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Record card payment of $54.00' }))

  const receipt = await screen.findByRole('heading', { name: 'Payment recorded' })
  expect(receipt).toBeTruthy()
  expect(document.getElementById('service-receipt')?.textContent).toMatch(/Demo receipt — no payment was captured/)
  expect(document.getElementById('service-receipt')?.textContent).toMatch(/\$54\.00/)
  expect(document.getElementById('service-receipt')?.textContent).toMatch(/Marco Pedalini/)
  fireEvent.click(screen.getByRole('button', { name: 'Print receipt' }))
  expect(print).toHaveBeenCalledOnce()

  await waitFor(() => {
    const transactions = JSON.parse(localStorage.getItem('bikesuite_transactions') || '[]') as { notes: string; total: number }[]
    const customers = JSON.parse(localStorage.getItem('bikesuite_customers') || '[]') as { visit_count: number; total_spent: number }[]
    const receipts = JSON.parse(localStorage.getItem('bikesuite_receipts') || '[]') as { total: number }[]
    expect(transactions[0]).toMatchObject({ notes: 'Service receipt for WO-PAY', total: 54, status: 'completed' })
    expect(transactions).toHaveLength(mockTransactions.length + 1)
    expect(customers[0]).toMatchObject({ visit_count: 13, total_spent: 3303.97 })
    expect(receipts).toHaveLength(1)
  })

  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Mark picked up for WO-PAY' }))
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('bikesuite_work_orders') || '[]') as { status: string }[]
    expect(saved[0].status).toBe('picked_up')
  })
  expect(screen.queryByRole('button', { name: 'Mark picked up for WO-PAY' })).toBeNull()
  expect(screen.getByRole('region', { name: /Finished/ }).textContent).toMatch(/Picked Up/)
})

it('removes stock when a part is added and puts it back when the part is removed', async () => {
  render(<WorkOrdersPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Open WO-2026-001/ }))
  fireEvent.click(await screen.findByRole('button', { name: '+ Add Item' }))
  fireEvent.click(screen.getByLabelText('Type'))
  fireEvent.click(await screen.findByRole('option', { name: 'Part / Product' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Search inventory' }), { target: { value: 'Brake Pad' } })
  fireEvent.mouseDown(await screen.findByRole('option', { name: /Brake Pad Set - Disc/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Add to Work Order' }))

  expect(await screen.findByRole('button', { name: 'Remove Brake Pad Set - Disc' })).toBeTruthy()
  await waitFor(() => {
    const products = JSON.parse(localStorage.getItem('bikesuite_products') || '[]') as { id: string; inventory?: { quantity: number }[] }[]
    expect(products.find(product => product.id === 'prod-006')?.inventory?.[0].quantity).toBe(7)
  })

  fireEvent.click(screen.getByRole('button', { name: 'Remove Brake Pad Set - Disc' }))
  await waitFor(() => {
    const products = JSON.parse(localStorage.getItem('bikesuite_products') || '[]') as { id: string; inventory?: { quantity: number }[] }[]
    expect(products.find(product => product.id === 'prod-006')?.inventory?.[0].quantity).toBe(8)
  })
  expect(screen.queryByRole('button', { name: 'Remove Brake Pad Set - Disc' })).toBeNull()
})
