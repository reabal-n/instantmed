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
 * - Idempotent via the durable refund-attempt ledger, with at most one
 *   evidence-backed successor when a terminal Stripe failure or reversal
 *   leaves the full-refund obligation unmet.
 *
 * Extracted from decline-intake.ts for single-responsibility.
 */

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import { requestStripeRefund } from "@/lib/stripe/refund-attempts"
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
    refund_amount_cents?: number | null
    refund_status?: string | null
    refund_stripe_id?: string | null
    category: string | null
  },
  actorId: string,
  _declineUpdatedAt: string,
): Promise<DeclineResult["refund"]> {
  const supabase = createServiceRoleClient()

  try {
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
      captureRefundError(intakeId, intake.payment_id, error)
      return {
        status: "failed",
        error,
      }
    }

    if (!Number.isSafeInteger(intake.amount_cents) || (intake.amount_cents ?? 0) <= 0) {
      const error = "No valid paid amount available for refund"
      captureRefundError(intakeId, intake.payment_id, error)
      return { status: "failed", error }
    }

    // The attempt RPC serialises against exact cash, computes the remaining
    // amount, preserves support-independent actor attribution, and owns crash
    // recovery. No action-level intake write is allowed on this money path.
    const result = await requestStripeRefund({ stripe, supabase }, {
      actorProfileId: actorId,
      intakeId,
      paymentIntentId,
      refundType: "decline",
      targetTotalCents: intake.amount_cents as number,
    })

    if (result.status === "failed") {
      captureRefundError(intakeId, intake.payment_id, result.error)
      return { status: "failed", error: result.error }
    }
    if (result.status === "cash_satisfied") {
      return { status: "succeeded", amount: 0 }
    }

    logger.info("[Decline] Durable refund attempt reserved", {
      amount: result.amountCents,
      attemptId: result.attemptId,
      intakeId,
      refundId: result.refundId,
      outcome: result.status,
    })
    return {
      status: "pending",
      ...(result.refundId ? { stripeRefundId: result.refundId } : {}),
      amount: result.amountCents,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Stripe error"
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
