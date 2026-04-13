import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("stripe-refunds")

// Categories eligible for auto-refund on decline
const REFUND_ELIGIBLE_CATEGORIES = ["medical_certificate", "prescription", "consult"]

interface RefundResult {
  refunded: boolean
  reason: string
  refundStatus?: string
  stripeRefundId?: string
  amount?: number
}

/**
 * Check if an intake is eligible for a refund and process it if so.
 * Used by legacy API routes (bulk-action, update-request).
 *
 * For new code, prefer the canonical `declineIntake` action which handles
 * the full decline flow including refunds.
 */
export async function refundIfEligible(
  intakeId: string,
  actorId: string
): Promise<RefundResult> {
  const supabase = createServiceRoleClient()

  // Fetch intake payment info
  const { data: intake, error: fetchError } = await supabase
    .from("intakes")
    .select("id, category, payment_status, payment_id, stripe_payment_intent_id, amount_cents")
    .eq("id", intakeId)
    .single()

  if (fetchError || !intake) {
    return { refunded: false, reason: "Intake not found" }
  }

  // Check eligibility
  if (intake.payment_status !== "paid") {
    return { refunded: false, reason: "Not paid", refundStatus: "not_applicable" }
  }

  if (!REFUND_ELIGIBLE_CATEGORIES.includes(intake.category || "")) {
    return { refunded: false, reason: "Category not eligible for refund", refundStatus: "not_eligible" }
  }

  // Skip in E2E mode
  if (process.env.E2E_MODE === "true" || process.env.PLAYWRIGHT === "1") {
    await supabase
      .from("intakes")
      .update({ refund_status: "skipped_e2e", updated_at: new Date().toISOString() })
      .eq("id", intakeId)

    return { refunded: false, reason: "Skipped (E2E mode)", refundStatus: "skipped_e2e" }
  }

  const timestamp = new Date().toISOString()

  // Mark as pending
  await supabase
    .from("intakes")
    .update({ refund_status: "pending", updated_at: timestamp })
    .eq("id", intakeId)

  // Resolve payment intent ID
  let paymentIntentId = intake.stripe_payment_intent_id

  if (!paymentIntentId && intake.payment_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
      paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null
    } catch {
      logger.warn("Failed to fetch checkout session for refund", { intakeId, paymentId: intake.payment_id })
    }
  }

  if (!paymentIntentId) {
    const error = "No payment intent ID available for refund"
    await supabase
      .from("intakes")
      .update({ refund_status: "failed", refund_error: error, updated_at: timestamp })
      .eq("id", intakeId)

    Sentry.captureMessage("Refund failed: no payment intent", {
      level: "error",
      tags: { action: "refund_if_eligible", intake_id: intakeId },
    })

    return { refunded: false, reason: error, refundStatus: "failed" }
  }

  try {
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

    logger.info("Refund succeeded", { intakeId, refundId: refund.id, amount: refund.amount })

    return {
      refunded: true,
      reason: "Refund processed",
      refundStatus: "succeeded",
      stripeRefundId: refund.id,
      amount: refund.amount,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Stripe error"

    await supabase
      .from("intakes")
      .update({ refund_status: "failed", refund_error: errorMessage, updated_at: timestamp })
      .eq("id", intakeId)

    logger.error("Refund failed", { intakeId }, error instanceof Error ? error : undefined)

    Sentry.captureMessage("Stripe refund failed", {
      level: "error",
      tags: { action: "refund_if_eligible", intake_id: intakeId },
      extra: { error: errorMessage },
    })

    return { refunded: false, reason: errorMessage, refundStatus: "failed" }
  }
}
