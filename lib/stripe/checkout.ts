"use server"

/**
 * Stripe checkout entry points for authenticated intake submission.
 *
 * Public API:
 *   - `createIntakeAndCheckoutAction(input)`: end-to-end create + Stripe redirect
 *   - `retryPaymentForIntakeAction(intakeId)`: rebuild a session for a stale intake
 *
 * The orchestrator is intentionally thin. Each step lives in
 * `lib/stripe/checkout/*` and returns a `StepResult` discriminated union; the
 * orchestrator short-circuits on the first failure. Step modules:
 *
 *   - `pre-checkout-gates.ts`     env + DB kill switches, capacity guard
 *   - `clinical-validation.ts`    Zod payload, blocklist, Sched 8, safety rules
 *   - `auth-and-profile.ts`       auth, profile assert, age check, consent
 *   - `persistence.ts`            intake + answers insert, triage, audit, fraud
 *   - `stripe-session.ts`         line items, metadata, session create
 *
 * Behavior is verbatim with the prior monolithic `checkout.ts`. No semantic
 * changes were introduced by the carve. Existing tests in
 * `lib/__tests__/stripe/checkout-operating-hours.test.ts` and
 * `lib/__tests__/stripe-checkout-retry.test.ts` continue to mock the same
 * external dependencies, which the step modules also import from.
 */

import { cookies } from "next/headers"

import { normalizeAttributionForStorage } from "@/lib/analytics/attribution-storage"
import { trackIntakeFunnelStep } from "@/lib/analytics/posthog-server"
import { resolveCheckoutAttribution } from "@/lib/analytics/server-attribution"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { runFraudChecks } from "@/lib/security/fraud-detector"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory } from "@/types/services"

import { runAuthAndProfile } from "./checkout/auth-and-profile"
import { runClinicalValidation } from "./checkout/clinical-validation"
import { getServiceSlug } from "./checkout/helpers"
import {
  applySafetyTriage,
  createIntakeWithAnswers,
  logComplianceAudit,
  persistFraudFlags,
} from "./checkout/persistence"
import { runPreCheckoutGates } from "./checkout/pre-checkout-gates"
import { retryPaymentForIntakeAction } from "./checkout/retry-payment"
import {
  buildCheckoutSessionParams,
  createStripeSessionWithRollback,
} from "./checkout/stripe-session"
import type { CheckoutResult,CreateCheckoutInput } from "./checkout/types"
import { reportCheckoutSessionFailure } from "./checkout-error-alarm"
import { getAmountCentsForRequest, getOptionalStripePriceEnv, getPriceIdForRequest } from "./client"
import { createReferralCouponIfEligible } from "./referral-coupon"

const logger = createLogger("stripe-checkout")

export type { CheckoutResult, CreateCheckoutInput } from "./checkout/types"
export { retryPaymentForIntakeAction }

export async function createIntakeAndCheckoutAction(
  input: CreateCheckoutInput,
): Promise<CheckoutResult> {
  const startTime = Date.now()

  try {
    const resolvedAttribution = await resolveCheckoutAttribution(input.attribution)

    // 1. Pre-checkout gates: env + DB kill switches, capacity.
    const gatesResult = await runPreCheckoutGates(input)
    if (!gatesResult.ok) return { success: false, error: gatesResult.error }

    // 2. Clinical validation: payload Zod, blocklist, Sched 8, safety rules.
    const clinicalResult = await runClinicalValidation(input)
    if (!clinicalResult.ok) return { success: false, error: clinicalResult.error }
    const { serviceSlugForSafety, safetyCheck, intakeFlags } = clinicalResult.data

    // 3. Auth, profile, age, baseUrl, consent.
    const authResult = await runAuthAndProfile(input)
    if (!authResult.ok) return { success: false, error: authResult.error }
    const { patientId, patientEmail, stripeCustomerId, authUserId, baseUrl } = authResult.data

    const supabase = createServiceRoleClient()

    // 4. Resolve service row.
    const serviceSlug = input.serviceSlug || getServiceSlug(input.category, input.subtype)
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, price_cents")
      .eq("slug", serviceSlug)
      .eq("is_active", true)
      .single()

    if (serviceError || !service) {
      logger.error("Service not found", { serviceSlug, error: serviceError })
      return { success: false, error: "Service not available. Please contact support." }
    }

    // 5. Fraud detection (non-blocking; flags persisted later).
    const medicareNumber = input.answers.medicare_number as string | undefined
    const formStartTime = input.answers._form_start_time
      ? new Date(input.answers._form_start_time as string)
      : undefined
    const formEndTime = new Date()
    const fraudResult = await runFraudChecks({
      patientId,
      medicareNumber,
      category: input.category,
      subtype: input.subtype,
      formStartTime,
      formEndTime,
    })
    if (fraudResult.flagged && fraudResult.riskScore >= 60) {
      logger.warn("High-risk fraud flags detected", {
        patientId,
        riskScore: fraudResult.riskScore,
        flags: fraudResult.flags.map((f) => f.type),
      })
    }

    // 6. Idempotency key + rate limit.
    if (!input.idempotencyKey || input.idempotencyKey.length < 16) {
      logger.error("Missing or invalid idempotency key", {
        hasKey: !!input.idempotencyKey,
        keyLength: input.idempotencyKey?.length,
      })
      return { success: false, error: "Invalid request. Please refresh the page and try again." }
    }
    const rateLimitResult = await checkServerActionRateLimit(patientId, "sensitive")
    if (!rateLimitResult.success) {
      logger.warn("Checkout rate limited", { patientId })
      return {
        success: false,
        error:
          rateLimitResult.error ||
          "Too many checkout attempts. Please wait a moment before trying again.",
      }
    }

    // 7. Resolve pricing (price ID + amount + priority add-on). A broken
    // STRIPE_PRICE_* env makes getPriceIdForRequest throw; catch it so we fire the
    // fatal price-config alarm and return a graceful message instead of throwing
    // into the outer catch with no alarm (mirrors the guest path). The intake is
    // not persisted yet here, so there's no recoverable row to mark — the alarm is
    // the operator's recovery signal.
    let priceId: string | null = null
    try {
      priceId = getPriceIdForRequest({
        category: input.category as ServiceCategory,
        subtype: input.subtype,
        answers: input.answers,
      })
    } catch (priceConfigError) {
      await reportCheckoutSessionFailure(priceConfigError, {
        intakeId: "",
        category: input.category,
        failedPriceRole: "base",
      })
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }
    const amountCents = getAmountCentsForRequest({
      category: input.category as ServiceCategory,
      subtype: input.subtype,
      answers: input.answers,
    })
    if (!priceId) {
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }
    const isPriority = input.answers.is_priority === true
    const priorityPriceId = isPriority ? getOptionalStripePriceEnv("STRIPE_PRICE_PRIORITY_FEE") : null
    if (isPriority && !priorityPriceId) {
      logger.error("Priority checkout requested without STRIPE_PRICE_PRIORITY_FEE", {
        category: input.category,
        subtype: input.subtype,
      })
      return { success: false, error: "Priority review is temporarily unavailable. Please try again without it or contact support." }
    }
    const attribution = normalizeAttributionForStorage(resolvedAttribution)

    // 8. Insert intake + answers (atomic), with idempotency-collision routing
    //    to either the existing-paid success page or a retry-payment session.
    const persistResult = await createIntakeWithAnswers(supabase, {
      input,
      patientId,
      authUserId,
      serviceId: service.id,
      serviceSlug,
      isPriority,
      amountCents,
      priceId,
      attribution,
      baseUrl,
    })
    if (!persistResult.ok) return { success: false, error: persistResult.error }

    if (persistResult.data.kind === "already_paid") {
      return {
        success: true,
        intakeId: persistResult.data.intakeId,
        checkoutUrl: persistResult.data.redirectUrl,
      }
    }
    if (persistResult.data.kind === "retry_existing") {
      logger.info("Retrying checkout for existing pending_payment intake", {
        intakeId: persistResult.data.intakeId,
      })
      return retryPaymentForIntakeAction(persistResult.data.intakeId)
    }

    const intake = persistResult.data.intake

    // 9. Safety triage write + per-episode compliance audit + fraud flags.
    await applySafetyTriage(supabase, {
      intakeId: intake.id,
      answers: input.answers,
      serviceSlug: serviceSlugForSafety,
      safetyCheck,
      intakeFlags,
    })
    await logComplianceAudit({
      intake,
      category: input.category,
      subtype: input.subtype,
      patientId,
      answers: input.answers,
    })
    await persistFraudFlags({ intakeId: intake.id, patientId, fraudResult })

    // 10. Build + create the Stripe Checkout session.
    const cookieStore = await cookies()
    const refCode = cookieStore.get("instantmed_ref")?.value ?? ""
    const referralCoupon = await createReferralCouponIfEligible(patientId, amountCents)

    const sessionParams = buildCheckoutSessionParams({
      intakeId: intake.id,
      patientId,
      patientEmail,
      stripeCustomerId,
      baseUrl,
      category: input.category,
      subtype: input.subtype,
      serviceSlug,
      isPriority,
      priceId,
      priorityPriceId,
      refCode,
      referralCoupon,
      posthogDistinctId: input.posthogDistinctId,
      attribution,
    })

    const sessionResult = await createStripeSessionWithRollback({
      supabase,
      intakeId: intake.id,
      category: input.category,
      idempotencyKey: input.idempotencyKey,
      sessionParams,
    })
    if (!sessionResult.ok) return { success: false, error: sessionResult.error }
    const { sessionId, url } = sessionResult.data

    // 11. Bind the session ID to the intake row + observability.
    await supabase.from("intakes").update({ payment_id: sessionId }).eq("id", intake.id)

    const latencyMs = Date.now() - startTime
    logger.info("Checkout session created successfully", {
      intakeId: intake.id,
      sessionId,
      latencyMs,
    })

    trackIntakeFunnelStep({
      step: "payment_initiated",
      intakeId: intake.id,
      serviceSlug,
      serviceType: input.category,
      userId: authUserId,
    })

    if (latencyMs > 5000) {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureMessage("Checkout latency exceeded 5s threshold", {
        level: "warning",
        tags: {
          source: "checkout_latency",
          service_type: input.category,
          consult_subtype: input.subtype,
        },
        extra: { latencyMs, intakeId: intake.id },
      })
    }

    return { success: true, checkoutUrl: url, intakeId: intake.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("Unexpected error in createIntakeAndCheckoutAction", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      category: input.category,
      subtype: input.subtype,
    })

    const Sentry = await import("@sentry/nextjs")
    Sentry.captureException(error, {
      tags: {
        action: "checkout_session_create",
        service_type: input.category,
        consult_subtype: input.subtype,
        step_id: "checkout_outer_catch",
        checkout_error: "true",
      },
      extra: {
        category: input.category,
        subtype: input.subtype,
        serviceSlug: input.serviceSlug,
        latencyMs: Date.now() - startTime,
      },
    })

    return {
      success: false,
      error: "Something went wrong. Please try again or contact support if the issue persists.",
    }
  }
}
