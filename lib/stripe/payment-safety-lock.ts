export const HIGH_STAKES_PAYMENT_LOCK = "safety_blocked_high_stakes"

export const MISSING_SAFETY_INFORMATION_PAYMENT_LOCK =
  "safety_missing_required_information"

export const PAYMENT_SAFETY_LOCKS = [
  HIGH_STAKES_PAYMENT_LOCK,
  MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
] as const

export type PaymentSafetyLock = (typeof PAYMENT_SAFETY_LOCKS)[number]

export const PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER =
  `checkout_error.is.null,and(checkout_error.neq.${HIGH_STAKES_PAYMENT_LOCK},checkout_error.neq.${MISSING_SAFETY_INFORMATION_PAYMENT_LOCK})`

export const HIGH_STAKES_PAYMENT_LOCK_EXCLUSION_FILTER =
  `checkout_error.is.null,checkout_error.neq.${HIGH_STAKES_PAYMENT_LOCK}`

export function isPaymentSafetyLock(value: unknown): boolean {
  return PAYMENT_SAFETY_LOCKS.some((marker) => marker === value)
}

export function isMissingSafetyInformationPaymentLock(value: unknown): boolean {
  return value === MISSING_SAFETY_INFORMATION_PAYMENT_LOCK
}

export function isHighStakesPaymentLock(value: unknown): boolean {
  return value === HIGH_STAKES_PAYMENT_LOCK
}
