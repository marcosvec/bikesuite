'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { resetDemoData } from '@/lib/demo/reset-demo'

export function ResetDemoDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset demo data</AlertDialogTitle>
          <AlertDialogDescription>
            This clears customers, bikes, work orders, sales, receipts, catalog imports, and shop settings in this browser, then reloads the sample shop.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="button" onClick={() => resetDemoData()}>Reset demo data</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ResetDemoButton({
  variant = 'outline',
  className,
}: {
  variant?: 'outline' | 'ghost'
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        <RotateCcw className="mr-2 size-4" />
        Reset demo data
      </Button>
      <ResetDemoDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
