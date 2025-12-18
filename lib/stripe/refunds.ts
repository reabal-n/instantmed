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
 * Process a refund for a declined request if eligible.
 * This function is idempotent - safe to call multiple times.
 * 
 * @param requestId - The request ID that was declined
 * @param actorId - The doctor/admin who performed the decline action
 * @returns RefundResult with status and details
 */
export async function refundIfEligible(
  requestId: string,
  actorId: string
): Promise<RefundResult> {
  const supabase = getServiceClient()
  const timestamp = new Date().toISOString()

  try {
    // STEP 1: Fetch request with category and payment info
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, category, status, payment_status, patient_id")
      .eq("id", requestId)
      .single()

    if (requestError || !request) {
      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "Request not found",
        error: requestError?.message,
      }
    }

    // STEP 2: Verify request is declined
    if (request.status !== "declined") {
      return {
        success: true,
        refunded: false,
        refundStatus: "not_applicable",
        reason: "Request is not declined",
      }
    }

    // STEP 3: Check category eligibility
    const category = request.category as RequestCategory | null
    if (!isRefundEligible(category)) {
      const reason = category 
        ? `Category '${category}' is not eligible for auto-refund`
        : "No category specified"
      
      // Update payment record to reflect ineligibility
      await supabase
        .from("payments")
        .update({
          refund_status: "not_eligible",
          refund_reason: reason,
          updated_at: timestamp,
        })
        .eq("request_id", requestId)
        .eq("status", "paid")

      return {
        success: true,
        refunded: false,
        refundStatus: "not_eligible",
        reason,
      }
    }

    // STEP 4: Fetch payment record with Stripe payment intent
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("request_id", requestId)
      .eq("status", "paid")
      .single()

    if (paymentError || !payment) {
      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "No paid payment record found",
        error: paymentError?.message,
      }
    }

    // STEP 5: IDEMPOTENCY CHECK - Already refunded?
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

    // STEP 6: Check for Stripe payment intent
    if (!payment.stripe_payment_intent_id) {
      
      await supabase
        .from("payments")
        .update({
          refund_status: "failed",
          refund_reason: "No Stripe payment intent ID available",
          updated_at: timestamp,
        })
        .eq("id", payment.id)

      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "No Stripe payment intent ID available",
      }
    }

    // STEP 7: Mark as processing (prevents concurrent refunds)
    const { error: lockError } = await supabase
      .from("payments")
      .update({
        refund_status: "processing",
        updated_at: timestamp,
      })
      .eq("id", payment.id)
      .eq("refund_status", payment.refund_status) // Optimistic lock

    if (lockError) {
      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: "Could not acquire processing lock",
        error: lockError.message,
      }
    }

    // STEP 8: Process Stripe refund
    // Log refund attempt
    await logRefundAction("refund_attempted", actorId, requestId, {
      category: category || undefined,
      amount: payment.amount,
      reason: "Auto-refund on decline",
    })

    let stripeRefund
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          request_id: requestId,
          category: category || "unknown",
          declined_by: actorId,
          refund_type: "auto_decline",
        },
      })
    } catch (stripeError) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error"

      // Log refund failure
      await logRefundAction("refund_failed", actorId, requestId, {
        category: category || undefined,
        amount: payment.amount,
        error: errorMessage,
        reason: "Stripe API error",
      })

      // Mark as failed but don't throw
      await supabase
        .from("payments")
        .update({
          refund_status: "failed",
          refund_reason: `Stripe error: ${errorMessage}`,
          updated_at: timestamp,
        })
        .eq("id", payment.id)

      return {
        success: false,
        refunded: false,
        refundStatus: "failed",
        reason: `Stripe refund failed: ${errorMessage}`,
        error: errorMessage,
      }
    }

    // STEP 9: Update payment record with refund details
    const refundReason = `Auto-refunded: ${category} request declined`
    
    const { error: updateError } = await supabase
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
      .eq("id", payment.id)

    if (updateError) {
      // Refund succeeded in Stripe, but DB update failed - don't fail
    }

    // STEP 10: Update request payment_status
    await supabase
      .from("requests")
      .update({
        payment_status: "refunded",
        updated_at: timestamp,
      })
      .eq("id", requestId)

    // Log refund success
    await logRefundAction("refund_succeeded", actorId, requestId, {
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
    .eq("request_id", requestId)
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
