import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { env } from "@/lib/config/env"
import { buildExpiredCheckoutStartUrl } from "@/lib/email/recovery-links"
import { emailRequestTypeLabel } from "@/lib/email/request-type-label"
import { sendSessionExpiredEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import { PAYMENT_REPLACEMENT_LOCK } from "@/lib/stripe/payment-integrity"
import { PAYMENT_SAFETY_LOCKS } from "@/lib/stripe/payment-safety-lock"

import type { HandlerResult, WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:checkout-expired")
const EXPIRY_LOCKED_CHECKOUT_ERRORS_FILTER =
  `(${[PAYMENT_REPLACEMENT_LOCK, ...PAYMENT_SAFETY_LOCKS].join(",")})`

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
      // Keep nullable checkout_error guards as separate PATCHes. Combining
      // them with PostgREST `.or()` produces a 42703 error on this update path.
      const expireWithGuard = (checkoutErrorGuard: "null" | "not_locked") => {
        let expireQuery = supabase
          .from("intakes")
          .update({
            status: "expired",
            payment_status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", intakeId)
          .eq("payment_id", session.id)
          .eq("status", "pending_payment")

        expireQuery = checkoutErrorGuard === "null"
          ? expireQuery.is("checkout_error", null)
          : expireQuery.not(
              "checkout_error",
              "in",
              EXPIRY_LOCKED_CHECKOUT_ERRORS_FILTER,
            )

        return expireQuery.select("id").maybeSingle()
      }

      let { data: expiredIntake, error: expireError } = await expireWithGuard("null")
      if (!expireError && !expiredIntake) {
        const fallbackExpiry = await expireWithGuard("not_locked")
        expiredIntake = fallbackExpiry.data
        expireError = fallbackExpiry.error
      }

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
          const emailResult = await sendSessionExpiredEmail({
            to: patient.email,
            patientName: patient.full_name || "there",
            serviceName: emailRequestTypeLabel(intake?.category, intake?.subtype),
            startUrl: buildExpiredCheckoutStartUrl({
              appUrl: env.appUrl,
              campaign: "checkout_expired",
              category: intake?.category,
              subtype: (intake as { subtype?: string | null } | null)?.subtype,
            }),
            intakeId,
          })
          if (emailResult.success) {
            log.info("Session expired email sent", { intakeId })
          } else {
            log.error("Failed to send session expired email", {
              intakeId,
              error: emailResult.error,
            })
          }
        }
      } catch (emailError) {
        log.error("Failed to send session expired email", { intakeId }, emailError)
      }

    } catch (error) {
      log.error("Error handling expired session", { intakeId }, error)
    }
  }
}
