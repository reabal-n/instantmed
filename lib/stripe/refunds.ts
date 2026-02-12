import "server-only"
import { stripe } from "./client"
import { createClient } from "@supabase/supabase-js"
import type { RefundStatus, RequestCategory } from "@/types/db"
import { logRefundAction } from "@/lib/security/audit-log"

// Service client for refund operations (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials for refund processing")
  }

  return createClient(supabaseUrl, serviceKey)
}

// Refund eligibility rules - hard-coded constants
// medical_certificate and prescription (repeat scripts) are refundable when declined
// "other" category (consults, new prescriptions) are NOT auto-refundable
const REFUND_ELIGIBLE_CATEGORIES: RequestCategory[] = [
  "medical_certificate",
  "prescription",
]

export interface RefundResult {
  success: boolean
  refunded: boolean
  refundStatus: RefundStatus
  reason: string
  stripeRefundId?: string
  amountRefunded?: number
  error?: string
}

/**
 * Determines if a request category is eligible for refund when declined.
 */
export function isRefundEligible(category: RequestCategory | null): boolean {
  if (!category) return false
  return REFUND_ELIGIBLE_CATEGORIES.includes(category)
}

/**
 * Process a refund for a declined intake if eligible.
 * This function is idempotent - safe to call multiple times.
 * 
 * Supports both new intakes table and legacy requests table for backwards compatibility.
 * 
 * @param intakeId - The intake ID that was declined
 * @param actorId - The doctor/admin who performed the decline action
 * @returns RefundResult with status and details
 */
export async function refundIfEligible(
  intakeId: string,
  actorId: string
): Promise<RefundResult> {
  const supabase = getServiceClient()
  const timestamp = new Date().toISOString()

  try {
    // STEP 1: Fetch intake with category and payment info (intakes is single source of truth)
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, category, status, payment_status, patient_id, payment_id")
      .eq("id", intakeId)
      .single()

    if (!intake) {
      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "Intake not found",
        error: intakeError?.message,
      }
    }

    // STEP 2: Verify intake is declined
    if (intake.status !== "declined") {
      return {
        success: true,
        refunded: false,
        refundStatus: "not_applicable",
        reason: "Intake is not declined",
      }
    }

    // STEP 3: Check category eligibility
    const category = intake.category as RequestCategory | null
    if (!isRefundEligible(category)) {
      const reason = category 
        ? `Category '${category}' is not eligible for auto-refund`
        : "No category specified"
      
      // Update intake to reflect ineligibility
      await supabase
        .from("intakes")
        .update({
          refund_status: "not_eligible",
          refund_reason: reason,
          updated_at: timestamp,
        })
        .eq("id", intakeId)

      return {
        success: true,
        refunded: false,
        refundStatus: "not_eligible",
        reason,
      }
    }

    // STEP 4: Get Stripe payment intent ID
    // For intakes, we need to fetch from checkout session via payment_id
    // For legacy requests, check payments table
    let stripePaymentIntentId: string | null = null
    let paymentAmount: number | null = null

    if (intake.payment_id) {
      // Fetch payment intent from Stripe checkout session
      try {
        const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
        stripePaymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id || null
        paymentAmount = session.amount_total
      } catch (_stripeError) {
        // Session may have expired, try to find payment in DB
      }
    }

    // Fallback: check payments table (legacy path)
    if (!stripePaymentIntentId) {
      const { data: payment } = await supabase
        .from("payments")
        .select("stripe_payment_intent_id, amount, stripe_refund_id, refund_status, refund_amount")
        .eq("intake_id", intakeId)
        .eq("status", "paid")
        .single()

      if (payment) {
        // IDEMPOTENCY CHECK - Already refunded via payments table?
        if (payment.stripe_refund_id || payment.refund_status === "refunded") {
          return {
            success: true,
            refunded: true,
            refundStatus: "refunded",
            reason: "Refund already processed",
            stripeRefundId: payment.stripe_refund_id,
            amountRefunded: payment.refund_amount,
          }
        }
        stripePaymentIntentId = payment.stripe_payment_intent_id
        paymentAmount = payment.amount
      }
    }

    if (!stripePaymentIntentId) {
      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "No Stripe payment intent ID available",
      }
    }

    // STEP 5: Check if already refunded on intake
    const { data: currentIntake } = await supabase
      .from("intakes")
      .select("payment_status, refunded_at")
      .eq("id", intakeId)
      .single()

    if (currentIntake?.payment_status === "refunded") {
      return {
        success: true,
        refunded: true,
        refundStatus: "refunded",
        reason: "Refund already processed",
      }
    }

    // STEP 6: Mark as processing (prevents concurrent refunds)
    const { error: lockError } = await supabase
      .from("intakes")
      .update({
        payment_status: "refund_processing",
        updated_at: timestamp,
      })
      .eq("id", intakeId)
      .in("payment_status", ["paid", "pending"]) // Only if not already processing

    if (lockError) {
      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "Could not acquire processing lock",
        error: lockError.message,
      }
    }

    // STEP 7: Process Stripe refund
    // Log refund attempt
    await logRefundAction("refund_attempted", actorId, intakeId, {
      category: category || undefined,
      amount: paymentAmount ?? undefined,
      reason: "Auto-refund on decline",
    })

    let stripeRefund
    try {
      // Generate idempotency key to prevent duplicate refunds on retry
      const idempotencyKey = `refund_${intakeId}_${stripePaymentIntentId}`

      stripeRefund = await stripe.refunds.create(
        {
          payment_intent: stripePaymentIntentId,
          reason: "requested_by_customer",
          metadata: {
            intake_id: intakeId,
            category: category || "unknown",
            declined_by: actorId,
            refund_type: "auto_decline",
          },
        },
        {
          idempotencyKey,
        }
      )
    } catch (stripeError) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error"

      // Log refund failure
      await logRefundAction("refund_failed", actorId, intakeId, {
        category: category || undefined,
        amount: paymentAmount ?? undefined,
        error: errorMessage,
        reason: "Stripe API error",
      })

      // Mark as failed
      await supabase
        .from("intakes")
        .update({
          payment_status: "refund_failed",
          refund_reason: `Stripe error: ${errorMessage}`,
          updated_at: timestamp,
        })
        .eq("id", intakeId)

      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: `Stripe refund failed: ${errorMessage}`,
        error: errorMessage,
      }
    }

    // STEP 8: Update intake with refund details
    const refundReason = `Auto-refunded: ${category} intake declined`
    
    await supabase
      .from("intakes")
      .update({
        payment_status: "refunded",
        refunded_at: timestamp,
        refunded_by: actorId,
        refund_reason: refundReason,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    // Also update legacy payments table if it exists
    await supabase
      .from("payments")
      .update({
        status: "refunded",
        refund_status: "refunded",
        stripe_refund_id: stripeRefund.id,
        refund_amount: stripeRefund.amount,
        refund_reason: refundReason,
        refunded_at: timestamp,
        updated_at: timestamp,
      })
      .eq("intake_id", intakeId)

    // Log refund success
    await logRefundAction("refund_succeeded", actorId, intakeId, {
      category: category || undefined,
      amount: stripeRefund.amount,
      stripeRefundId: stripeRefund.id,
      reason: refundReason,
    })

    return {
      success: true,
      refunded: true,
      refundStatus: "refunded",
      reason: refundReason,
      stripeRefundId: stripeRefund.id,
      amountRefunded: stripeRefund.amount,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return {
      success: false,
      refunded: false,
      refundStatus: "failed",
      reason: "Unexpected error during refund processing",
      error: errorMessage,
    }
  }
}

/**
 * Get refund status for a request (for UI display)
 */
export async function getRefundStatus(requestId: string): Promise<{
  status: RefundStatus
  reason: string | null
  refundedAt: string | null
  amount: number | null
} | null> {
  const supabase = getServiceClient()

  const { data: payment, error } = await supabase
    .from("payments")
    .select("refund_status, refund_reason, refunded_at, refund_amount")
    .eq("intake_id", requestId)
    .single()

  if (error || !payment) {
    return null
  }

  return {
    status: payment.refund_status || "not_applicable",
    reason: payment.refund_reason,
    refundedAt: payment.refunded_at,
    amount: payment.refund_amount,
  }
}
