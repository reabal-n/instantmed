import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { env } from "@/lib/config/env"
import { buildExpiredCheckoutStartUrl } from "@/lib/email/recovery-links"
import { sendSessionExpiredEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { PAYMENT_REPLACEMENT_LOCK } from "@/lib/stripe/payment-integrity"

import type { HandlerResult, WebhookContext } from "./types"
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
  const shouldProcess = ctx.adminReplay || await tryClaimEvent(
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
      const { data: expiredIntake, error: expireError } = await supabase
        .from("intakes")
        .update({
          status: "expired",
          payment_status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
        .eq("payment_id", session.id)
        .eq("status", "pending_payment")
        .or(`checkout_error.is.null,checkout_error.neq.${PAYMENT_REPLACEMENT_LOCK}`)
        .select("id")
        .maybeSingle()

      if (expireError) {
        log.error("Error expiring intake", { sessionId: session.id }, expireError)
      }

      if (!expiredIntake) {
        log.info("Expired event ignored because checkout session is no longer current", {
          eventId: event.id,
          sessionId: session.id,
        })
        return NextResponse.json({ received: true, skipped: true })
      }

      log.info("Intake session expired", {
        intakeId,
        sessionId: session.id,
      })

      // Send session expired email to patient
      try {
        const { data: intake } = await supabase
          .from("intakes")
          .select("patient:profiles!intakes_patient_id_fkey(email, full_name), category, subtype")
          .eq("id", intakeId)
          .single()

        const patient = (intake?.patient as unknown) as { email: string; full_name: string } | null
        if (patient?.email) {
          await sendSessionExpiredEmail({
            to: patient.email,
            patientName: patient.full_name || "there",
            serviceName: intake?.category || "your request",
            resumeUrl: buildExpiredCheckoutStartUrl({
              appUrl: env.appUrl,
              campaign: "checkout_expired",
              category: intake?.category,
              subtype: (intake as { subtype?: string | null } | null)?.subtype,
            }),
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
