import { formatPromisedPickup } from '@/lib/demo/create-work-order'

export function PromisedPickup({
  value,
  showEmpty = false,
  className = 'text-xs text-muted-foreground',
}: {
  value: string | null
  showEmpty?: boolean
  className?: string
}) {
  const when = formatPromisedPickup(value)
  if (!when && !showEmpty) return null
  return <span className={`block ${className}`}>{when ? `Promised pickup ${when}` : 'No promised pickup'}</span>
}
