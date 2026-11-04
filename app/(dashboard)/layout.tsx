import { NavigationPreferencesProvider, ProtectedWorkspace } from '@/components/dashboard/navigation-preferences'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { DemoProvider } from '@/lib/demo/demo-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DemoProvider isDemo>
      <NavigationPreferencesProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            {/* No p-6 here — each page manages its own padding */}
            <ProtectedWorkspace>
              {children}
            </ProtectedWorkspace>
          </div>
        </div>
      </div>
    </NavigationPreferencesProvider>
    </DemoProvider>
  )
}
