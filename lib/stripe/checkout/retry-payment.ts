/**
 * Retry payment for an intake that is `pending_payment` or `checkout_failed`
 * with an unpaid/failed payment_status. Re-validates safety, expires any
 * stale session, then creates a fresh Stripe Checkout session for the same
 * intake row.
 *
 * Used by the patient retry-payment UI in `app/patient/intakes/[id]/client.tsx`
 * and indirectly by `createIntakeAndCheckoutAction` when an idempotency-key
 * collision points at a still-retryable existing intake.
 */

import { cookies } from "next/headers"

import { trackIntakeFunnelStep } from "@/lib/analytics/posthog-server"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { getIntakeAnswersForPaymentSafety } from "@/lib/data/intake-answers"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { checkSafetyForServer, validateSafetyFieldsPresent } from "@/lib/safety/evaluate"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory } from "@/types/services"

import { reportCheckoutSessionFailure } from "../checkout-error-alarm"
import { getPriceIdForRequest, normalizeStripePriceId, stripe } from "../client"
import { buildPaymentIntentMetadata, canRetryPaymentForIntake } from "../payment-integrity"
import {
  isHighStakesPaymentLock,
  isMissingSafetyInformationPaymentLock,
} from "../payment-safety-lock"
import { createReferralCouponIfEligible } from "../referral-coupon"
import {
  attachCheckoutSession,
  cancelHighStakesUnpaidIntake,
  claimCheckoutSessionReplacement,
  invalidateCheckoutSessionForSafety,
} from "./checkout-session-safety"
import { getBaseUrl, getServiceSlug, isValidUrl } from "./helpers"
import { getHighStakesCheckoutBlock, isMedicalCertificateIntake } from "./high-stakes-validation"
import { holdCheckoutForMissingSafetyInformation } from "./missing-safety-payment-hold"
import { preflightPriorityPriceForRecovery } from "./priority-price-recovery"
import type { CheckoutResult } from "./types"

const logger = createLogger("stripe-checkout-retry")

const RETRY_PAYMENT_STATE_ERROR =
  "No new payment session was created. Please refresh your request status. If you completed payment, contact support before trying again."
const PRIORITY_RECOVERY_ERROR =
  "Priority review is temporarily unavailable. Your request was not changed and no new checkout was opened. Please try again later or contact support."
export async function retryPaymentForIntakeAction(intakeId: string): Promise<CheckoutResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return { success: false, error: "You must be logged in" }
    }

    const rateLimitResult = await checkServerActionRateLimit(authUser.user.id, "sensitive")
    if (!rateLimitResult.success) {
      return {
        success: false,
        error: rateLimitResult.error || "Too many payment attempts. Please try again later.",
      }
    }

    const patientId = authUser.profile.id
    const patientEmail = authUser.user.email
    const supabase = createServiceRoleClient()

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("*, service:services!service_id(id, slug, name, type, price_cents)")
      .eq("id", intakeId)
      .eq("patient_id", patientId)
      .single()

    if (intakeError || !intake) {
      return { success: false, error: "Request not found" }
    }

    if (!canRetryPaymentForIntake(intake.status, intake.payment_status)) {
      return { success: false, error: "This request has already been paid or is not awaiting payment" }
    }

    // Re-evaluate safety so a saved-then-retried intake cannot bypass new
    // safety rules introduced after the original submission.
    const categoryForSafety = intake.category as ServiceCategory | null
    const serviceForSafety = intake.service as {
      slug: string
      price_cents: number
      type?: string | null
    } | null
    const serviceSlugForSafety =
      serviceForSafety?.slug ||
      (categoryForSafety ? getServiceSlug(categoryForSafety, intake.subtype || "") : "consult")
    const intakeAnswers = await getIntakeAnswersForPaymentSafety(intake.id)
    if (intakeAnswers === null) {
      logger.error(
        "Could not read persisted answers before payment retry",
        { intakeId: intake.id },
        new Error("Authoritative intake answer read failed"),
      )
      return { success: false, error: RETRY_PAYMENT_STATE_ERROR }
    }

    const isMedicalCertificate = isMedicalCertificateIntake(categoryForSafety, serviceForSafety)
    const highStakesBlock = isMedicalCertificate
      ? getHighStakesCheckoutBlock(intakeAnswers)
      : null

    if (highStakesBlock) {
      logger.warn("High-stakes use case blocked retry payment", {
        intakeId,
        matched: highStakesBlock.matched,
        serviceSlug: serviceSlugForSafety,
      })

      await recordSafetyEvaluationForOperators({
        answers: intakeAnswers,
        context: "retry_payment",
        requestId: intakeId,
        result: highStakesBlock.safetyCheck,
        serviceSlug: serviceSlugForSafety,
      })

      const cancellation = await cancelHighStakesUnpaidIntake({
        initialState: {
          payment_id: intake.payment_id,
          payment_status: intake.payment_status,
          status: intake.status,
        },
        intakeId: intake.id,
        patientId,
        source: "retry_payment",
        supabase,
      })

      if (cancellation === "cancelled") {
        revalidatePatient({ intakeId })
        revalidateStaff({ intakeId })
        return { success: false, error: highStakesBlock.retryPaymentError }
      }

      return { success: false, error: RETRY_PAYMENT_STATE_ERROR }
    }

    if (isHighStakesPaymentLock(intake.checkout_error)) {
      return { success: false, error: RETRY_PAYMENT_STATE_ERROR }
    }

    if (isMissingSafetyInformationPaymentLock(intake.checkout_error)) {
      const hold = await holdCheckoutForMissingSafetyInformation({
        intakeId: intake.id,
        missingFields: [],
        patientId,
        source: "retry_payment",
        supabase,
      })
      if (hold !== "state_changed") {
        revalidatePatient({ intakeId: intake.id, patientId })
        revalidateStaff({ intakeId: intake.id, patientId })
      }
      return {
        success: false,
        error:
          hold === "held"
            ? "Required medical information is missing. Please start a new request before trying payment again."
            : RETRY_PAYMENT_STATE_ERROR,
      }
    }

    const fieldCheck = validateSafetyFieldsPresent(serviceSlugForSafety, intakeAnswers)
    if (!fieldCheck.valid) {
      logger.warn("Safety fields missing at checkout", {
        serviceSlug: serviceSlugForSafety,
        missingFields: fieldCheck.missingFields,
      })
      await recordSafetyEvaluationForOperators({
        answers: intakeAnswers,
        context: "retry_payment",
        requestId: intakeId,
        result: {
          isAllowed: false,
          outcome: "REQUEST_MORE_INFO",
          riskTier: "high",
          blockReason: "Required medical information is missing.",
          requiresCall: false,
          triggeredRuleIds: ["missing_safety_fields"],
        },
        serviceSlug: serviceSlugForSafety,
      })
      const hold = await holdCheckoutForMissingSafetyInformation({
        intakeId: intake.id,
        missingFields: fieldCheck.missingFields,
        patientId,
        source: "retry_payment",
        supabase,
      })
      if (hold !== "state_changed") {
        revalidatePatient({ intakeId: intake.id, patientId })
        revalidateStaff({ intakeId: intake.id, patientId })
      }
      return {
        success: false,
        error:
          hold === "held"
            ? "Required medical information is missing. Please start a new request before trying payment again."
            : RETRY_PAYMENT_STATE_ERROR,
      }
    }

    const safetyCheck = checkSafetyForServer(serviceSlugForSafety, intakeAnswers)

    if (!safetyCheck.isAllowed) {
      logger.warn("Safety check blocked retry payment", {
        intakeId,
        serviceSlug: serviceSlugForSafety,
        outcome: safetyCheck.outcome,
        triggeredRules: safetyCheck.triggeredRuleIds,
      })
      await recordSafetyEvaluationForOperators({
        answers: intakeAnswers,
        context: "retry_payment",
        requestId: intakeId,
        result: safetyCheck,
        serviceSlug: serviceSlugForSafety,
      })

      return {
        success: false,
        error:
          safetyCheck.blockReason ||
          "This request cannot be processed online. Please see your regular doctor.",
      }
    }

    const service = intake.service as { slug: string; price_cents: number } | null
    const storedPriceId = normalizeStripePriceId((intake as { stripe_price_id?: string }).stripe_price_id)
    const storedCategory = intake.category as ServiceCategory | null

    const priceId =
      storedPriceId ||
      getPriceIdForRequest({
        category:
          storedCategory ||
          (service?.slug?.includes("med-cert") ? "medical_certificate" : "prescription"),
        subtype: intake.subtype || "",
        answers: {},
      })
    if (!priceId) {
      logger.error("Unable to determine retry checkout price", {
        intakeId: intake.id,
        category: intake.category,
        subtype: intake.subtype,
        serviceSlug: service?.slug,
      })
      return { success: false, error: "Unable to determine pricing. Please contact support." }
    }

    const baseUrl = getBaseUrl()
    if (!isValidUrl(baseUrl)) {
      return { success: false, error: "Server configuration error. Please contact support." }
    }

    const isPriority = (intake as { is_priority?: boolean | null }).is_priority === true
    const priorityPreflight = await preflightPriorityPriceForRecovery({
      category: intake.category || "",
      intakeId: intake.id,
      isPriority,
    })
    if (!priorityPreflight.ok) {
      return { success: false, error: PRIORITY_RECOVERY_ERROR }
    }

    const cookieStore = await cookies()
    const refCode = cookieStore.get("instantmed_ref")?.value ?? ""

    const priceCents = Number((intake as { amount_cents?: number | null }).amount_cents ?? service?.price_cents ?? 0)
    const referralCoupon =
      priceCents > 0 ? await createReferralCouponIfEligible(patientId, priceCents) : null

    const retrySessionMetadata = {
      intake_id: intake.id,
      patient_id: patientId,
      is_retry: "true",
      category: intake.category || "",
      subtype: intake.subtype || "",
      service_slug: serviceSlugForSafety || "",
      ...(refCode ? { referral_code: refCode } : {}),
      ...(referralCoupon
        ? {
            referral_coupon_id: referralCoupon.couponId,
            referral_discount_cents: String(referralCoupon.discountCents),
          }
        : {}),
    }

    const lineItems: Array<{ price: string; quantity: number }> = [{ price: priceId, quantity: 1 }]
    if (priorityPreflight.priceId) {
      lineItems.push({ price: priorityPreflight.priceId, quantity: 1 })
    }

    const sessionParams = {
      line_items: lineItems,
      ...(referralCoupon ? { discounts: [{ coupon: referralCoupon.couponId }] } : {}),
      mode: "payment" as const,
      success_url: `${baseUrl}/patient/intakes/success?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}&payment_retry=1`,
      cancel_url: `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`,
      metadata: retrySessionMetadata,
      payment_intent_data: {
        metadata: buildPaymentIntentMetadata(retrySessionMetadata),
      },
      customer: authUser.profile.stripe_customer_id || undefined,
      customer_email:
        !authUser.profile.stripe_customer_id && patientEmail ? patientEmail : undefined,
      customer_creation:
        !authUser.profile.stripe_customer_id && patientEmail ? ("always" as const) : undefined,
    }

    const replacementState = {
      checkout_error: intake.checkout_error as string | null,
      payment_id: intake.payment_id as string | null,
      payment_status: intake.payment_status as string | null,
      status: intake.status as string | null,
    }
    const replacementClaim = await claimCheckoutSessionReplacement({
      initialState: replacementState,
      intakeId: intake.id,
      patientId,
      source: "retry_payment",
      supabase,
    })
    if (
      replacementClaim.outcome === "state_changed" ||
      replacementClaim.outcome === "unresolved"
    ) {
      return { success: false, error: RETRY_PAYMENT_STATE_ERROR }
    }
    // Claim pending rows before expiring their current Session so the expiry
    // webhook cannot strand the intake between Stripe expiry and replacement
    // attachment. checkout_failed rows are already ignored by that webhook.
    if (intake.payment_id) {
      const invalidation = await invalidateCheckoutSessionForSafety(
        intake.payment_id,
        intake.id,
        {
          intakeStatus: intake.status,
          paymentStatus: intake.payment_status,
          storedPaymentId: intake.payment_id,
        },
      )
      if (invalidation !== "invalidated") {
        return { success: false, error: RETRY_PAYMENT_STATE_ERROR }
      }
    }

    let session
    try {
      // Stable retry idempotency key derived from intake + previous payment.
      const retryIdempotencyKey = `retry_${intake.id}_${intake.payment_id || "initial"}`
      session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: retryIdempotencyKey,
      })
    } catch (stripeError: unknown) {
      // Alarm on session-create failure. "No such price" (a stale/deleted price
      // ID stored on the intake) is the same fatal config catastrophe the authed
      // + guest paths alarm on; retry previously returned a user message with NO
      // Sentry trace (Codex review 2026-06-27).
      const { isMisconfiguredPrice } = await reportCheckoutSessionFailure(stripeError, {
        intakeId: intake.id,
        category: intake.category || "",
        failedPriceRole: "base",
      })
      if (isMisconfiguredPrice) {
        return { success: false, error: "This service is temporarily unavailable. Please try again later." }
      }
      return { success: false, error: "Payment system error. Please try again." }
    }

    if (!session.url) {
      await invalidateCheckoutSessionForSafety(session.id, intake.id)
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    const attachResult = await attachCheckoutSession({
      expectedPaymentId: intake.payment_id,
      intakeId: intake.id,
      patientId,
      sessionId: session.id,
      source: "retry_payment",
      supabase,
    })

    if (attachResult.outcome !== "attached" && attachResult.outcome !== "already_attached") {
      return {
        success: false,
        error: attachResult.outcome === "state_changed" &&
          attachResult.currentState?.payment_status === "paid"
          ? "This request has already been paid — no further payment is needed. Please refresh to see its status."
          : RETRY_PAYMENT_STATE_ERROR,
      }
    }

    // Count the retry in the server-side "reached pay" denominator so retried
    // checkouts aren't invisible in the funnel (mirrors the authed + guest paths;
    // PR-1a's trustworthy payment_initiated → paid rate otherwise omits retries).
    trackIntakeFunnelStep({
      step: "payment_initiated",
      intakeId: intake.id,
      serviceSlug: service?.slug || serviceSlugForSafety || "",
      serviceType: intake.category || "",
    })

    return { success: true, checkoutUrl: session.url, intakeId: intake.id }
  } catch {
    return {
      success: false,
      error: "Something went wrong. Please try again or contact support.",
    }
  }
}
