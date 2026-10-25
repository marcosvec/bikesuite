'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Check, Palette, Settings, Save, Wrench, RotateCcw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

const sections = [
  { id: 'appearance',   label: 'Appearance',   icon: Palette  },
  { id: 'general',      label: 'General',       icon: Settings },
  { id: 'work-orders',  label: 'Work Orders',   icon: Wrench   },
]

const themes = [
  {
    id: 'light',
    label: 'Mono Light',
    description: 'Clean white',
    preview: {
      bg: 'bg-white',
      card: 'bg-gray-100',
      bar: 'bg-gray-800',
      accent: 'bg-gray-300',
    },
  },
  {
    id: 'dark',
    label: 'Mono Dark',
    description: 'Classic black',
    preview: {
      bg: 'bg-zinc-900',
      card: 'bg-zinc-800',
      bar: 'bg-zinc-100',
      accent: 'bg-zinc-600',
    },
  },
  {
    id: 'abyss',
    label: 'Abyss',
    description: 'Deep dark blue',
    preview: {
      bg: 'bg-[#0d0f1a]',
      card: 'bg-[#141828]',
      bar: 'bg-blue-200',
      accent: 'bg-blue-600',
    },
  },
]

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose your preferred theme for the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm font-medium">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const isActive = theme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all hover:border-primary',
                    isActive ? 'border-primary' : 'border-border'
                  )}
                >
                  <div className={cn('h-20 w-full rounded-lg overflow-hidden', t.preview.bg)}>
                    <div className="flex h-full flex-col gap-1 p-2">
                      <div className={cn('h-2 w-10 rounded-sm', t.preview.card)} />
                      <div className={cn('h-8 w-full rounded-md p-1.5 flex flex-col gap-1', t.preview.card)}>
                        <div className={cn('h-1.5 w-10 rounded-sm', t.preview.bar)} />
                        <div className={cn('h-1.5 w-8 rounded-sm', t.preview.accent)} />
                      </div>
                      <div className={cn('h-4 w-full rounded-md', t.preview.card)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    {isActive && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── General settings ──────────────────────────────────────────────────────────

const SETTINGS_KEY = 'bikesuite_settings'

type ShopSettings = {
  shopName:             string
  address:              string
  city:                 string
  state:                string
  zip:                  string
  phone:                string
  email:                string
  taxRate:              string
  currency:             string
  // Work Order behaviour
  assumeImmediateWork:  boolean
}

const defaultSettings: ShopSettings = {
  shopName:            'My Bike Shop',
  address:             '',
  city:                '',
  state:               '',
  zip:                 '',
  phone:               '',
  email:               '',
  taxRate:             '8',
  currency:            'USD',
  assumeImmediateWork: false,
}

function loadSettings(): ShopSettings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

function GeneralSection() {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  function set(field: keyof ShopSettings, value: string) {
    setSettings(s => ({ ...s, [field]: value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
          <CardDescription>Your shop&apos;s name and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                value={settings.shopName}
                onChange={e => set('shopName', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={settings.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={e => set('address', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={settings.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  maxLength={2}
                  placeholder="OR"
                  value={settings.state}
                  onChange={e => set('state', e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" value={settings.zip} onChange={e => set('zip', e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax &amp; Currency</CardTitle>
          <CardDescription>Configure your default tax rate for sales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.taxRate}
                onChange={e => set('taxRate', e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Applied to all sales in the POS.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={e => set('currency', e.target.value)}
                maxLength={3}
                placeholder="USD"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" className="gap-2">
          {saved ? <Check className="size-4" /> : <Save className="size-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
        {saved && (
          <p className="text-muted-foreground text-sm">Settings saved to local storage.</p>
        )}
      </div>
    </form>
  )
}

// ── Work Orders settings ───────────────────────────────────────────────────────

function WorkOrdersSection() {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings)
  const [flash, setFlash] = useState(false)

  useEffect(() => { setSettings(loadSettings()) }, [])

  function handleToggle(field: keyof ShopSettings, value: boolean) {
    const next = { ...settings, [field]: value }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    setFlash(true)
    setTimeout(() => setFlash(false), 1800)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Work Order Behaviour</CardTitle>
          <CardDescription>
            Control how work orders move through their lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Separator />

          {/* Assume Immediate Work */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Assume Immediate Work</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                When <span className="font-medium text-foreground">on</span>, new work
                orders are created directly at{' '}
                <span className="font-medium text-foreground">In Progress</span> — useful
                when your shop starts work immediately on drop-off.
                When <span className="font-medium text-foreground">off</span>, orders start
                at <span className="font-medium text-foreground">Intake</span> and a
                technician manually moves them forward.
              </p>
            </div>
            <Switch
              checked={settings.assumeImmediateWork}
              onCheckedChange={v => handleToggle('assumeImmediateWork', v)}
            />
          </div>

          {flash && (
            <p className="text-xs text-muted-foreground">
              <Check className="mr-1 inline size-3" />
              Setting saved.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('appearance')

  function resetDemo() {
    for (const key of [
      'bikesuite_products',
      'bikesuite_customers',
      'bikesuite_work_orders',
      'bikesuite_work_order_items',
      'bikesuite_transactions',
      SETTINGS_KEY,
    ]) {
      window.localStorage.removeItem(key)
    }
    window.location.reload()
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="flex gap-6">
        <aside className="w-44 shrink-0">
          <nav className="flex flex-col gap-1">
            {sections.map((s) => {
              const Icon = s.icon
              const isActive = activeSection === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {activeSection === 'appearance'  && <AppearanceSection />}
          {activeSection === 'general'      && <GeneralSection />}
          {activeSection === 'work-orders'  && <WorkOrdersSection />}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
          <CardDescription>
            Changes are stored only in this browser. Reset the app to restore the original sample data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={resetDemo}>
            <RotateCcw className="mr-2 size-4" />
            Reset demo data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
