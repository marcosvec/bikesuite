import { SETTINGS_STORAGE_KEY } from '@/lib/demo/storage-keys'

export const DEFAULT_TAX_PERCENT = 8
export const DEFAULT_TAX_RATE = DEFAULT_TAX_PERCENT / 100
export const DEFAULT_SHOP_TIME_ZONE = 'America/New_York'
export const SETTINGS_CHANGED_EVENT = 'bikesuite-settings'

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function formatTaxPercent(rate: number) {
  return String(Number((rate * 100).toFixed(2)))
}

export function parseTaxPercent(value: unknown): number | null {
  const percent = typeof value === 'number' ? value : parseFloat(String(value ?? '').trim())
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null
  return roundMoney(percent)
}

export function taxRateFromSettings(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_TAX_RATE
  try {
    const parsed = JSON.parse(raw) as { taxRate?: unknown }
    const percent = parseTaxPercent(parsed.taxRate)
    return percent === null ? DEFAULT_TAX_RATE : percent / 100
  } catch {
    return DEFAULT_TAX_RATE
  }
}

export function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function shopTimeZoneFromSettings(raw: string | null | undefined) {
  if (!raw) return DEFAULT_SHOP_TIME_ZONE
  try {
    const parsed = JSON.parse(raw) as { timeZone?: unknown }
    const zone = typeof parsed.timeZone === 'string' ? parsed.timeZone.trim() : ''
    return zone && isValidTimeZone(zone) ? zone : DEFAULT_SHOP_TIME_ZONE
  } catch {
    return DEFAULT_SHOP_TIME_ZONE
  }
}

export function readShopTimeZone(): string {
  if (typeof window === 'undefined') return DEFAULT_SHOP_TIME_ZONE
  try {
    return shopTimeZoneFromSettings(window.localStorage.getItem(SETTINGS_STORAGE_KEY))
  } catch {
    return DEFAULT_SHOP_TIME_ZONE
  }
}

export function readShopTaxRate(): number {
  if (typeof window === 'undefined') return DEFAULT_TAX_RATE
  try {
    return taxRateFromSettings(window.localStorage.getItem(SETTINGS_STORAGE_KEY))
  } catch {
    return DEFAULT_TAX_RATE
  }
}

export function saleTax(subtotal: number, rate: number) {
  return roundMoney(subtotal * rate)
}

export function notifyShopSettingsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))
}
