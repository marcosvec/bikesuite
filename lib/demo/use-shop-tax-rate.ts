'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_SHOP_TIME_ZONE, DEFAULT_TAX_RATE, readShopTaxRate, readShopTimeZone, SETTINGS_CHANGED_EVENT } from '@/lib/demo/shop-settings'

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

export function useShopTimeZone() {
  const [timeZone, setTimeZone] = useState(DEFAULT_SHOP_TIME_ZONE)

  useEffect(() => {
    const load = () => setTimeZone(readShopTimeZone())
    load()
    window.addEventListener('storage', load)
    window.addEventListener(SETTINGS_CHANGED_EVENT, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, load)
    }
  }, [])

  return timeZone
}
