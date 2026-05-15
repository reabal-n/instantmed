/**
 * Stripe Checkout session creation:
 *   1. Build line items (with priority add-on if requested)
 *   2. Compose session + payment-intent metadata (referral, attribution, etc.)
 *   3. Create the session under a stable idempotency key
 *   4. Track latency to Sentry
 *   5. Soft-mark intake `checkout_failed` if Stripe rejects, preserving
 *      the audit trail per ARCHITECTURE.md
 *
 * The orchestrator owns the pre-checks (auth, validation, persistence). This
 * module owns Stripe IO.
 */

import {
  type SupabaseClient,
} from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

import { stripe } from "../client"
import { inferStripeLineItemFailureRole, stripePriceErrorUserMessage } from "../line-item-error"
import { buildPaymentIntentMetadata } from "../payment-integrity"
import type { StepResult } from "./types"
import { stepFail, stepOk } from "./types"

const logger = createLogger("stripe-checkout-session")

interface ReferralCoupon {
  couponId: string
  discountCents: number
}

export interface BuildSessionParamsInput {
  intakeId: string
  patientId: string
  patientEmail: string | undefined
  stripeCustomerId: string | undefined
  baseUrl: string
  category: string
  subtype: string
  serviceSlug: string
  isPriority: boolean
  priceId: string
  priorityPriceId: string | null | undefined
  refCode: string
  referralCoupon: ReferralCoupon | null
  posthogDistinctId: string | undefined
  attribution: {
    gclid: string | null
    gbraid: string | null
    wbraid: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_id: string | null
    utm_campaign: string | null
    campaignid: string | null
    adgroupid: string | null
    keyword: string | null
    creative: string | null
    matchtype: string | null
    device: string | null
    network: string | null
  }
}

export function buildCheckoutSessionParams(args: BuildSessionParamsInput) {
  const successUrl = `${args.baseUrl}/patient/intakes/success?intake_id=${args.intakeId}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${args.baseUrl}/patient/intakes/cancelled?intake_id=${args.intakeId}`

  const lineItems: Array<{ price: string; quantity: number }> = [{ price: args.priceId, quantity: 1 }]
  if (args.isPriority && args.priorityPriceId) {
    lineItems.push({ price: args.priorityPriceId, quantity: 1 })
  }

  const sessionMetadata: Record<string, string> = {
    intake_id: args.intakeId,
    patient_id: args.patientId,
    category: args.category,
    subtype: args.subtype,
    service_slug: args.serviceSlug,
    ...(args.refCode ? { referral_code: args.refCode } : {}),
    ...(args.referralCoupon
      ? {
          referral_coupon_id: args.referralCoupon.couponId,
          referral_discount_cents: String(args.referralCoupon.discountCents),
        }
      : {}),
    ...(args.posthogDistinctId ? { ph_distinct_id: args.posthogDistinctId } : {}),
    ...(args.isPriority ? { is_priority: "true" } : {}),
    ...(args.attribution.gclid ? { gclid: args.attribution.gclid } : {}),
    ...(args.attribution.gbraid ? { gbraid: args.attribution.gbraid } : {}),
    ...(args.attribution.wbraid ? { wbraid: args.attribution.wbraid } : {}),
    ...(args.attribution.utm_source ? { utm_source: args.attribution.utm_source } : {}),
    ...(args.attribution.utm_medium ? { utm_medium: args.attribution.utm_medium } : {}),
    ...(args.attribution.utm_id ? { utm_id: args.attribution.utm_id } : {}),
    ...(args.attribution.utm_campaign ? { utm_campaign: args.attribution.utm_campaign } : {}),
    ...(args.attribution.campaignid ? { campaignid: args.attribution.campaignid } : {}),
    ...(args.attribution.adgroupid ? { adgroupid: args.attribution.adgroupid } : {}),
    ...(args.attribution.keyword ? { keyword: args.attribution.keyword } : {}),
    ...(args.attribution.creative ? { creative: args.attribution.creative } : {}),
    ...(args.attribution.matchtype ? { matchtype: args.attribution.matchtype } : {}),
    ...(args.attribution.device ? { device: args.attribution.device } : {}),
    ...(args.attribution.network ? { network: args.attribution.network } : {}),
  }

  const paymentIntentMetadata = buildPaymentIntentMetadata(sessionMetadata)

  // `allow_promotion_codes` and `discounts` are mutually exclusive in Stripe.
  // When a referral coupon is auto-applied we cannot also accept manual codes.
  const allowPromotionCodes = !args.referralCoupon

  return {
    line_items: lineItems,
    ...(args.referralCoupon ? { discounts: [{ coupon: args.referralCoupon.couponId }] } : {}),
    ...(allowPromotionCodes ? { allow_promotion_codes: true } : {}),
    mode: "payment" as const,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: sessionMetadata,
    customer: args.stripeCustomerId || undefined,
    customer_email: !args.stripeCustomerId && args.patientEmail ? args.patientEmail : undefined,
    customer_creation: !args.stripeCustomerId && args.patientEmail ? ("always" as const) : undefined,
    payment_intent_data: {
      metadata: paymentIntentMetadata,
      setup_future_usage: "on_session" as const,
    },
    saved_payment_method_options: args.stripeCustomerId
      ? {
          payment_method_save: "enabled" as const,
        }
      : undefined,
  }
}

export interface CreateSessionResult {
  sessionId: string
  url: string
}

/**
 * Create the Stripe Checkout session and (on Stripe error) soft-mark the
 * intake as `checkout_failed` so operators can see and recover the failed
 * payment-setup attempt. Always uses an idempotency key so client retries
 * are safe.
 */
export async function createStripeSessionWithRollback(args: {
  supabase: SupabaseClient
  intakeId: string
  category: string
  idempotencyKey: string
  sessionParams: ReturnType<typeof buildCheckoutSessionParams>
}): Promise<StepResult<CreateSessionResult>> {
  const { supabase, intakeId, category, idempotencyKey, sessionParams } = args

  let session
  try {
    logger.info("Creating Stripe checkout session", {
      intakeId,
      category,
      hasPriceId: !!sessionParams.line_items?.[0]?.price,
      idempotencyKey,
    })

    const checkoutStartTime = performance.now()
    session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `checkout_${idempotencyKey}`,
    })
    const checkoutDurationMs = Math.round(performance.now() - checkoutStartTime)

    const Sentry = await import("@sentry/nextjs")
    Sentry.setMeasurement("checkout.stripe_session_create_ms", checkoutDurationMs, "millisecond")

    logger.info("Stripe checkout session created", {
      sessionId: session.id,
      hasUrl: !!session.url,
      latencyMs: checkoutDurationMs,
    })
  } catch (stripeError: unknown) {
    const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
    const failedPriceRole = inferStripeLineItemFailureRole(errorMessage, sessionParams.line_items)

    await supabase
      .from("intakes")
      .update({
        status: "checkout_failed",
        checkout_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    logger.error("Stripe checkout session creation failed", {
      error: errorMessage,
      intakeId,
      category,
      failedPriceRole,
    })

    if (errorMessage.includes("No such price")) {
      return stepFail(stripePriceErrorUserMessage(failedPriceRole))
    }
    return stepFail("Payment system error. Please try again or contact support if the issue persists.")
  }

  if (!session.url) {
    logger.error("Stripe session created but no URL returned", { sessionId: session.id })
    await supabase
      .from("intakes")
      .update({
        status: "checkout_failed",
        checkout_error: "No checkout URL returned from Stripe",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
    return stepFail("Failed to create checkout session. Please try again.")
  }

  return stepOk({ sessionId: session.id, url: session.url })
}
