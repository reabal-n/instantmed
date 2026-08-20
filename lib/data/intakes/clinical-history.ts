/**
 * A request enters clinical history only after it has crossed the payment
 * boundary. Checkout attempts remain available to patient recovery and the
 * operational ledger, but must not be presented to clinicians as previous
 * care.
 *
 * `paid_at` is the durable primary signal. The payment-status allowlist keeps
 * legacy paid rows (which may predate `paid_at`) and later cash states such as
 * refunds or disputes in the clinical record.
 */
const CLINICAL_HISTORY_PAYMENT_STATUSES = [
  "paid",
  "partially_refunded",
  "refunded",
  "refund_processing",
  "refund_failed",
  "disputed",
] as const

const CLINICAL_HISTORY_PAYMENT_STATUS_SET = new Set<string>(
  CLINICAL_HISTORY_PAYMENT_STATUSES,
)

export const CLINICAL_HISTORY_POSTGREST_FILTER = [
  "paid_at.not.is.null",
  `payment_status.in.(${CLINICAL_HISTORY_PAYMENT_STATUSES.join(",")})`,
].join(",")

export function isClinicalHistoryIntake(intake: {
  payment_status?: string | null
  paid_at?: string | null
}): boolean {
  return Boolean(intake.paid_at) || (
    typeof intake.payment_status === "string" &&
    CLINICAL_HISTORY_PAYMENT_STATUS_SET.has(intake.payment_status)
  )
}
