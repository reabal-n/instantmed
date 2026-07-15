import type Stripe from "stripe"

import { env } from "@/lib/config/env"
import { buildCheckoutPaymentRecoveryUrl } from "@/lib/email/recovery-links"
import { emailRequestTypeLabel } from "@/lib/email/request-type-label"
import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"

import {
  markCheckoutRecoveryNudgeSent,
  readExactCurrentPaymentFailureEmailContext,
  recordExactCurrentPaymentFailure,
  resolvePaymentFailureRecipient,
} from "./payment-failure-recovery"
import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:async-payment-failed")

export async function handleAsyncPaymentFailed(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const session = event.data.object as Stripe.Checkout.Session
  const intakeId = session.metadata?.intake_id

  log.warn("checkout.session.async_payment_failed received", {
    eventId: event.id,
    sessionId: session.id,
    intakeId,
  })

  // Idempotency: skip if already processed (Stripe retries same event on 2xx non-200 or timeout)
  const shouldProcess = ctx.adminReplay || await tryClaimEvent(supabase, event.id, event.type, intakeId ?? undefined, session.id, {})
  if (!shouldProcess) {
    log.info("checkout.session.async_payment_failed already processed, skipping", { eventId: event.id })
    return
  }

  if (intakeId) {
    const failureUpdate = await recordExactCurrentPaymentFailure({
      checkoutSessionId: session.id,
      intakeId,
      ordinaryError: "Asynchronous payment failed",
      source: "checkout.session.async_payment_failed",
      supabase,
    })

    if (failureUpdate.outcome === "database_error") {
      log.error("Failed to record exact-current async checkout payment failure", {
        eventId: event.id,
        sessionId: session.id,
        stage: failureUpdate.stage,
      })
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        `Exact-current async payment failure update failed at ${failureUpdate.stage}`,
        "DB_UPDATE_FAILED",
        { stage: failureUpdate.stage },
      )
      return
    }

    if (failureUpdate.outcome === "state_changed") {
      log.info("Async payment failure ignored because checkout session is no longer current", {
        eventId: event.id,
        sessionId: session.id,
      })
      return
    }

    if (failureUpdate.outcome === "locked_failure") {
      log.info("Recorded async payment failure while preserving recovery suppression", {
        eventId: event.id,
        intakeId,
        sessionId: session.id,
        state: failureUpdate.outcome,
      })
      return
    }

    // Send payment failed email to patient
    try {
      const eligibility = await readExactCurrentPaymentFailureEmailContext({
        checkoutSessionId: session.id,
        intakeId,
        supabase,
      })

      if (eligibility.outcome === "database_error") {
        log.error("Failed to verify async payment failure recovery eligibility", {
          eventId: event.id,
          intakeId,
          sessionId: session.id,
        })
        await addToDeadLetterQueue(
          supabase,
          event.id,
          event.type,
          session.id,
          intakeId,
          "Failed to verify exact-current async payment failure email eligibility",
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
          failureReason: "Your payment could not be processed. This can happen with bank transfers or direct debit payments.",
          retryUrl: buildCheckoutPaymentRecoveryUrl({
            appUrl: env.appUrl,
            campaign: "async_payment_failed",
            intakeId,
            isGuest: Boolean((intake as { guest_email?: string | null } | null)?.guest_email),
          }),
          intakeId,
          checkoutSessionId: session.id,
        })
        if (emailResult.success) {
          const marked = await markCheckoutRecoveryNudgeSent(
            supabase,
            intakeId,
            session.id,
            "checkout.session.async_payment_failed",
          )
          if (marked) {
            log.info("Payment failed email sent", { intakeId })
          } else {
            log.warn("Payment failed email sent but nudge state changed before marking", {
              eventId: event.id,
              intakeId,
              sessionId: session.id,
            })
          }
        }
      }
    } catch {
      log.error("Failed to send payment failed email", {
        eventId: event.id,
        intakeId,
        sessionId: session.id,
      })
    }
  }
}
