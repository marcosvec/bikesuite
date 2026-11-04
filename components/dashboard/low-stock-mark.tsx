'use client'

import { lowStockParts } from '@/lib/demo/reports'
import { useDemoStore } from '@/lib/demo/use-demo-store'

export function useLowStockCount() {
  const { products } = useDemoStore()
  return lowStockParts(products).length
}

export function LowStockMark() {
  const count = useLowStockCount()
  if (!count) return null
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-black">
      {count}
    </span>
  )
}
