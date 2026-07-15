import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { env } from "@/lib/config/env"
import { buildCheckoutPaymentRecoveryUrl } from "@/lib/email/recovery-links"
import { emailRequestTypeLabel } from "@/lib/email/request-type-label"
import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"

import {
  markCheckoutRecoveryNudgeSent,
  readExactCurrentPaymentFailureEmailContext,
  recordExactCurrentPaymentFailure,
  resolvePaymentFailureRecipient,
} from "./payment-failure-recovery"
import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

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
    declineCode: paymentIntent.last_payment_error?.decline_code,
    eventId: event.id,
    failureCode: paymentIntent.last_payment_error?.code,
    paymentIntentId: paymentIntent.id,
    intakeId,
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

    const failureUpdate = await recordExactCurrentPaymentFailure({
      checkoutSessionId,
      intakeId,
      ordinaryError: "Payment failed",
      source: "payment_intent.payment_failed",
      supabase,
    })

    if (failureUpdate.outcome === "database_error") {
      log.error("Failed to record exact-current payment intent failure", {
        checkoutSessionId,
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        stage: failureUpdate.stage,
      })
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        checkoutSessionId,
        intakeId,
        `Exact-current payment failure update failed at ${failureUpdate.stage}`,
        "DB_UPDATE_FAILED",
        { stage: failureUpdate.stage },
      )
      return NextResponse.json({ error: "Failed to record payment failure" }, { status: 500 })
    }

    if (failureUpdate.outcome === "state_changed") {
      log.info("Payment failure ignored because intake is no longer retryable", {
        checkoutSessionId,
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
      })
      return NextResponse.json({ received: true, skipped: true })
    }

    // A true exact-current Stripe failure counts even when a clinical safety lock
    // suppresses recovery. Keep provider failure prose out of analytics.
    trackBusinessMetric({
      metric: "payment_failed",
      severity: "warning",
      userId: paymentIntent.metadata?.patient_id,
      metadata: {
        decline_code: paymentIntent.last_payment_error?.decline_code,
        event_type: event.type,
        failure_code: paymentIntent.last_payment_error?.code,
        failure_state: failureUpdate.outcome,
        intake_id: intakeId,
        payment_intent_id: paymentIntent.id,
      },
    })

    if (failureUpdate.outcome === "locked_failure") {
      log.info("Recorded payment failure while preserving recovery suppression", {
        checkoutSessionId,
        eventId: event.id,
        intakeId,
        paymentIntentId: paymentIntent.id,
        state: failureUpdate.outcome,
      })
      return NextResponse.json({ received: true })
    }

    // Send payment failure notification (non-blocking to respect Stripe 3s timeout).
    // If this fails, the email-dispatcher cron will retry from the outbox.
    // Uses after() to keep the serverless function alive until email completes.
    const failedIntakeId = intakeId
    const failureMessage = paymentIntent.last_payment_error?.message || "Your payment could not be processed"
    after(async () => {
      try {
        const eligibility = await readExactCurrentPaymentFailureEmailContext({
          checkoutSessionId,
          intakeId: failedIntakeId,
          supabase,
        })

        if (eligibility.outcome === "database_error") {
          log.error("Failed to verify payment failure recovery eligibility", {
            checkoutSessionId,
            intakeId: failedIntakeId,
            paymentIntentId: paymentIntent.id,
          })
          await addToDeadLetterQueue(
            supabase,
            event.id,
            event.type,
            checkoutSessionId,
            failedIntakeId,
            "Failed to verify exact-current payment failure email eligibility",
            "DB_READ_FAILED",
          )
          return
        }
        if (eligibility.outcome === "ineligible") return

        const intake = eligibility.context
        const { email, name } = resolvePaymentFailureRecipient(intake)

        if (email) {
          const emailResult = await sendPaymentFailedEmail({
            to: email,
            patientName: name,
            serviceName: emailRequestTypeLabel(intake?.category),
            failureReason: failureMessage,
            retryUrl: buildCheckoutPaymentRecoveryUrl({
              appUrl: env.appUrl,
              campaign: "payment_failed",
              intakeId: failedIntakeId,
              isGuest: Boolean((intake as { guest_email?: string | null } | null)?.guest_email),
            }),
            intakeId: failedIntakeId,
            checkoutSessionId,
          })
          if (emailResult.success) {
            const marked = await markCheckoutRecoveryNudgeSent(
              supabase,
              failedIntakeId,
              checkoutSessionId,
              "payment_intent.payment_failed",
            )
            if (marked) {
              log.info("Sent payment failure notification", { intakeId: failedIntakeId })
            } else {
              log.warn("Payment failure notification sent but nudge state changed before marking", {
                checkoutSessionId,
                intakeId: failedIntakeId,
                paymentIntentId: paymentIntent.id,
              })
            }
          }
        }
      } catch {
        log.error("Failed to send payment failure notification", {
          checkoutSessionId,
          intakeId: failedIntakeId,
          paymentIntentId: paymentIntent.id,
        })
      }
    })
  }
}
