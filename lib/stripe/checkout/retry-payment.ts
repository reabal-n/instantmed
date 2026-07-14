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
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { checkSafetyForServer, validateSafetyFieldsPresent } from "@/lib/safety/evaluate"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory } from "@/types/services"

import { reportCheckoutSessionFailure } from "../checkout-error-alarm"
import { getOptionalStripePriceEnv, getPriceIdForRequest, normalizeStripePriceId, stripe } from "../client"
import { buildPaymentIntentMetadata, canRetryPaymentForIntake } from "../payment-integrity"
import { createReferralCouponIfEligible } from "../referral-coupon"
import {
  cancelHighStakesUnpaidIntake,
  invalidateCheckoutSessionForSafety,
} from "./checkout-session-safety"
import { getBaseUrl, getServiceSlug, isValidUrl } from "./helpers"
import { getHighStakesCheckoutBlock, isMedicalCertificateIntake } from "./high-stakes-validation"
import type { CheckoutResult } from "./types"

const logger = createLogger("stripe-checkout-retry")

const RETRY_PAYMENT_STATE_ERROR =
  "No new payment session was created. Please refresh your request status. If you completed payment, contact support before trying again."
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
      .select("*, service:services!service_id(id, slug, name, type, price_cents), answers:intake_answers(answers)")
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
    const intakeAnswers =
      (intake.answers as Array<{ answers: Record<string, unknown> }> | null)?.[0]?.answers || {}

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
      return {
        success: false,
        error: `Required medical information is missing. Please go back and complete all questions. Missing: ${fieldCheck.missingFields.join(", ")}`,
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

    // Expire any prior session before creating the next one. Stale Checkout
    // Sessions can otherwise still complete server-side after retry.
    if (intake.payment_id) {
      const invalidation = await invalidateCheckoutSessionForSafety(intake.payment_id, intake.id)
      if (invalidation !== "invalidated") {
        return { success: false, error: RETRY_PAYMENT_STATE_ERROR }
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

    // Preserve the Priority review ($9.95) add-on on retry. Without re-appending
    // it the patient silently loses the priority fee AND the queue priority they
    // paid for; the webhook reconciles amount_cents from session.amount_total so
    // the charge stays correct.
    const isPriority = (intake as { is_priority?: boolean | null }).is_priority === true
    const priorityPriceId = isPriority ? getOptionalStripePriceEnv("STRIPE_PRICE_PRIORITY_FEE") : null
    if (isPriority && !priorityPriceId) {
      logger.warn("Priority retry without STRIPE_PRICE_PRIORITY_FEE; charging base only", { intakeId })
    }
    const lineItems: Array<{ price: string; quantity: number }> = [{ price: priceId, quantity: 1 }]
    if (priorityPriceId) {
      lineItems.push({ price: priorityPriceId, quantity: 1 })
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
      return { success: false, error: "Failed to create checkout session. Please try again." }
    }

    // Reset retryable failures to a fresh pending checkout session.
    let retryAttachQuery = supabase
      .from("intakes")
      .update({
        payment_id: session.id,
        payment_status: "pending",
        status: "pending_payment",
        checkout_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake.id)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])

    retryAttachQuery = intake.payment_id
      ? retryAttachQuery.eq("payment_id", intake.payment_id)
      : retryAttachQuery.is("payment_id", null)

    const { data: retryRows, error: retryUpdateError } = await retryAttachQuery.select("id")

    if (retryUpdateError) {
      logger.error("Failed to attach retry checkout session", { intakeId: intake.id }, retryUpdateError)
      await invalidateCheckoutSessionForSafety(session.id, intake.id)
      return { success: false, error: "Failed to prepare payment retry. Please try again." }
    }

    // A parallel request can receive the same Stripe Session because retry
    // creation uses a stable idempotency key. Reuse that already-current session;
    // otherwise the CAS loser is an orphan and must be invalidated.
    if (!retryRows || retryRows.length === 0) {
      const { data: currentIntake, error: refetchError } = await supabase
        .from("intakes")
        .select("id, status, payment_status, payment_id")
        .eq("id", intake.id)
        .eq("patient_id", patientId)
        .single()

      if (
        !refetchError &&
        currentIntake?.payment_id === session.id &&
        canRetryPaymentForIntake(currentIntake.status, currentIntake.payment_status)
      ) {
        logger.info("Parallel retry already attached the same idempotent session", {
          intakeId: intake.id,
          sessionId: session.id,
        })
      } else {
        logger.warn("Retry attach lost its payment-state CAS; expiring orphan session", {
          intakeId: intake.id,
          sessionId: session.id,
        })
        await invalidateCheckoutSessionForSafety(session.id, intake.id)
        return {
          success: false,
          error: currentIntake?.payment_status === "paid"
            ? "This request has already been paid — no further payment is needed. Please refresh to see its status."
            : RETRY_PAYMENT_STATE_ERROR,
        }
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
