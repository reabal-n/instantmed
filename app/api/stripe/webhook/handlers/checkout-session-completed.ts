import * as Sentry from "@sentry/nextjs"
import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"
import { sendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"
import { createLogger } from "@/lib/observability/logger"
import {
  completeConfirmedPaymentWork,
  finalizeConfirmedCheckoutPayment,
} from "@/lib/stripe/confirmed-payment-finalization"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, recordEventError, tryClaimEvent } from "./utils"

export { shouldSendPaidRequestTelegramNotification } from "@/lib/notifications/paid-request-telegram"

const log = createLogger("stripe-webhook:checkout-completed")

async function retryPaidRequestTelegramForClaimedEvent(
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
      paymentStatus: session.payment_status,
      amountCents: session.amount_total,
      serviceSlug: session.metadata?.service_slug,
      category: session.metadata?.category,
      subtype: session.metadata?.subtype,
    })
  } catch (error) {
    log.error("Telegram retry failed for claimed event", { intakeId }, error)
    Sentry.captureException(error, {
      tags: { source: "telegram-notification" },
      extra: { intakeId },
    })
  }
}

function paymentDiagnosticMetadata(
  session: Stripe.Checkout.Session,
  intake?: {
    payment_id?: string | null
    payment_status?: string | null
    status?: string | null
  } | null,
) {
  return {
    amount: session.amount_total,
    current_payment_id: intake?.payment_id,
    current_payment_status: intake?.payment_status,
    current_status: intake?.status,
    payment_intent: session.payment_intent,
  }
}

export async function handleCheckoutSessionCompleted(
  ctx: WebhookContext,
): Promise<HandlerResult> {
  const { event, supabase, startTime } = ctx
  const session = event.data.object as Stripe.Checkout.Session
  const intakeId = session.metadata?.intake_id || session.metadata?.request_id
  const patientId = session.metadata?.patient_id

  log.info("checkout.session.completed received", {
    eventId: event.id,
    sessionId: session.id,
    intakeId,
    patientId,
    amount: session.amount_total,
    paymentStatus: session.payment_status,
  })

  // Delayed methods first complete Checkout with an unpaid state. Only the
  // later async success event is confirmation that money moved.
  if (session.payment_status !== "paid") {
    return NextResponse.json({
      received: true,
      skipped: true,
      reason: "async_payment_pending",
    })
  }

  Sentry.addBreadcrumb({
    category: "stripe-webhook",
    message: "checkout.session.completed received",
    level: "info",
    data: { eventId: event.id, intakeId, sessionId: session.id },
  })

  const shouldProcess =
    ctx.adminReplay ||
    (await tryClaimEvent(
      supabase,
      event.id,
      event.type,
      intakeId,
      session.id,
      {
        amount: session.amount_total,
        payment_intent: session.payment_intent,
        customer: session.customer,
      },
    ))

  if (!shouldProcess) {
    log.info("Event already processed, skipping", { eventId: event.id })
    if (intakeId) {
      const finalization = await finalizeConfirmedCheckoutPayment({
        intakeId,
        session,
        supabase,
      })

      if (
        finalization.kind === "settled" ||
        finalization.kind === "already_paid" ||
        finalization.kind === "concurrent_paid"
      ) {
        await completeConfirmedPaymentWork({
          finalizationKind: finalization.kind,
          generateDraftsForIntake,
          intakeId,
          patientId: patientId || finalization.intake.patient_id,
          requestPath: ctx.requestPath,
          schedule: (task) => after(task),
          serviceCategory:
            session.metadata?.category || session.metadata?.service_type,
          session,
          source: "checkout_session_completed",
          supabase,
        })
        return NextResponse.json({
          received: true,
          skipped: true,
          completion_healed: true,
        })
      }

      if (
        finalization.kind === "not_found" ||
        finalization.kind === "invalid_session" ||
        finalization.kind === "update_conflict" ||
        finalization.kind === "update_failed"
      ) {
        return NextResponse.json(
          { error: "Claimed payment event could not be reconciled" },
          { status: 500 },
        )
      }
    }

    await retryPaidRequestTelegramForClaimedEvent(
      supabase,
      session,
      intakeId,
      patientId,
    )
    return NextResponse.json({ received: true, skipped: true })
  }

  if (!intakeId) {
    await recordEventError(
      supabase,
      event.id,
      "Missing intake_id in session metadata",
    )
    return NextResponse.json(
      { error: "Missing intake_id", processed: true },
      { status: 200 },
    )
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      intakeId,
    )
  ) {
    await recordEventError(
      supabase,
      event.id,
      `Invalid intake_id format: ${intakeId}`,
    )
    return NextResponse.json(
      { error: "Invalid intake_id format", processed: true },
      { status: 200 },
    )
  }

  try {
    const finalization = await finalizeConfirmedCheckoutPayment({
      intakeId,
      session,
      supabase,
    })

    if (finalization.kind === "not_found") {
      const errorMessage = `Intake not found: ${intakeId}`
      await recordEventError(supabase, event.id, errorMessage)

      const { count } = await supabase
        .from("stripe_webhook_dead_letter")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
      const retryCount = count || 0

      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "INTAKE_NOT_FOUND",
        {
          amount: session.amount_total,
          payment_intent: session.payment_intent,
          retry_count: retryCount,
        },
      )

      return retryCount >= 3
        ? NextResponse.json(
            {
              error: "Intake not found after max retries",
              processed: true,
              dlq: true,
            },
            { status: 200 },
          )
        : NextResponse.json({ error: "Intake not found" }, { status: 500 })
    }

    if (finalization.kind === "stale_session") {
      const errorMessage = `Payment success received for stale checkout session: ${session.id}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "STALE_PAYMENT_SUCCESS",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "stale_checkout_session",
        dlq: true,
      })
    }

    if (finalization.kind === "non_retryable") {
      const errorMessage = `Payment success received for non-retryable intake state: ${finalization.intake.status}/${finalization.intake.payment_status}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "NON_RETRYABLE_PAYMENT_SUCCESS",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json({ received: true, skipped: true, dlq: true })
    }

    if (finalization.kind === "invalid_session") {
      const errorMessage = `Confirmed Checkout Session was incomplete: ${finalization.reason}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "INVALID_CONFIRMED_PAYMENT",
        paymentDiagnosticMetadata(session),
      )
      return NextResponse.json(
        { error: "Invalid payment confirmation" },
        { status: 500 },
      )
    }

    if (finalization.kind === "update_failed") {
      const errorMessage = `Intake update failed: ${finalization.error.message}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "UPDATE_FAILED",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json(
        { error: "Failed to update intake" },
        { status: 500 },
      )
    }

    if (finalization.kind === "update_conflict") {
      const errorMessage = `Payment success update matched 0 rows and intake is still unpaid: ${finalization.intake?.status || "unknown"}/${finalization.intake?.payment_status || "unknown"}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "ZERO_ROW_PAYMENT_UPDATE",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json({
        received: true,
        skipped: true,
        dlq: true,
        reason: "zero_row_payment_update",
      })
    }

    await completeConfirmedPaymentWork({
      finalizationKind: finalization.kind,
      generateDraftsForIntake,
      intakeId,
      patientId: patientId || finalization.intake.patient_id,
      requestPath: ctx.requestPath,
      schedule: (task) => after(task),
      serviceCategory:
        session.metadata?.category || session.metadata?.service_type,
      session,
      source: "checkout_session_completed",
      supabase,
    })

    if (session.metadata?.is_subscription === "true") {
      log.warn("Ignored dormant subscription checkout completion", {
        intakeId,
        patientId,
        checkoutSessionId: session.id,
      })
    }

    log.info("Payment processed successfully", {
      eventId: event.id,
      finalization: finalization.kind,
      intakeId,
      sessionId: session.id,
      durationMs: Date.now() - startTime,
    })

    if (finalization.kind !== "settled") {
      return NextResponse.json({
        received: true,
        already_paid: true,
        concurrent_update: finalization.kind === "concurrent_paid",
      })
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { source: "stripe-webhook", event_type: event.type },
      extra: { eventId: event.id, intakeId },
    })
    log.error("Unexpected error", { intakeId }, error)
    await recordEventError(
      supabase,
      event.id,
      error instanceof Error ? error.message : "Unknown error",
    )
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
