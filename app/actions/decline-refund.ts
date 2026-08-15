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
    refund_amount_cents?: number | null
    refund_status?: string | null
    refund_stripe_id?: string | null
    category: string | null
  },
  actorId: string,
  declineUpdatedAt: string,
): Promise<DeclineResult["refund"]> {
  const supabase = createServiceRoleClient()
  const requestedReservationAt = new Date(
    Math.max(Date.now(), Date.parse(declineUpdatedAt) + 1),
  ).toISOString()
  let reservationUpdatedAt: string | null = null

  try {
    // Reserve this request before touching Stripe. The decline transition just
    // returned `declineUpdatedAt`, so this optimistic lock permits exactly one
    // creator. The intakes trigger owns the persisted version timestamp; always
    // use its returned value for later compare-and-swap writes.
    // A webhook that lands while Refund.create is in flight advances
    // `updated_at`; every later local write is guarded by that persisted value
    // and therefore cannot overwrite exact succeeded/failed cash evidence.
    const { data: reserved, error: pendingError } = await supabase
      .from("intakes")
      .update({
        refund_status: "pending",
        refund_error: null,
        updated_at: requestedReservationAt,
      })
      .eq("id", intakeId)
      .eq("updated_at", declineUpdatedAt)
      .select("id, updated_at")
      .maybeSingle()
    if (pendingError || !reserved || typeof reserved.updated_at !== "string") {
      throw new Error(
        pendingError
          ? `Could not reserve refund state: ${pendingError.message}`
          : !reserved
            ? "Could not reserve refund state because the intake changed"
            : "Could not reserve refund state because the persisted version is unavailable",
      )
    }
    reservationUpdatedAt = reserved.updated_at

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
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
        .eq("updated_at", reservationUpdatedAt)

      captureRefundError(intakeId, intake.payment_id, error)

      return {
        status: "failed",
        error,
      }
    }

    // Always a FULL refund outcome. No amount arg means Stripe refunds the
    // remaining unrefunded balance — correct on a retry, and correct when the
    // priority breach auto-refund already returned the $9.95 fee (this call
    // then tops the patient up to full).
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
      {
        idempotencyKey:
          intake.refund_status === "failed" && intake.refund_stripe_id
            ? `refund_decline_${intakeId}_after_${intake.refund_stripe_id}`
            : `refund_decline_${intakeId}`,
      }
    )

    // Refund.create only proves that Stripe accepted the request. Exact balance
    // evidence in the webhook is the sole authority for cash and payment state.
    const { data: acceptedState, error: acceptedStateError } = await supabase
      .from("intakes")
      .update({
        refund_status: "pending",
        refund_stripe_id: refund.id,
        refunded_by: actorId,
        refund_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("updated_at", reservationUpdatedAt)
      .eq("refund_status", "pending")
      .select("id")
      .maybeSingle()
    if (acceptedStateError) {
      throw new Error(`Refund request state write failed: ${acceptedStateError.message}`)
    }
    if (!acceptedState) {
      logger.info("[Decline] Exact refund webhook state won the create-response race", {
        intakeId,
        refundId: refund.id,
      })
    }

    logger.info("[Decline] Refund requested", {
      intakeId,
      refundId: refund.id,
      amount: refund.amount,
    })

    return {
      status: "pending",
      stripeRefundId: refund.id,
      amount: refund.amount,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Stripe error"

    if (reservationUpdatedAt) {
      await supabase
        .from("intakes")
        .update({
          refund_status: "failed",
          refund_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
        .eq("updated_at", reservationUpdatedAt)
        .eq("refund_status", "pending")
    }

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
