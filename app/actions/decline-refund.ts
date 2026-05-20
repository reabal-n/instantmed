/**
 * Refund Processing for Declined Intakes
 *
 * NOTE: No "use server" -- this is a sub-module imported by decline-intake.ts
 * (which has "use server"). Constants can't be exported from "use server" files.
 *
 * Handles Stripe refund logic when an intake is declined:
 * - 100% full refund for every refundable category (no partial logic).
 *   Consults were previously 50% partial; changed to full on 2026-05-20 after
 *   operator feedback that partial refunds caused complaints we resolved by
 *   topping up to full anyway.
 * - Idempotent via a single Stripe idempotency key per intake decline.
 *
 * Extracted from decline-intake.ts for single-responsibility.
 */

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { DeclineResult } from "./decline-intake"

const logger = createLogger("decline-refund")

/**
 * Service categories that receive an automatic full Stripe refund when an
 * intake is declined. Any paid intake in one of these categories gets 100%
 * back; anything outside this list falls through to `refund_status="not_eligible"`
 * and the operator can still issue a manual refund from the intake detail UI.
 */
export const REFUND_ON_DECLINE_CATEGORIES = ["medical_certificate", "prescription", "consult"]

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

    // Always full refund. No amount arg means Stripe refunds the full remaining
    // unrefunded amount, which is the correct behaviour even on a retry.
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          intake_id: intakeId,
          category: intake.category || "unknown",
          declined_by: actorId,
          refund_type: "decline",
        },
      },
      { idempotencyKey: `refund_decline_${intakeId}` }
    )

    // Update intake with success
    await supabase
      .from("intakes")
      .update({
        payment_status: "refunded",
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
