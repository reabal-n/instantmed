import type { PaymentStatus } from "@/types/intake"

/**
 * Payment states that still carry the original clinical fulfilment obligation.
 *
 * A partial refund can return an add-on or service-recovery amount while the
 * underlying request remains paid. Fully refunded, disputed, pending, and
 * failed payments stay blocked from clinical fulfilment.
 */
export const FULFILMENT_ENTITLED_PAYMENT_STATUSES = [
  "paid",
  "partially_refunded",
] as const satisfies readonly PaymentStatus[]

const FULFILMENT_ENTITLED_PAYMENT_STATUS_SET = new Set<string>(
  FULFILMENT_ENTITLED_PAYMENT_STATUSES,
)

export function isFulfilmentEntitledPaymentStatus(
  paymentStatus: string | null | undefined,
): paymentStatus is (typeof FULFILMENT_ENTITLED_PAYMENT_STATUSES)[number] {
  return FULFILMENT_ENTITLED_PAYMENT_STATUS_SET.has(paymentStatus ?? "")
}
