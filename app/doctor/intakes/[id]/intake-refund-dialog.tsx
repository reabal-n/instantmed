"use client"

import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog"

interface IntakeRefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmRefund: () => void
  isPending: boolean
}

/**
 * Refund confirmation dialog. Wraps the reusable `TypedConfirmDialog`
 * primitive — the operator must type `REFUND` before the Issue refund
 * button enables. This is a real-money, hard-to-undo action; the typed
 * gate is intentional friction.
 */
export function IntakeRefundDialog({
  open,
  onOpenChange,
  onConfirmRefund,
  isPending,
}: IntakeRefundDialogProps) {
  return (
    <TypedConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Issue refund"
      description="This processes a full Stripe refund and emails the patient. The charge is reversed on the patient's card and cannot be re-collected without a new checkout."
      requiredText="REFUND"
      confirmLabel="Issue refund"
      onConfirm={onConfirmRefund}
      isPending={isPending}
    />
  )
}
