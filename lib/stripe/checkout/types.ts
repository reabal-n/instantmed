/**
 * Shared types for the checkout pipeline modules.
 *
 * `CreateCheckoutInput` and `CheckoutResult` are the public API of
 * `lib/stripe/checkout`. The internal `StepResult` discriminated union is the
 * shape every pipeline-step module returns; the orchestrator short-circuits
 * on the first `ok: false`.
 */

import type {
  CheckoutFailureCode,
  CheckoutFailureResult,
} from "../checkout-failure"

export interface CreateCheckoutInput {
  category: string
  subtype: string
  type: string
  answers: Record<string, unknown>
  serviceSlug?: string
  /** Client-generated key (>=16 chars) preventing duplicate submissions. */
  idempotencyKey: string
  attribution?: {
    gclid?: string
    gbraid?: string
    wbraid?: string
    utm_source?: string
    utm_medium?: string
    utm_id?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    campaignid?: string
    adgroupid?: string
    keyword?: string
    creative?: string
    matchtype?: string
    device?: string
    network?: string
    referrer?: string
    landing_page?: string
    captured_at?: string
  }
  /** Anonymous browser PostHog ID for personless funnel continuity. */
  posthogDistinctId?: string
  /** Opaque UUID identifying one intake attempt across draft and payment. */
  flowInstanceId?: string
  /** Opaque non-clinical product-experience cohort. */
  growthExperienceVersion?: string
  /** Server draft session id used to mark a recovered partial intake converted. */
  serverDraftSessionId?: string
  /** Legacy fields. Patient info now comes from auth. */
  patientId?: string
  patientEmail?: string
}

export interface CheckoutSuccessResult {
  success: true
  checkoutUrl: string
  error?: undefined
  failureCategory?: undefined
  failureCode?: undefined
  failureTaxonomyVersion?: undefined
  intakeId: string
  paymentRecoveryReason?: undefined
  requiresFreshRequest?: undefined
}

export type CheckoutResult = CheckoutSuccessResult | CheckoutFailureResult

/**
 * Internal pipeline-step return shape. The orchestrator reads `ok`
 * and propagates the first failure as a CheckoutResult error.
 */
export type StepResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; failureCode: CheckoutFailureCode }

export function stepOk<T>(data: T): StepResult<T> {
  return { ok: true, data }
}

export function stepFail(
  failureCode: CheckoutFailureCode,
  error: string,
): StepResult<never> {
  return { ok: false, error, failureCode }
}
