import { after,NextResponse } from "next/server"
import type Stripe from "stripe"

import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult,WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:payment-failed")

export async function handlePaymentIntentFailed(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const intakeId = paymentIntent.metadata?.intake_id || paymentIntent.metadata?.request_id

  log.warn("payment_intent.payment_failed received", {
    eventId: event.id,
    paymentIntentId: paymentIntent.id,
    intakeId,
    failureMessage: paymentIntent.last_payment_error?.message,
  })

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(supabase, event.id, event.type, intakeId, paymentIntent.id)
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (intakeId) {
    const { data: failedIntake, error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_status: "failed",
        status: "checkout_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])
      .select("id")
      .maybeSingle()

    if (updateError) {
      log.error("Failed to mark payment intent failure", { eventId: event.id, paymentIntentId: paymentIntent.id }, updateError)
      return NextResponse.json({ received: true })
    }

    if (!failedIntake) {
      log.info("Payment failure ignored because intake is no longer retryable", {
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
      })
      return NextResponse.json({ received: true, skipped: true })
    }

    // Track business metric: payment failed
    trackBusinessMetric({
      metric: "payment_failed",
      severity: "warning",
      userId: paymentIntent.metadata?.patient_id,
      metadata: {
        intake_id: intakeId,
        failure_message: paymentIntent.last_payment_error?.message,
        payment_intent_id: paymentIntent.id,
      },
    })

    // Send payment failure notification (non-blocking to respect Stripe 3s timeout).
    // If this fails, the email-dispatcher cron will retry from the outbox.
    // Uses after() to keep the serverless function alive until email completes.
    const failedIntakeId = intakeId
    const failureMessage = paymentIntent.last_payment_error?.message || "Your payment could not be processed"
    after(async () => {
      try {
        const { data: intake } = await supabase
          .from("intakes")
          .select("category, patient:profiles!patient_id(email, full_name)")
          .eq("id", failedIntakeId)
          .single()

        const patient = (intake?.patient as unknown) as { email?: string; full_name?: string } | null
        const service = { name: intake?.category || "Service" }

        if (patient?.email) {
          await sendPaymentFailedEmail({
            to: patient.email,
            patientName: patient.full_name || "there",
            serviceName: service?.name || "your request",
            failureReason: failureMessage,
            retryUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"}/patient/intakes/${failedIntakeId}?retry=true`,
            intakeId: failedIntakeId,
          })
          log.info("Sent payment failure notification", { intakeId: failedIntakeId })
        }
      } catch (emailError) {
        log.error("Failed to send payment failure notification", { intakeId: failedIntakeId }, emailError)
      }
    })
  }
}
