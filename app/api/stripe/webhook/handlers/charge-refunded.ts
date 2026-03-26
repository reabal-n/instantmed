import type Stripe from "stripe"
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { sendRefundEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import type { WebhookContext, HandlerResult } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:charge-refunded")

export async function handleChargeRefunded(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const charge = event.data.object as Stripe.Charge
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id

  log.info("charge.refunded received", {
    eventId: event.id,
    chargeId: charge.id,
    paymentIntentId,
    amountRefunded: charge.amount_refunded,
  })

  const shouldProcess = await tryClaimEvent(supabase, event.id, event.type, undefined, charge.id)
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (paymentIntentId) {
    // Update intake payment_status based on refund
    const isFullRefund = charge.amount_refunded === charge.amount

    // First try to find intake by stripe_payment_intent_id if we stored it
    let updateResult = await supabase
      .from("intakes")
      .update({
        payment_status: isFullRefund ? "refunded" : "partially_refunded",
        refund_amount_cents: charge.amount_refunded,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .select("id")

    // If no rows updated, try looking up via Stripe API to get session ID
    if (!updateResult.data?.length) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        const sessionId = paymentIntent.metadata?.checkout_session_id

        if (sessionId) {
          updateResult = await supabase
            .from("intakes")
            .update({
              payment_status: isFullRefund ? "refunded" : "partially_refunded",
              refund_amount_cents: charge.amount_refunded,
              updated_at: new Date().toISOString(),
            })
            .eq("payment_id", sessionId)
            .select("id")
        }
      } catch (stripeError) {
        log.warn("Could not retrieve payment intent for refund lookup", {
          paymentIntentId,
          error: stripeError instanceof Error ? stripeError.message : "Unknown error",
        })
      }
    }

    // Also update legacy payments table if it exists
    await supabase
      .from("payments")
      .update({
        status: "refunded",
        refund_status: isFullRefund ? "refunded" : "partially_refunded",
        refund_amount: charge.amount_refunded,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", paymentIntentId)

    if (updateResult.error) {
      log.error("Error updating intake after refund", { paymentIntentId }, updateResult.error)
    } else if (updateResult.data?.length) {
      const intakeId = updateResult.data[0].id
      log.info("Intake payment status updated after refund", {
        paymentIntentId,
        intakeId,
        isFullRefund,
        amountRefunded: charge.amount_refunded,
      })

      // Send refund notification email (non-blocking to respect Stripe 3s timeout).
      // If this fails, the email-dispatcher cron will retry from the outbox.
      const refundIntakeId = intakeId
      const refundAmountCents = charge.amount_refunded
      const refundIsFullRefund = isFullRefund
      ;(async () => {
        try {
          const { data: intake } = await supabase
            .from("intakes")
            .select("id, patient_id")
            .eq("id", refundIntakeId)
            .single()

          if (intake?.patient_id) {
            const { data: patient } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", intake.patient_id)
              .single()

            if (patient?.email) {
              const amountFormatted = `$${(refundAmountCents / 100).toFixed(2)}`
              await sendRefundEmail({
                to: patient.email,
                patientName: patient.full_name || "there",
                amount: amountFormatted,
                refundReason: refundIsFullRefund ? "Your request was declined or cancelled" : "Partial refund processed",
                intakeId: refundIntakeId,
                patientId: patient.id,
              })
              log.info("Refund notification email sent", { intakeId: refundIntakeId, to: patient.email })
            }
          }
        } catch (emailError) {
          log.error("Failed to send refund notification email", { intakeId: refundIntakeId }, emailError)
        }
      })()
    } else {
      log.warn("No intake found to update for refund", { paymentIntentId })
    }
  }
}
