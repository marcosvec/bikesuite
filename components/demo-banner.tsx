import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

export function DemoBanner({ show }: { show?: boolean }) {
  if (!show) {
    return null
  }

  return (
    <Alert className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
      <InfoIcon className="h-4 w-4 text-blue-500" />
      <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
        Demo data is saved locally in this browser. No account or external services are required.
      </AlertDescription>
    </Alert>
  )
}
