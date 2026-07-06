import { after,NextResponse } from "next/server"
import type Stripe from "stripe"

import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { buildCheckoutPaymentRecoveryUrl } from "@/lib/email/recovery-links"
import { emailRequestTypeLabel } from "@/lib/email/request-type-label"
import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"

import {
  markCheckoutRecoveryNudgeSent,
  type PaymentFailureIntakeEmailContext,
  resolvePaymentFailureRecipient,
} from "./payment-failure-recovery"
import type { HandlerResult,WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:payment-failed")

type CheckoutSessionResolution =
  | { success: true; checkoutSessionId: string | null }
  | { success: false; error: unknown }

async function resolveCheckoutSessionIdForPaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<CheckoutSessionResolution> {
  const metadataSessionId = paymentIntent.metadata?.checkout_session_id || paymentIntent.metadata?.session_id
  if (metadataSessionId) return { success: true, checkoutSessionId: metadataSessionId }

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 1,
      payment_intent: paymentIntent.id,
    })
    return { success: true, checkoutSessionId: sessions.data[0]?.id ?? null }
  } catch (error) {
    log.warn("Could not resolve Checkout Session for failed PaymentIntent", {
      paymentIntentId: paymentIntent.id,
    }, error instanceof Error ? error : undefined)
    return { success: false, error }
  }
}

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
    const checkoutSessionResolution = await resolveCheckoutSessionIdForPaymentIntent(paymentIntent)
    if (!checkoutSessionResolution.success) {
      return NextResponse.json({ error: "Failed to verify checkout session" }, { status: 500 })
    }

    const checkoutSessionId = checkoutSessionResolution.checkoutSessionId
    if (!checkoutSessionId) {
      log.warn("Payment failure ignored because current checkout session could not be verified", {
        eventId: event.id,
        intakeId,
        paymentIntentId: paymentIntent.id,
      })
      return NextResponse.json({ received: true, skipped: true, reason: "missing_checkout_session" })
    }

    const { data: failedIntake, error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_status: "failed",
        status: "checkout_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("payment_id", checkoutSessionId)
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
        checkoutSessionId,
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
          .select("category, guest_email, patient:profiles!patient_id(email, full_name)")
          .eq("id", failedIntakeId)
          .single()

        const { email, name } = resolvePaymentFailureRecipient(intake as PaymentFailureIntakeEmailContext | null)

        if (email) {
          const emailResult = await sendPaymentFailedEmail({
            to: email,
            patientName: name,
            serviceName: emailRequestTypeLabel(intake?.category),
            failureReason: failureMessage,
            retryUrl: buildCheckoutPaymentRecoveryUrl({
              appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
              campaign: "payment_failed",
              intakeId: failedIntakeId,
              isGuest: Boolean((intake as { guest_email?: string | null } | null)?.guest_email),
            }),
            intakeId: failedIntakeId,
            checkoutSessionId,
          })
          if (emailResult.success) {
            await markCheckoutRecoveryNudgeSent(supabase, failedIntakeId, "payment_intent.payment_failed")
            log.info("Sent payment failure notification", { intakeId: failedIntakeId })
          }
        }
      } catch (emailError) {
        log.error("Failed to send payment failure notification", { intakeId: failedIntakeId }, emailError)
      }
    })
  }
}
