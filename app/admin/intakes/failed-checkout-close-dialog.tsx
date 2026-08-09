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

type FailedCheckoutCloseDialogProps = {
  intakeRef: string
  isPending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function FailedCheckoutCloseDialog({
  intakeRef,
  isPending,
  onConfirm,
  onOpenChange,
  open,
}: FailedCheckoutCloseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (!isPending) onOpenChange(nextOpen)
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close failed checkout?</AlertDialogTitle>
          <AlertDialogDescription>
            Request {intakeRef} will be permanently cancelled. Before anything changes,
            the payment is verified as unpaid and any open Checkout Session is expired.
            No refund is issued. The patient will need to start a new request if they still
            want the service.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep open</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Close request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
