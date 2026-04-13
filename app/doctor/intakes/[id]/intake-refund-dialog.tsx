"use client"

import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IntakeRefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmRefund: () => void
  isPending: boolean
}

export function IntakeRefundDialog({
  open,
  onOpenChange,
  onConfirmRefund,
  isPending,
}: IntakeRefundDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Issue Refund</AlertDialogTitle>
          <AlertDialogDescription>
            This will automatically process a full refund via Stripe and notify the patient by email. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmRefund} disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue Refund
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
