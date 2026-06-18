import type Stripe from "stripe"

import { buildCheckoutPaymentRecoveryUrl } from "@/lib/email/recovery-links"
import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"

import {
  markCheckoutRecoveryNudgeSent,
  type PaymentFailureIntakeEmailContext,
  resolvePaymentFailureRecipient,
} from "./payment-failure-recovery"
import type { HandlerResult,WebhookContext } from "./types"
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
    const { data: failedIntake, error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_status: "failed",
        status: "checkout_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("status", "pending_payment")
      .eq("payment_id", session.id)
      .in("payment_status", ["pending", "unpaid"])
      .select("id")
      .maybeSingle()

    if (updateError) {
      log.error("Failed to mark async checkout payment failure", { eventId: event.id, sessionId: session.id }, updateError)
      await addToDeadLetterQueue(supabase, event.id, event.type, session.id, intakeId, updateError.message, "DB_UPDATE_FAILED")
      return
    }

    if (!failedIntake) {
      log.info("Async payment failure ignored because checkout session is no longer current", {
        eventId: event.id,
        sessionId: session.id,
      })
      return
    }

    // Send payment failed email to patient
    try {
      const { data: intake } = await supabase
        .from("intakes")
        .select("patient:profiles!intakes_patient_id_fkey(email, full_name), category, guest_email")
        .eq("id", intakeId)
        .single()

      const { email, name } = resolvePaymentFailureRecipient(intake as PaymentFailureIntakeEmailContext | null)
      if (email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
        const emailResult = await sendPaymentFailedEmail({
          to: email,
          patientName: name,
          serviceName: intake?.category || "your request",
          failureReason: "Your payment could not be processed. This can happen with bank transfers or direct debit payments.",
          retryUrl: buildCheckoutPaymentRecoveryUrl({
            appUrl,
            campaign: "async_payment_failed",
            intakeId,
            isGuest: Boolean((intake as { guest_email?: string | null } | null)?.guest_email),
          }),
          intakeId,
          checkoutSessionId: session.id,
        })
        if (emailResult.success) {
          await markCheckoutRecoveryNudgeSent(supabase, intakeId, "checkout.session.async_payment_failed")
          log.info("Payment failed email sent", { intakeId })
        }
      }
    } catch (emailError) {
      log.error("Failed to send payment failed email", { intakeId }, emailError)
    }
  }
}
