import type { CheckoutFailureCategory } from "@/lib/analytics/posthog-privacy"

export const CHECKOUT_FAILURE_TAXONOMY_VERSION = "checkout_v2_20260905" as const

export const CHECKOUT_FAILURE_CODES = [
  "availability",
  "auth_handoff",
  "auth_or_session",
  "clinical_or_input_validation",
  "payment_provider",
  "persistence",
  "pricing_or_configuration",
  "rate_limit",
  "unexpected",
] as const

export type CheckoutFailureCode = typeof CHECKOUT_FAILURE_CODES[number]
export type CheckoutFailureTaxonomyVersion =
  typeof CHECKOUT_FAILURE_TAXONOMY_VERSION

const CATEGORY_BY_CODE: Record<CheckoutFailureCode, CheckoutFailureCategory> = {
  availability: "availability_or_capacity",
  auth_handoff: "identity_or_session",
  auth_or_session: "identity_or_session",
  clinical_or_input_validation: "validation",
  payment_provider: "payment_provider",
  persistence: "persistence",
  pricing_or_configuration: "pricing_or_configuration",
  rate_limit: "rate_limit",
  unexpected: "unknown",
}

export interface CheckoutFailureResult {
  success: false
  checkoutUrl?: undefined
  error: string
  failureCategory: CheckoutFailureCategory
  failureCode: CheckoutFailureCode
  failureTaxonomyVersion: CheckoutFailureTaxonomyVersion
  intakeId?: undefined
  paymentRecoveryReason?: "more_information_required"
  requiresFreshRequest?: boolean
}

type CheckoutFailureOptions = Pick<
  CheckoutFailureResult,
  "paymentRecoveryReason" | "requiresFreshRequest"
>

export function getCheckoutFailureCategory(
  code: CheckoutFailureCode,
): CheckoutFailureCategory {
  return CATEGORY_BY_CODE[code]
}

/**
 * The public message is patient copy only. Analytics consumes the fixed code,
 * category, and version fields and never attempts to infer meaning from copy.
 */
export function checkoutFailure(
  code: CheckoutFailureCode,
  error: string,
  options: CheckoutFailureOptions = {},
): CheckoutFailureResult {
  return {
    success: false,
    error,
    failureCategory: getCheckoutFailureCategory(code),
    failureCode: code,
    failureTaxonomyVersion: CHECKOUT_FAILURE_TAXONOMY_VERSION,
    ...options,
  }
}
