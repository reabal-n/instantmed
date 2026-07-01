export type PaymentRecoveryIndicator =
  | "payment_pending"
  | "payment_retry"
  | "paid_cancelled"

export type PaymentRecoveryIndicatorInput = {
  status?: string | null
  paymentStatus?: string | null
}

const TERMINAL_PAYMENT_STATUSES = new Set([
  "paid",
  "refunded",
  "partially_refunded",
  "disputed",
])

export function getPaymentRecoveryIndicator({
  status,
  paymentStatus,
}: PaymentRecoveryIndicatorInput): PaymentRecoveryIndicator | null {
  if (status === "cancelled" && paymentStatus === "paid") {
    return "paid_cancelled"
  }

  if (
    status === "checkout_failed" &&
    !TERMINAL_PAYMENT_STATUSES.has(paymentStatus ?? "")
  ) {
    return "payment_retry"
  }

  if (
    status === "pending_payment" &&
    (!paymentStatus || paymentStatus === "pending" || paymentStatus === "unpaid")
  ) {
    return "payment_pending"
  }

  return null
}
