'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNavigationPreferences } from './navigation-preferences'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Moon, Sun, Waves, Menu, User, LockKeyhole } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { navItems } from './nav-items'
import { ShopSearch } from './shop-search'
import { ResetDemoDialog } from './reset-demo-button'
import { LowStockMark, useLowStockCount } from './low-stock-mark'

interface HeaderProps {
  children?: React.ReactNode
}

function currentPath(pathname: string) {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '')
}

export function Header({ children }: HeaderProps) {
  const { setTheme, theme } = useTheme()
  const { lockWorkspace, locked } = useNavigationPreferences()
  const [menuOpen, setMenuOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const path = currentPath(usePathname())
  const lowStock = useLowStockCount()

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-card px-3 sm:px-6">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>BikeSuite</SheetTitle>
            <SheetDescription>Shop pages</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-2">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.href === '/inventory' && lowStock ? `${item.label}, ${lowStock} to reorder` : item.label}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium',
                  path === item.href ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.href === '/inventory' && <LowStockMark />}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="hidden text-lg font-semibold sm:block">{children}</div>
      <ShopSearch />

      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="sm" onClick={lockWorkspace} disabled={locked} aria-label="Lock">
          <LockKeyhole className="size-4 sm:mr-2" />
          <span className="hidden sm:inline">Lock</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (theme === 'light') setTheme('dark')
            else if (theme === 'dark') setTheme('abyss')
            else setTheme('light')
          }}
          aria-label="Cycle theme"
        >
          {theme === 'light' && <Sun className="h-4 w-4" />}
          {theme === 'dark' && <Moon className="h-4 w-4" />}
          {theme === 'abyss' && <Waves className="h-4 w-4" />}
          {!theme && <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings">Demo settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setResetOpen(true)}>
              Reset demo data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />
    </header>
  )
}
