import Link from 'next/link'
import { SiteLogo } from '@/components/site-logo'

export function SiteFooter() {
  return (
    <footer className="border-t bg-card px-6 py-8">
      <div className="mx-auto max-w-5xl flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SiteLogo size={24} />
          <span className="text-sm font-semibold">BikeSuite</span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/cancellation" className="hover:text-foreground transition-colors">Cancellation</Link>
          <a href="mailto:support@bikesuite.net" className="hover:text-foreground transition-colors">
            support@bikesuite.net
          </a>
        </nav>

        <p className="text-xs text-muted-foreground">© 2026 BikeSuite. All rights reserved.</p>
      </div>
    </footer>
  )
}
