import { BarChart3, Calendar, ClipboardCheck, LayoutDashboard, Package, Settings, ShoppingCart, Users, Wrench } from 'lucide-react'

export const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/check-in', label: 'Check-in', icon: ClipboardCheck },
  { href: '/work-orders', label: 'Work Orders', icon: Wrench },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]
