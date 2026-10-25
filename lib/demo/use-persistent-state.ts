'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initialValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        setValue(JSON.parse(stored) as T)
      }
    } catch {
      window.localStorage.removeItem(key)
    } finally {
      setHydrated(true)
    }
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [hydrated, key, value])

  return [value, setValue]
}
