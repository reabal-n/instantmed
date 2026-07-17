/**
 * Intake + answers persistence with idempotency duplicate handling, fraud
 * flag persistence, safety triage write, and per-episode compliance audit.
 *
 * The order is load-bearing:
 *   1. Insert `intakes` (status=pending_payment)
 *   2. Insert `intake_answers` (atomic: rollback `intakes` on failure)
 *   3. Update triage fields + record operator-visible safety eval
 *   4. Compliance audit logs (request created, terms, telehealth, accuracy)
 *   5. Persist fraud flags (non-blocking)
 *
 * Compliance writes happen AFTER answers insert so they never orphan if
 * answers fail to save.
 */

import {
  type SupabaseClient,
} from "@supabase/supabase-js"

import { trackIntakeFunnelStep } from "@/lib/analytics/posthog-server"
import {
  logAccuracyAttestationGiven,
  logRequestCreated,
  logTelehealthConsentGiven,
  logTermsConsentGiven,
} from "@/lib/audit/compliance-audit"
import type { IntakeFlag } from "@/lib/clinical/intake-flags"
import { TELEHEALTH_CONSENT_VERSION,TERMS_VERSION } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"
import { buildAddressAuditMetadata } from "@/lib/request/address-metadata"
import { markPartialIntakeConverted } from "@/lib/request/server-draft-conversion"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import type { ServerSafetyCheck } from "@/lib/safety/evaluate"
import { type FraudCheckResult, saveFraudFlags } from "@/lib/security/fraud-detector"

import type { CheckoutResult } from "../checkout"
import { canRetryPaymentForIntake } from "../payment-integrity"
import { mapCategoryToRequestType } from "./helpers"
import type { CreateCheckoutInput, StepResult } from "./types"
import { stepFail, stepOk } from "./types"

const logger = createLogger("stripe-checkout-persistence")

async function markDraftConvertedIfPresent(
  supabase: SupabaseClient,
  input: CreateCheckoutInput,
  intakeId: string,
): Promise<void> {
  if (!input.serverDraftSessionId) return

  await markPartialIntakeConverted(supabase, {
    intakeId,
    sessionId: input.serverDraftSessionId,
  })
}

interface NormalizedAttribution {
  utm_source: string | null
  utm_medium: string | null
  utm_id: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  referrer: string | null
  landing_page: string | null
  attribution_captured_at: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  campaignid: string | null
  adgroupid: string | null
  keyword: string | null
  creative: string | null
  matchtype: string | null
  device: string | null
  network: string | null
}

export interface CreateIntakeRowInput {
  input: CreateCheckoutInput
  patientId: string
  authUserId: string
  serviceId: string
  serviceSlug: string
  isPriority: boolean
  amountCents: number
  priceId: string
  attribution: NormalizedAttribution
  baseUrl: string
}

export interface IntakeRow {
  id: string
  status: string
}

/**
 * Insert the intake row plus answers, with rollback on answers-insert failure
 * and idempotency-key duplicate handling. Returns the live intake row.
 *
 * If the idempotency key collides with a row that is already paid, returns
 * a `redirect` result the orchestrator should turn into a successful
 * CheckoutResult pointing at the patient intake page. If it collides with a
 * still-retryable pending row, the caller should redirect to retry.
 */
export type IntakeInsertOutcome =
  | { kind: "created"; intake: IntakeRow }
  | { kind: "already_paid"; redirectUrl: string; intakeId: string }
  | { kind: "retry_existing"; intakeId: string }

export async function createIntakeWithAnswers(
  supabase: SupabaseClient,
  args: CreateIntakeRowInput,
): Promise<StepResult<IntakeInsertOutcome>> {
  const { input, patientId, authUserId, serviceId, serviceSlug, isPriority, amountCents, priceId, attribution, baseUrl } = args

  const intakeData: Record<string, unknown> = {
    patient_id: patientId,
    service_id: serviceId,
    status: "pending_payment",
    payment_status: "pending",
    amount_cents: amountCents,
    category: input.category,
    subtype: input.subtype,
    is_priority: isPriority,
    idempotency_key: input.idempotencyKey,
    stripe_price_id: priceId || null,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_id: attribution.utm_id,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
    referrer: attribution.referrer,
    landing_page: attribution.landing_page,
    attribution_captured_at: attribution.attribution_captured_at,
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
    campaignid: attribution.campaignid,
    adgroupid: attribution.adgroupid,
    keyword: attribution.keyword,
    creative: attribution.creative,
    matchtype: attribution.matchtype,
    device: attribution.device,
    network: attribution.network,
  }

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .insert(intakeData)
    .select("id, status")
    .single<IntakeRow>()

  if (intake) {
    logger.debug("Intake created", {
      intakeId: intake.id,
      serviceId,
      serviceSlug,
      category: input.category,
      subtype: input.subtype,
      status: intake.status,
    })

    trackIntakeFunnelStep({
      step: "intake_started",
      intakeId: intake.id,
      serviceSlug,
      serviceType: input.category,
      subtype: input.subtype,
      userId: authUserId,
    })
  }

  if (intakeError || !intake) {
    if (intakeError?.code === "23505" && input.idempotencyKey) {
      const { data: existingIntake } = await supabase
        .from("intakes")
        .select("id, status, payment_status")
        .eq("idempotency_key", input.idempotencyKey)
        .single<{ id: string; status: string; payment_status: string }>()

      if (existingIntake) {
        await markDraftConvertedIfPresent(supabase, input, existingIntake.id)
        logger.info("Returning existing intake for idempotency key", {
          intakeId: existingIntake.id,
          idempotencyKey: input.idempotencyKey,
        })
        if (existingIntake.payment_status === "paid") {
          return stepOk({
            kind: "already_paid",
            intakeId: existingIntake.id,
            redirectUrl: `${baseUrl}/patient/intakes/${existingIntake.id}`,
          })
        }
        if (!canRetryPaymentForIntake(existingIntake.status, existingIntake.payment_status)) {
          return stepFail(
            "This request is not awaiting payment. Please refresh and check your request status.",
          )
        }
        return stepOk({ kind: "retry_existing", intakeId: existingIntake.id })
      }
    }

    logger.error("Failed to create intake", {
      error: intakeError,
      code: intakeError?.code,
      message: intakeError?.message,
      details: intakeError?.details,
    })
    if (intakeError?.code === "23503") {
      return stepFail("Your profile could not be found. Please sign out and sign in again.")
    }
    if (intakeError?.code === "42501") {
      return stepFail("Permission denied. Please sign out and sign in again, or try as a guest.")
    }
    return stepFail(
      `Failed to create your request. ${intakeError?.message ? `(${intakeError.message})` : "Please try again."}`,
    )
  }

  // Atomic answers insert. If this fails the intake is rolled back so we never
  // leave an intake with no clinical answers and no audit trail.
  const { error: answersError } = await supabase.from("intake_answers").insert({
    intake_id: intake.id,
    answers: input.answers,
  })

  if (answersError) {
    logger.error(
      "[Stripe Checkout] Failed to save answers, rolling back intake",
      { intakeId: intake.id },
      new Error(answersError.message),
    )
    await supabase.from("intakes").delete().eq("id", intake.id)
    return stepFail("Failed to save your clinical information. Please try again.")
  }

  await markDraftConvertedIfPresent(supabase, input, intake.id)

  return stepOk({ kind: "created", intake })
}

/**
 * Update the intake's safety triage columns and record the operator-visible
 * safety evaluation row. Runs in parallel.
 */
export async function applySafetyTriage(
  supabase: SupabaseClient,
  args: {
    intakeId: string
    answers: Record<string, unknown>
    serviceSlug: string
    safetyCheck: ServerSafetyCheck
    /** Doctor-visible soft flags derived from the intake; written to risk_flags. */
    intakeFlags: IntakeFlag[]
  },
): Promise<void> {
  await Promise.all([
    recordSafetyEvaluationForOperators({
      answers: args.answers,
      context: "checkout",
      requestId: args.intakeId,
      result: args.safetyCheck,
      serviceSlug: args.serviceSlug,
    }),
    supabase
      .from("intakes")
      .update({
        risk_tier: args.safetyCheck.riskTier,
        triage_result: "allow",
        triage_reasons: args.safetyCheck.triggeredRuleIds,
        requires_live_consult: args.safetyCheck.requiresCall,
        live_consult_reason: args.safetyCheck.blockReason || null,
        risk_flags: args.intakeFlags,
      })
      .eq("id", args.intakeId),
  ])
}

/**
 * Per-episode compliance audit. LegitScript and AHPRA defensibility require
 * a record that consent was attested at submission time, not assumed from
 * signup. Order: request_created first, then the three consent log lines.
 */
export async function logComplianceAudit(args: {
  intake: IntakeRow
  category: string
  subtype: string
  patientId: string
  answers: Record<string, unknown>
}): Promise<void> {
  const requestType = mapCategoryToRequestType(args.category, args.subtype)
  await logRequestCreated(args.intake.id, requestType, args.patientId, {
    category: args.category,
    subtype: args.subtype,
    ...buildAddressAuditMetadata(args.answers),
  })
  await Promise.all([
    logTermsConsentGiven(args.intake.id, requestType, args.patientId, TERMS_VERSION),
    logTelehealthConsentGiven(args.intake.id, requestType, args.patientId, TELEHEALTH_CONSENT_VERSION),
    logAccuracyAttestationGiven(args.intake.id, requestType, args.patientId),
  ])
}

/**
 * Best-effort fraud flag persistence. Never blocks checkout — failure is
 * logged and the flow continues so that a Sentry/Redis hiccup does not stop
 * a patient from paying.
 */
export async function persistFraudFlags(args: {
  intakeId: string
  patientId: string
  fraudResult: FraudCheckResult
}): Promise<void> {
  if (!args.fraudResult.flagged) return
  try {
    await saveFraudFlags(args.intakeId, args.patientId, args.fraudResult.flags)
    logger.info("Fraud flags saved for review", {
      intakeId: args.intakeId,
      flagCount: args.fraudResult.flags.length,
      riskScore: args.fraudResult.riskScore,
    })
  } catch (fraudSaveError) {
    logger.error(
      "Failed to save fraud flags",
      { intakeId: args.intakeId },
      fraudSaveError instanceof Error ? fraudSaveError : undefined,
    )
  }
}

// Re-exported for orchestrator convenience: the `already_paid` and
// `retry_existing` outcomes both terminate the create flow with specific
// CheckoutResult shapes the orchestrator builds inline.
export type { CheckoutResult }
