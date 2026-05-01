/**
 * Refund Processing for Declined Intakes
 *
 * NOTE: No "use server" -- this is a sub-module imported by decline-intake.ts
 * (which has "use server"). Constants can't be exported from "use server" files.
 *
 * Handles Stripe refund logic when an intake is declined:
 * - Full refund for med certs and prescriptions
 * - 50% partial refund for consults (acknowledges doctor review time)
 * - Idempotent via distinct Stripe idempotency keys
 *
 * Extracted from decline-intake.ts for single-responsibility.
 */

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { DeclineResult } from "./decline-intake"

const logger = createLogger("decline-refund")

// Categories eligible for FULL auto-refund on decline (cheaper, lower-cost-of-goods services)
export const FULL_REFUND_CATEGORIES = ["medical_certificate", "prescription"]

// Categories eligible for PARTIAL auto-refund on decline.
// Consults: 50% refund acknowledges doctor review time was spent while still honoring
// the "refund if we can't help" promise on checkout.
export const PARTIAL_REFUND_CATEGORIES = ["consult"]
export const PARTIAL_REFUND_PERCENT = 0.5

// ============================================================================
// REFUND PROCESSING
// ============================================================================

export async function processRefund(
  intakeId: string,
  intake: {
    payment_id: string | null
    stripe_payment_intent_id: string | null
    amount_cents: number | null
    category: string | null
  },
  actorId: string,
  timestamp: string,
  /** Refund amount in cents. Omit/undefined for full refund (Stripe default). */
  amountCents?: number
): Promise<DeclineResult["refund"]> {
  const supabase = createServiceRoleClient()

  try {
    // Mark as pending
    await supabase
      .from("intakes")
      .update({
        refund_status: "pending",
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    // Get payment intent ID
    let paymentIntentId = intake.stripe_payment_intent_id

    if (!paymentIntentId && intake.payment_id) {
      // Fetch from Stripe checkout session
      try {
        const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
        paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null
      } catch (_stripeError) {
        logger.warn("[Decline] Failed to fetch checkout session", { intakeId, paymentId: intake.payment_id })
      }
    }

    if (!paymentIntentId) {
      const error = "No payment intent ID available for refund"

      await supabase
        .from("intakes")
        .update({
          refund_status: "failed",
          refund_error: error,
          updated_at: timestamp,
        })
        .eq("id", intakeId)

      captureRefundError(intakeId, intake.payment_id, error)

      return {
        status: "failed",
        error,
      }
    }

    // Process Stripe refund - partial refunds get a distinct idempotency key so
    // a future full-refund retry isn't blocked by the partial-refund key.
    const isPartial = amountCents !== undefined
    const idempotencyKey = isPartial
      ? `refund_decline_partial_${intakeId}`
      : `refund_decline_${intakeId}`

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        ...(amountCents !== undefined ? { amount: amountCents } : {}),
        reason: "requested_by_customer",
        metadata: {
          intake_id: intakeId,
          category: intake.category || "unknown",
          declined_by: actorId,
          refund_type: isPartial ? "decline_partial" : "decline",
          ...(isPartial ? { partial_refund_percent: String(PARTIAL_REFUND_PERCENT) } : {}),
        },
      },
      { idempotencyKey }
    )

    // Update intake with success
    await supabase
      .from("intakes")
      .update({
        payment_status: isPartial ? "partially_refunded" : "refunded",
        refund_status: "succeeded",
        refund_stripe_id: refund.id,
        refund_amount_cents: refund.amount,
        refunded_at: timestamp,
        refunded_by: actorId,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    logger.info("[Decline] Refund succeeded", {
      intakeId,
      refundId: refund.id,
      amount: refund.amount,
    })

    return {
      status: "succeeded",
      stripeRefundId: refund.id,
      amount: refund.amount,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Stripe error"

    await supabase
      .from("intakes")
      .update({
        refund_status: "failed",
        refund_error: errorMessage,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    captureRefundError(intakeId, intake.payment_id, errorMessage)

    logger.error("[Decline] Refund failed", { intakeId }, error instanceof Error ? error : undefined)

    return {
      status: "failed",
      error: errorMessage,
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function captureRefundError(
  intakeId: string,
  paymentId: string | null,
  error: string
): void {
  Sentry.captureMessage(`Refund failed for declined intake`, {
    level: "error",
    tags: {
      action: "refund_on_decline",
      intake_id: intakeId,
      stripe_session_id: paymentId || "unknown",
    },
    extra: {
      error,
    },
    fingerprint: ["refund-failed", intakeId],
  })
}
