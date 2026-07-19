/**
 * Shared types for the checkout pipeline modules.
 *
 * `CreateCheckoutInput` and `CheckoutResult` are the public API of
 * `lib/stripe/checkout`. The internal `StepResult` discriminated union is the
 * shape every pipeline-step module returns; the orchestrator short-circuits
 * on the first `ok: false`.
 */

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
  /** Server draft session id used to mark a recovered partial intake converted. */
  serverDraftSessionId?: string
  /** Legacy fields. Patient info now comes from auth. */
  patientId?: string
  patientEmail?: string
}

export interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  intakeId?: string
  error?: string
  paymentRecoveryReason?: "more_information_required"
}

/**
 * Internal pipeline-step return shape. The orchestrator reads `ok`
 * and propagates the first failure as a CheckoutResult error.
 */
export type StepResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export function stepOk<T>(data: T): StepResult<T> {
  return { ok: true, data }
}

export function stepFail(error: string): StepResult<never> {
  return { ok: false, error }
}
