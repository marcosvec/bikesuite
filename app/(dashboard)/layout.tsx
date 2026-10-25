import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { ScreenSizeGuard } from '@/components/dashboard/screen-size-guard'
import { DemoProvider } from '@/lib/demo/demo-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DemoProvider isDemo>
      <div className="flex h-screen flex-col overflow-hidden">
        <ScreenSizeGuard />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            {/* No p-6 here — each page manages its own padding */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </DemoProvider>
  )
}
