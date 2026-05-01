import type Stripe from "stripe"

import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult,WebhookContext } from "./types"

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
      .in("payment_status", ["pending", "unpaid", "failed"])
      .select("id")
      .maybeSingle()

    if (updateError) {
      log.error("Failed to mark async checkout payment failure", { eventId: event.id, sessionId: session.id }, updateError)
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
        .select("patient:profiles!intakes_patient_id_fkey(email, full_name), category")
        .eq("id", intakeId)
        .single()

      const patient = (intake?.patient as unknown) as { email: string; full_name: string } | null
      if (patient?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
        await sendPaymentFailedEmail({
          to: patient.email,
          patientName: patient.full_name || "there",
          serviceName: intake?.category || "your request",
          failureReason: "Your payment could not be processed. This can happen with bank transfers or direct debit payments.",
          retryUrl: `${appUrl}/request?resume=${intakeId}`,
          intakeId,
        })
        log.info("Payment failed email sent", { intakeId })
      }
    } catch (emailError) {
      log.error("Failed to send payment failed email", { intakeId }, emailError)
    }
  }
}
