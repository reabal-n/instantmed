"use client"

import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog"

interface IntakeRefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmRefund: () => void
  isPending: boolean
  /** Original paid amount in cents. */
  paidAmountCents: number
  /** Amount already refunded against this intake in cents. 0 if none. */
  alreadyRefundedCents: number
  /** Patient display name shown in the dialog body. */
  patientName: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Refund confirmation dialog. Wraps `TypedConfirmDialog` so the operator
 * must type `REFUND` before the action button enables. The dialog body
 * shows a concrete refund-amount preview so the operator sees what is
 * about to happen before they type.
 *
 * Top-up mode: when `alreadyRefundedCents > 0` the dialog frames the
 * action as completing a partial refund and the button label shows the
 * remaining amount.
 */
export function IntakeRefundDialog({
  open,
  onOpenChange,
  onConfirmRefund,
  isPending,
  paidAmountCents,
  alreadyRefundedCents,
  patientName,
}: IntakeRefundDialogProps) {
  const remainingCents = Math.max(paidAmountCents - alreadyRefundedCents, 0)
  const isTopUp = alreadyRefundedCents > 0

  const paid = formatCents(paidAmountCents)
  const refunded = formatCents(alreadyRefundedCents)
  const remaining = formatCents(remainingCents)

  const title = isTopUp ? "Top up to full refund" : "Issue refund"
  const confirmLabel = isTopUp ? `Refund remaining ${remaining}` : `Refund ${paid}`
  const description = isTopUp
    ? `${patientName} paid ${paid} and has already been refunded ${refunded}. This refunds the remaining ${remaining} so their total refund equals ${paid}. Stripe reverses the charge on the original card and emails the patient. Cannot be re-collected without a new checkout.`
    : `This refunds the full ${paid} to ${patientName} via Stripe and emails them. The charge is reversed on the patient's card and cannot be re-collected without a new checkout.`

  return (
    <TypedConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      requiredText="REFUND"
      confirmLabel={confirmLabel}
      onConfirm={onConfirmRefund}
      isPending={isPending}
    />
  )
}
