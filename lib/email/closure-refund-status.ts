/** A settled partial refund is not proof that the full closure refund completed. */
export function closureRefundStatus(paymentStatus: string | null, refundStatus: string | null): string | undefined {
  if (paymentStatus === "refunded") return "succeeded"
  if (refundStatus === "pending" || refundStatus === "failed") return refundStatus
  return undefined
}
