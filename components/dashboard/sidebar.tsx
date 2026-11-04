'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { useNavigationPreferences } from './navigation-preferences'
import { navItems } from './nav-items'
import { LowStockMark, useLowStockCount } from './low-stock-mark'

function currentPath(pathname: string) {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '')
}

export function Sidebar() {
  const pathname = usePathname()
  const path = currentPath(pathname)
  const { collapsed, toggleSidebar } = useNavigationPreferences()
  const lowStock = useLowStockCount()

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 flex-col border-r bg-card transition-all duration-300 md:flex',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              BS
            </div>
            <span className="text-lg font-bold">BikeSuite</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title="Toggle sidebar (Tab)"
          aria-expanded={!collapsed}
          className="h-8 w-8"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = path === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.href === '/inventory' && lowStock ? `${item.label}, ${lowStock} to reorder` : item.label}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {item.href === '/inventory' && <LowStockMark />}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            path === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
