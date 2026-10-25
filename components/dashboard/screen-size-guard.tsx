'use client'

import { useEffect, useState } from 'react'
import { MonitorX } from 'lucide-react'

// Minimum viewport dimensions for BikeSuite to be usable
const MIN_W = 768   // px — sidebar + content need at least this
const MIN_H = 540   // px — POS / Work Orders need vertical space

export function ScreenSizeGuard() {
  // Start hidden to avoid hydration mismatch (useEffect is client-only)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    function measure() {
      setDims({ w: window.innerWidth, h: window.innerHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Hidden on SSR and while not yet measured
  if (!dims) return null

  const tooNarrow = dims.w < MIN_W
  const tooShort  = dims.h < MIN_H
  if (!tooNarrow && !tooShort) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background px-8 text-center">

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-sm font-bold select-none">
          BS
        </div>
        <span className="text-lg font-semibold tracking-tight">BikeSuite</span>
      </div>

      {/* Icon */}
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
        <MonitorX className="size-9 text-muted-foreground" />
      </div>

      {/* Message */}
      <div className="max-w-sm space-y-3">
        <h1 className="text-xl font-bold tracking-tight">Window too small</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          BikeSuite needs a bit more room to work well. Try{' '}
          <span className="font-medium text-foreground">expanding your browser window</span>{' '}
          or switching to a larger display.
        </p>
      </div>

      {/* Current vs minimum */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={`rounded-lg border p-3 ${tooNarrow ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/40'}`}>
          <p className="text-xs text-muted-foreground mb-1">Width</p>
          <p className={`font-semibold ${tooNarrow ? 'text-destructive' : 'text-foreground'}`}>
            {dims.w}px
          </p>
          <p className="text-[11px] text-muted-foreground">min {MIN_W}px</p>
        </div>
        <div className={`rounded-lg border p-3 ${tooShort ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/40'}`}>
          <p className="text-xs text-muted-foreground mb-1">Height</p>
          <p className={`font-semibold ${tooShort ? 'text-destructive' : 'text-foreground'}`}>
            {dims.h}px
          </p>
          <p className="text-[11px] text-muted-foreground">min {MIN_H}px</p>
        </div>
      </div>

    </div>
  )
}
