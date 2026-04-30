import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { sendSessionExpiredEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult,WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:checkout-expired")

export async function handleCheckoutSessionExpired(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const session = event.data.object as Stripe.Checkout.Session
  const intakeId = session.metadata?.intake_id || session.metadata?.request_id

  log.info("checkout.session.expired received", {
    eventId: event.id,
    sessionId: session.id,
    intakeId,
  })

  // Atomic claim
  const shouldProcess = await tryClaimEvent(
    supabase,
    event.id,
    event.type,
    intakeId,
    session.id
  )

  if (!shouldProcess) {
    log.info("Expired event already processed", { eventId: event.id })
    return NextResponse.json({ received: true, skipped: true })
  }

  if (intakeId) {
    try {
      // Update intake status and payment_status to expired if still pending payment
      const { error: expireError } = await supabase
        .from("intakes")
        .update({
          status: "expired",
          payment_status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
        .eq("status", "pending_payment")

      if (expireError) {
        log.error("Error expiring intake", { sessionId: session.id }, expireError)
      }

      log.info("Intake session expired", {
        intakeId,
        sessionId: session.id,
      })

      // Send session expired email to patient
      try {
        const { data: intake } = await supabase
          .from("intakes")
          .select("patient:profiles!intakes_patient_id_fkey(email, full_name), category")
          .eq("id", intakeId)
          .single()

        const patient = (intake?.patient as unknown) as { email: string; full_name: string } | null
        if (patient?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
          await sendSessionExpiredEmail({
            to: patient.email,
            patientName: patient.full_name || "there",
            serviceName: intake?.category || "your request",
            resumeUrl: `${appUrl}/request?resume=${intakeId}`,
            intakeId,
          })
          log.info("Session expired email sent", { intakeId })
        }
      } catch (emailError) {
        log.error("Failed to send session expired email", { intakeId }, emailError)
      }

    } catch (error) {
      log.error("Error handling expired session", { intakeId }, error)
    }
  }
}
