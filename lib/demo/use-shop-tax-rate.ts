'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_TAX_RATE, readShopTaxRate, SETTINGS_CHANGED_EVENT } from '@/lib/demo/shop-settings'

export function useShopTaxRate() {
  const [rate, setRate] = useState(DEFAULT_TAX_RATE)

  useEffect(() => {
    const load = () => setRate(readShopTaxRate())
    load()
    window.addEventListener('storage', load)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [])

  return rate
}
