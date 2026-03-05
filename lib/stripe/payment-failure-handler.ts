import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import type Stripe from "stripe"

const logger = createLogger("PaymentFailure")

interface PaymentFailureContext {
  paymentIntentId: string
  customerId?: string
  amount: number
  currency: string
  failureCode?: string
  failureMessage?: string
}

/**
 * Handle payment_intent.payment_failed webhook events
 * Updates intake status and optionally triggers retry flow
 */
export async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent
): Promise<{ handled: boolean; intakeId?: string }> {
  const context: PaymentFailureContext = {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer as string | undefined,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    failureCode: paymentIntent.last_payment_error?.code,
    failureMessage: paymentIntent.last_payment_error?.message,
  }

  logger.info("Processing payment failure", { 
    paymentIntentId: context.paymentIntentId,
    failureCode: context.failureCode 
  })

  const supabase = createServiceRoleClient()

  // Find the associated intake
  // Strategy 1: Look up by stripe_payment_intent_id (set after checkout.session.completed)
  let intake: { id: string; patient_id: string; status: string } | null = null
  let findError: unknown = null

  const { data: intakeByPi, error: piError } = await supabase
    .from("intakes")
    .select("id, patient_id, status")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle()

  if (piError) {
    logger.error("Failed to find intake by stripe_payment_intent_id", {
      paymentIntentId: context.paymentIntentId
    }, piError)
    findError = piError
  }

  intake = intakeByPi

  // Strategy 2: If not found, try via metadata.intake_id (always set during checkout creation)
  if (!intake && paymentIntent.metadata?.intake_id) {
    const { data: intakeByMeta, error: metaError } = await supabase
      .from("intakes")
      .select("id, patient_id, status")
      .eq("id", paymentIntent.metadata.intake_id)
      .maybeSingle()

    if (metaError) {
      logger.error("Failed to find intake by metadata.intake_id", {
        paymentIntentId: context.paymentIntentId,
        metadataIntakeId: paymentIntent.metadata.intake_id,
      }, metaError)
    }

    if (intakeByMeta) {
      intake = intakeByMeta
      // Backfill stripe_payment_intent_id since it wasn't set yet
      await supabase
        .from("intakes")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", intakeByMeta.id)
      logger.info("Backfilled stripe_payment_intent_id from payment failure handler", {
        intakeId: intakeByMeta.id,
        paymentIntentId: paymentIntent.id,
      })
    }
  }

  if (findError && !intake) {
    return { handled: false }
  }

  if (!intake) {
    logger.warn("No intake found for failed payment", {
      paymentIntentId: context.paymentIntentId
    })
    return { handled: false }
  }

  // Update intake with failure info
  const { error: updateError } = await supabase
    .from("intakes")
    .update({
      payment_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intake.id)

  if (updateError) {
    logger.error("Failed to update intake payment status", { 
      intakeId: intake.id 
    }, updateError)
    return { handled: false, intakeId: intake.id }
  }

  // Log to audit
  await supabase.from("audit_logs").insert({
    action: "payment_failed",
    intake_id: intake.id,
    actor_id: intake.patient_id,
    metadata: {
      payment_intent_id: context.paymentIntentId,
      failure_code: context.failureCode,
      failure_message: context.failureMessage,
      amount: context.amount,
      currency: context.currency,
    },
  })

  logger.info("Payment failure processed", { 
    intakeId: intake.id, 
    failureCode: context.failureCode 
  })

  return { handled: true, intakeId: intake.id }
}

/**
 * Check if a payment failure is retryable
 */
export function isRetryableFailure(failureCode?: string): boolean {
  const retryableCodes = [
    "card_declined", // Some declines are temporary
    "processing_error",
    "rate_limit",
    "insufficient_funds", // User might add funds
  ]
  
  const nonRetryableCodes = [
    "expired_card",
    "incorrect_cvc",
    "incorrect_number",
    "invalid_expiry_month",
    "invalid_expiry_year",
    "stolen_card",
    "lost_card",
  ]

  if (!failureCode) return false
  if (nonRetryableCodes.includes(failureCode)) return false
  return retryableCodes.includes(failureCode)
}
