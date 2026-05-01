import * as Sentry from "@sentry/nextjs"
import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { sendGuestCompleteAccountEmail } from "@/lib/email/template-sender"
import { sendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"
import { createLogger } from "@/lib/observability/logger"
import { startPostPaymentReviewWork } from "@/lib/stripe/post-payment"

import type { HandlerResult, WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:async-payment-succeeded")

async function notifyPaidRequestTelegramForAsyncSession(
  supabase: WebhookContext["supabase"],
  session: Stripe.Checkout.Session,
  intakeId: string | null | undefined,
  patientId: string | null | undefined,
): Promise<void> {
  try {
    await sendPaidRequestTelegramNotification({
      supabase,
      intakeId,
      patientId,
      paymentStatus: "paid",
      amountCents: session.amount_total,
      serviceSlug: session.metadata?.service_slug,
      category: session.metadata?.category,
      subtype: session.metadata?.subtype,
    })
  } catch (err) {
    log.error("Telegram notification error (non-fatal)", { intakeId }, err)
    Sentry.captureException(err, { tags: { source: "telegram-notification-async" }, extra: { intakeId } })
  }
}

export async function handleAsyncPaymentSucceeded(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const session = event.data.object as Stripe.Checkout.Session
  const intakeId = session.metadata?.intake_id
  const patientId = session.metadata?.patient_id

  log.info("checkout.session.async_payment_succeeded received", {
    eventId: event.id,
    sessionId: session.id,
    intakeId,
    patientId,
    amount: session.amount_total,
  })

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(supabase, event.id, event.type, intakeId, session.id, {
    amount: session.amount_total,
    payment_intent: session.payment_intent,
    customer: session.customer,
  })
  if (!shouldProcess) {
    await notifyPaidRequestTelegramForAsyncSession(supabase, session, intakeId, patientId)
    return NextResponse.json({ received: true, skipped: true })
  }

  if (!intakeId) {
    log.error("CRITICAL: Missing intake_id in async_payment_succeeded metadata", {
      eventId: event.id,
      sessionId: session.id,
    })
    return NextResponse.json({ error: "Missing intake_id" }, { status: 200 })
  }

  try {
    const { data: currentIntake } = await supabase
      .from("intakes")
      .select("id, status, payment_status, payment_id")
      .eq("id", intakeId)
      .single()

    if (!currentIntake) {
      log.error("Intake not found for async payment", { intakeId })
      return NextResponse.json({ error: "Intake not found" }, { status: 500 })
    }

    if (currentIntake.payment_id && currentIntake.payment_id !== session.id) {
      log.warn("checkout.session.async_payment_succeeded ignored because session is no longer current", {
        currentPaymentId: currentIntake.payment_id,
        eventId: event.id,
        intakeId,
        sessionId: session.id,
      })
      return NextResponse.json({ received: true, skipped: true, reason: "stale_checkout_session" })
    }

    if (currentIntake.payment_status === "paid") {
      log.info("Intake already paid, skipping async payment update", { intakeId })
      await startPostPaymentReviewWork({
        generateDraftsForIntake,
        intakeId,
        schedule: (task) => after(task),
        serviceCategory: session.metadata?.category || session.metadata?.service_type,
        serviceSlug: session.metadata?.service_slug,
        supabase,
      })
      await notifyPaidRequestTelegramForAsyncSession(supabase, session, intakeId, patientId)
      return NextResponse.json({ received: true, already_paid: true })
    }

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null

    const { data: paidIntake, error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_status: "paid",
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: stripeCustomerId,
      })
      .eq("id", intakeId)
      .eq("payment_id", session.id)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])
      .select("id")
      .maybeSingle()

    if (updateError) {
      log.error("Failed to update intake for async payment", { intakeId, error: updateError.message })
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    if (!paidIntake) {
      log.warn("Async payment success ignored because checkout session is no longer current or retryable", {
        eventId: event.id,
        intakeId,
        sessionId: session.id,
      })
      return NextResponse.json({ received: true, skipped: true, reason: "stale_checkout_session" })
    }

    // Save Stripe customer ID to profile
    if (stripeCustomerId && patientId) {
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", patientId)
        .is("stripe_customer_id", null)
    }

    // Send payment confirmation email (non-blocking to avoid Stripe timeout).
    // If this fails, the email-dispatcher cron will retry from the outbox.
    if (patientId) {
      const asyncEmailIntakeId = intakeId
      const asyncEmailPatientId = patientId
      const asyncEmailSessionMetadata = session.metadata
      const asyncEmailAmountTotal = session.amount_total

      // Uses after() to keep the serverless function alive until email completes.
      after(async () => {
        try {
          const { data: patientProfile } = await supabase
            .from("profiles")
            .select("email, full_name, auth_user_id")
            .eq("id", asyncEmailPatientId)
            .single()

          if (!patientProfile?.email) return

          const React = await import("react")
          const { sendEmail } = await import("@/lib/email/send-email")
          const { PaymentConfirmedEmail, paymentConfirmedSubject } = await import("@/lib/email/components/templates/payment-confirmed")

          const serviceName = asyncEmailSessionMetadata?.service_slug
            ?.replace(/-/g, " ")
            ?.replace(/\b\w/g, (c: string) => c.toUpperCase())
            || "medical request"
          const amountFormatted = `$${((asyncEmailAmountTotal || 0) / 100).toFixed(2)}`

          await sendEmail({
            to: patientProfile.email,
            toName: patientProfile.full_name || "Patient",
            subject: paymentConfirmedSubject(serviceName),
            template: React.createElement(PaymentConfirmedEmail, {
              patientName: patientProfile.full_name || "there",
              requestType: serviceName,
              amount: amountFormatted,
              requestId: asyncEmailIntakeId,
            }),
            emailType: "payment_confirmed",
            intakeId: asyncEmailIntakeId,
            patientId: asyncEmailPatientId,
            metadata: { amount_cents: asyncEmailAmountTotal },
          })

          // Send guest account completion email if this was a guest checkout
          const isGuestCheckout = asyncEmailSessionMetadata?.guest_checkout === "true" || !patientProfile.auth_user_id
          if (isGuestCheckout) {
            const guestServiceName = asyncEmailSessionMetadata?.service_slug || "medical certificate"
            sendGuestCompleteAccountEmail({
              to: patientProfile.email,
              patientName: patientProfile.full_name || "there",
              serviceName: guestServiceName,
              intakeId: asyncEmailIntakeId,
              patientId: asyncEmailPatientId,
            }).catch((err: unknown) => {
              log.error("Guest account email error in async payment (non-fatal)", { intakeId: asyncEmailIntakeId }, err)
            })
            log.info("Guest account completion email queued (async payment)", { intakeId: asyncEmailIntakeId })
          }
        } catch (emailErr) {
          log.warn("Async payment confirmation email error (non-fatal)", { intakeId: asyncEmailIntakeId }, emailErr)
        }
      })
    }

    await notifyPaidRequestTelegramForAsyncSession(supabase, session, intakeId, patientId)

    await startPostPaymentReviewWork({
      generateDraftsForIntake,
      intakeId,
      schedule: (task) => after(task),
      serviceCategory: session.metadata?.category || session.metadata?.service_type,
      serviceSlug: session.metadata?.service_slug,
      supabase,
    })

    log.info("Async payment confirmed - intake marked as paid", { intakeId, paymentIntentId })
  } catch (error) {
    log.error("Error processing async_payment_succeeded", { intakeId, eventId: event.id }, error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
