'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const KEY = 'bikesuite_navigation_preferences'
const SESSION_KEY = 'bikesuite_workspace_unlocked'
const ACTIVITY_KEY = 'bikesuite_last_activity'
const defaults = { idleMinutes: 5, autoCollapse: true, passwordPrompt: true, offeredDisable: false }
type Preferences = typeof defaults
const Context = createContext<{
  preferences: Preferences
  update: (patch: Partial<Preferences>) => void
  collapsed: boolean
  toggleSidebar: () => void
  requestDisable: () => void
  locked: boolean
  lockWorkspace: () => void
  disablePending: boolean
  cancelDisable: () => void
  confirm: () => void
  offer: boolean
  dismissOffer: () => void
} | null>(null)

export function useNavigationPreferences() {
  const context = useContext(Context)
  if (!context) throw new Error('Navigation preferences provider is missing')
  return context
}

export function NavigationPreferencesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [preferences, setPreferences] = useState(defaults)
  const [ready, setReady] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [manuallyLocked, setManuallyLocked] = useState(false)
  const [disablePending, setDisablePending] = useState(false)
  const [offer, setOffer] = useState(false)
  const lastActivity = useRef(0)
  const previousPath = useRef(pathname)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
      setPreferences({
        idleMinutes: Number.isInteger(saved.idleMinutes) && saved.idleMinutes >= 1 && saved.idleMinutes <= 120 ? saved.idleMinutes : 5,
        autoCollapse: typeof saved.autoCollapse === 'boolean' ? saved.autoCollapse : true,
        passwordPrompt: typeof saved.passwordPrompt === 'boolean' ? saved.passwordPrompt : true,
        offeredDisable: saved.offeredDisable === true,
      })
    } catch { /* Use defaults when browser storage is unavailable. */ }
    try {
      const storedActivity = Number(sessionStorage.getItem(ACTIVITY_KEY))
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
      const minutes = Number.isInteger(saved.idleMinutes) && saved.idleMinutes >= 1 && saved.idleMinutes <= 120 ? saved.idleMinutes : 5
      const validActivity = Number.isFinite(storedActivity) && storedActivity > 0 && storedActivity <= Date.now()
      const expired = !validActivity || (saved.passwordPrompt !== false && Date.now() - storedActivity >= minutes * 60_000)
      lastActivity.current = validActivity ? storedActivity : Date.now()
      setSignedIn(!expired && sessionStorage.getItem(SESSION_KEY) === 'yes')
      setManuallyLocked(sessionStorage.getItem(SESSION_KEY) === 'locked' || (expired && sessionStorage.getItem(SESSION_KEY) === 'yes'))
      if (expired && sessionStorage.getItem(SESSION_KEY) === 'yes') sessionStorage.setItem(SESSION_KEY, 'locked')
    } catch { /* Start locked if session storage is unavailable. */ }
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(KEY, JSON.stringify(preferences)) } catch { /* Keep session preferences. */ }
    }
  }, [preferences, ready])
  const update = (patch: Partial<Preferences>) => {
    if (patch.passwordPrompt === true) {
      setSignedIn(true)
      lastActivity.current = Date.now()
      try { sessionStorage.setItem(ACTIVITY_KEY, String(lastActivity.current)) } catch { /* Keep in-memory activity. */ }
      try { sessionStorage.setItem(SESSION_KEY, 'yes') } catch { /* Keep in-memory session. */ }
    }
    setPreferences(value => ({ ...value, ...patch }))
  }
  useEffect(() => {
    const changed = previousPath.current !== pathname
    previousPath.current = pathname
    if (timer.current) clearTimeout(timer.current)
    if (changed && preferences.autoCollapse) timer.current = setTimeout(() => setCollapsed(true), 4000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [pathname, preferences.autoCollapse])
  const toggleSidebar = () => {
    if (timer.current) clearTimeout(timer.current)
    setCollapsed(value => !value)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.defaultPrevented || event.repeat || target.closest('form, input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"]')) return
      if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        if (timer.current) clearTimeout(timer.current)
        setCollapsed(value => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const locked = !ready || manuallyLocked || (preferences.passwordPrompt && !signedIn)
  const lockWorkspace = useCallback(() => {
    setSignedIn(false)
    setManuallyLocked(true)
    setOffer(false)
    setDisablePending(false)
    try { sessionStorage.setItem(SESSION_KEY, 'locked') } catch { /* Keep in-memory lock. */ }
  }, [])
  useEffect(() => {
    if (!ready || !signedIn || manuallyLocked || !preferences.passwordPrompt) return
    const limit = preferences.idleMinutes * 60_000
    const check = () => {
      if (Date.now() - lastActivity.current >= limit) { lockWorkspace(); return true }
      return false
    }
    const activity = () => {
      if (document.hidden || check()) return
      const now = Date.now()
      if (now - lastActivity.current < 1000) return
      lastActivity.current = now
      try { sessionStorage.setItem(ACTIVITY_KEY, String(now)) } catch { /* Keep in-memory activity. */ }
    }
    check()
    const interval = setInterval(check, 1000)
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll'] as const
    events.forEach(event => window.addEventListener(event, activity, { passive: true, capture: true }))
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      events.forEach(event => window.removeEventListener(event, activity, true))
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [ready, signedIn, manuallyLocked, preferences.passwordPrompt, preferences.idleMinutes, lockWorkspace])
  const confirm = () => {
    setSignedIn(true)
    lastActivity.current = Date.now()
    try { sessionStorage.setItem(ACTIVITY_KEY, String(lastActivity.current)) } catch { /* Keep in-memory activity. */ }
    setManuallyLocked(false)
    try { sessionStorage.setItem(SESSION_KEY, 'yes') } catch { /* Keep in-memory session. */ }
    if (disablePending) {
      update({ passwordPrompt: false })
      setDisablePending(false)
      setOffer(false)
    } else if (!preferences.offeredDisable) {
      update({ offeredDisable: true })
      setOffer(true)
    }
  }
  return <Context.Provider value={{ preferences, update, collapsed, toggleSidebar,
    requestDisable: () => { setDisablePending(true); setOffer(false) },
    locked, lockWorkspace, disablePending, cancelDisable: () => setDisablePending(false), confirm,
    offer, dismissOffer: () => setOffer(false),
  }}>{children}</Context.Provider>
}

export function NavigationSettings() {
  const { preferences, update, requestDisable } = useNavigationPreferences()
  const [timeoutInput, setTimeoutInput] = useState(String(preferences.idleMinutes))
  useEffect(() => setTimeoutInput(String(preferences.idleMinutes)), [preferences.idleMinutes])
  const saveTimeout = () => {
    const value = Number(timeoutInput)
    if (Number.isInteger(value) && value >= 1 && value <= 120) update({ idleMinutes: value })
    else setTimeoutInput(String(preferences.idleMinutes))
  }
  return <Card>
    <CardHeader><CardTitle>Navigation</CardTitle></CardHeader>
    <CardContent className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="auto-collapse">Squish sidebar on tab switch</Label>
        <Switch id="auto-collapse" checked={preferences.autoCollapse} onCheckedChange={autoCollapse => update({ autoCollapse })} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="password-prompt">Require sign-in</Label>
        <Switch id="password-prompt" checked={preferences.passwordPrompt} onCheckedChange={enabled => enabled ? update({ passwordPrompt: true }) : requestDisable()} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="idle-timeout">Lock after inactivity (minutes)</Label>
        <Input id="idle-timeout" className="max-w-32" type="number" min={1} max={120} step={1}
          disabled={!preferences.passwordPrompt} value={timeoutInput}
          onChange={event => setTimeoutInput(event.target.value)} onBlur={saveTimeout}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveTimeout() } }} />
        <p className="text-xs text-muted-foreground">1–120 minutes. Applies while Require sign-in is enabled.</p>
      </div>
    </CardContent>
  </Card>
}

export function ProtectedWorkspace({ children }: { children: ReactNode }) {
  const { locked, disablePending, cancelDisable, confirm, offer, dismissOffer, requestDisable } = useNavigationPreferences()
  const blocked = locked || disablePending
  return <main className="relative min-h-0 flex-1 overflow-hidden">
    <div hidden={blocked} className="h-full overflow-y-auto">
      {!blocked && children}
    </div>
    {blocked && <section className="h-full overflow-y-auto p-6 lg:p-10" aria-labelledby="workspace-password-title">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="border-b pb-6">
          <p className="mb-2 text-sm text-muted-foreground">BikeSuite workspace</p>
          <h1 id="workspace-password-title" className="text-2xl font-semibold tracking-tight">{disablePending ? 'Turn off password prompts' : 'Sign in to your workspace'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{disablePending ? 'Confirm to continue without password prompts.' : 'Access your dashboard, sales overview, and shop activity.'}</p>
        </div>
        <div className="grid gap-8 rounded-xl border bg-card p-6 sm:grid-cols-2 lg:p-8">
          <div className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted"><LockKeyhole className="size-6" aria-hidden="true" /></div>
            <h2 className="text-lg font-medium">{disablePending ? 'Confirm your preference' : 'Your shop at a glance'}</h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{disablePending ? 'You can enable prompts again in Settings.' : 'Sign in to access all pages. The workspace locks after inactivity, or whenever you select Lock.'}</p>
          </div>
          <form key={disablePending ? 'disable' : 'unlock'} aria-label="Workspace sign-in" aria-describedby="workspace-password-note" className="space-y-4 self-center"
            onSubmit={event => { event.preventDefault(); confirm() }}>
            <div className="space-y-2">
              <Label htmlFor="workspace-password">Password</Label>
              <Input id="workspace-password" type="password" autoFocus autoComplete="off" />
              <p id="workspace-password-note" className="text-xs text-muted-foreground">Demo: any password works, including blank.</p>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{disablePending ? 'Turn off prompts' : 'Sign in'}</Button>
              {disablePending && <Button type="button" variant="outline" onClick={cancelDisable}>Cancel</Button>}
            </div>
          </form>
        </div>
      </div>
    </section>}
    {offer && !blocked && <div role="status" className="absolute bottom-4 right-4 z-30 flex max-w-md flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
      <p className="text-sm">Prefer browsing without password prompts?</p>
      <Button size="sm" onClick={requestDisable}>Turn off</Button>
      <Button size="sm" variant="ghost" onClick={dismissOffer}>Keep enabled</Button>
    </div>}
  </main>
}
