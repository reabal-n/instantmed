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

const log = createLogger("stripe-webhook:async-payment-succeeded")

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
      paymentStatus: "paid",
      amountCents: session.amount_total,
      serviceSlug: session.metadata?.service_slug,
      category: session.metadata?.category,
      subtype: session.metadata?.subtype,
    })
  } catch (error) {
    log.error("Telegram retry failed for claimed async event", { intakeId }, error)
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

export async function handleAsyncPaymentSucceeded(
  ctx: WebhookContext,
): Promise<HandlerResult> {
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
          source: "checkout_session_async_payment_succeeded",
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
          { error: "Claimed async payment event could not be reconciled" },
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
    return NextResponse.json({ error: "Missing intake_id" }, { status: 200 })
  }

  try {
    const finalization = await finalizeConfirmedCheckoutPayment({
      intakeId,
      session,
      supabase,
    })

    if (finalization.kind === "not_found") {
      return NextResponse.json({ error: "Intake not found" }, { status: 500 })
    }

    if (finalization.kind === "stale_session") {
      const errorMessage =
        "Async payment succeeded for a superseded checkout session — money captured, intake not marked paid. Reconcile/refund manually."
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "stale_async_payment_success",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      Sentry.captureMessage(
        "Stale async payment success — captured payment on superseded session",
        {
          level: "warning",
          tags: { subsystem: "stripe-webhook", event_type: event.type },
          fingerprint: ["stale-async-payment-success", intakeId],
          extra: {
            intakeId,
            sessionId: session.id,
            currentPaymentId: finalization.intake.payment_id,
          },
        },
      )
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "stale_checkout_session",
      })
    }

    if (finalization.kind === "non_retryable") {
      const errorMessage = `Async payment success received for non-retryable intake state: ${finalization.intake.status}/${finalization.intake.payment_status}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "NON_RETRYABLE_ASYNC_PAYMENT_SUCCESS",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json({ received: true, skipped: true, dlq: true })
    }

    if (finalization.kind === "invalid_session") {
      const errorMessage = `Async payment success payload was incomplete: ${finalization.reason}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "INVALID_ASYNC_PAYMENT_SUCCESS",
        paymentDiagnosticMetadata(session),
      )
      return NextResponse.json(
        { error: "Invalid payment confirmation" },
        { status: 500 },
      )
    }

    if (finalization.kind === "update_failed") {
      const errorMessage = `Async payment update failed: ${finalization.error.message}`
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "ASYNC_PAYMENT_SUCCESS_UPDATE_FAILED",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    if (finalization.kind === "update_conflict") {
      const errorMessage =
        "Async payment success update matched no current retryable intake"
      await recordEventError(supabase, event.id, errorMessage)
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        session.id,
        intakeId,
        errorMessage,
        "ASYNC_PAYMENT_SUCCESS_UPDATE_MISSED",
        paymentDiagnosticMetadata(session, finalization.intake),
      )
      return NextResponse.json({ received: true, skipped: true, dlq: true })
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
      source: "checkout_session_async_payment_succeeded",
      supabase,
    })

    log.info("Async payment confirmed", {
      finalization: finalization.kind,
      intakeId,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
    })

    if (finalization.kind !== "settled") {
      return NextResponse.json({
        received: true,
        already_paid: true,
        concurrent_update: finalization.kind === "concurrent_paid",
      })
    }
  } catch (error) {
    log.error(
      "Error processing async_payment_succeeded",
      { intakeId, eventId: event.id },
      error,
    )
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
