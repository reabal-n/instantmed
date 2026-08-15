import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import {
  queueExactGoogleAdsConversionAdjustment,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
import { reserveRefundEmail } from "@/lib/email/template-sender"
import { createLogger } from "@/lib/observability/logger"
import {
  persistStripeRefundEventEvidence,
  readExactRefundAdjustmentTarget,
  reconcilePersistedStripeRefundState,
  reportStripeRefundEvidenceFailure,
} from "@/lib/stripe/refund-event-persistence"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:charge-refunded")

/**
 * Greet the patient by their first name with safe capitalisation. The
 * `profiles.full_name` column stores whatever the patient typed at signup,
 * which often has lower-case surnames or odd capitalisation. Splitting to
 * the first token and Title-casing it avoids "Hi sarah roberts," in
 * automated refund emails. Falls back to "there" when no name is on file.
 */
function greetingFirstName(name: string | null | undefined): string {
  if (!name) return "there"
  const first = name.trim().split(/\s+/)[0]
  if (!first) return "there"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function latestRefund(refunds: Stripe.Refund[]): Stripe.Refund | null {
  const cashRefunds = refunds.filter((refund) =>
    refund.status === "succeeded" &&
    !refund.failure_balance_transaction &&
    typeof refund.balance_transaction === "object" &&
    refund.balance_transaction?.object === "balance_transaction",
  )
  if (!cashRefunds.length) return null

  return cashRefunds.reduce((latest, refund) => {
    if (!latest) return refund
    return refundCashEpochSeconds(refund) > refundCashEpochSeconds(latest)
      ? refund
      : latest
  }, null as Stripe.Refund | null)
}

function refundCashEpochSeconds(refund: Stripe.Refund): number {
  return typeof refund.balance_transaction === "object"
    ? refund.balance_transaction?.created ?? 0
    : 0
}

function outstandingRefundCents(refunds: Stripe.Refund[]): number {
  return refunds.reduce((sum, refund) =>
    refund.status === "succeeded" &&
    !refund.failure_balance_transaction &&
    refundCashEpochSeconds(refund) > 0
      ? sum + refund.amount
      : sum,
  0)
}

export async function handleChargeRefunded(ctx: WebhookContext): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const charge = event.data.object as Stripe.Charge
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id

  log.info("charge.refunded received", {
    eventId: event.id,
    chargeId: charge.id,
    paymentIntentId,
    amountRefunded: charge.amount_refunded,
  })

  const evidence = await persistStripeRefundEventEvidence(ctx)
  if (evidence.error) {
    reportStripeRefundEvidenceFailure(ctx.event, evidence.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        charge.id,
        evidence.intakeId,
        evidence.error,
        "REFUND_EVIDENCE_UNAVAILABLE",
        event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const latest = latestRefund(evidence.refunds)
  if (
    !latest ||
    outstandingRefundCents(evidence.refunds) !== charge.amount_refunded
  ) {
    const error = "Stripe refund objects do not reconcile to the charge refund total"
    reportStripeRefundEvidenceFailure(ctx.event, error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        charge.id,
        evidence.intakeId,
        error,
        "REFUND_CHARGE_TOTAL_MISMATCH",
        event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const reconciliation = await reconcilePersistedStripeRefundState({
    intakeId: evidence.intakeId,
    livemode: event.livemode,
    refunds: evidence.refunds,
    supabase,
  })
  if (reconciliation.error) {
    reportStripeRefundEvidenceFailure(ctx.event, reconciliation.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        supabase,
        event.id,
        event.type,
        charge.id,
        evidence.intakeId,
        reconciliation.error,
        "REFUND_STATE_RECONCILIATION_FAILED",
        event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const state = reconciliation.state
  const target = await readExactRefundAdjustmentTarget({ state, supabase })
  if (target.error) {
    return failChargeRefundRetryably(
      ctx,
      charge.id,
      evidence.intakeId,
      target.error,
      "REFUND_ADJUSTMENT_TARGET_UNAVAILABLE",
    )
  }

  const isPriorityBreachRefund = latest.metadata?.refund_type === "priority_breach"
  if (state && target.targetNetValueCents !== null && target.adjustmentDateTime) {
    const queued = await queueExactGoogleAdsConversionAdjustment({
      adjustmentDateTime: target.adjustmentDateTime,
      amountCents: state.amount_cents,
      intakeId: state.id,
      source: "stripe_charge_refunded",
      supabase,
      targetNetValueCents: target.targetNetValueCents,
    })
    if (queued.error) {
      return failChargeRefundRetryably(
        ctx,
        charge.id,
        state.id,
        queued.error,
        "REFUND_ADJUSTMENT_QUEUE_FAILED",
      )
    }
  }

  if (state?.refund_status === "succeeded") {
    const refundIsFullRefund = Number(state.refund_amount_cents ?? 0) >=
      Number(state.amount_cents ?? charge.amount)
    const reservationError = await reserveChargeRefundEmail({
      ctx,
      intakeId: state.id,
      isPriorityBreachRefund,
      latest,
      refundIsFullRefund,
    })
    if (reservationError) {
      return failChargeRefundRetryably(
        ctx,
        charge.id,
        state.id,
        reservationError,
        "REFUND_NOTIFICATION_RESERVATION_FAILED",
      )
    }
  }

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(
    supabase,
    event.id,
    event.type,
    state?.id,
    charge.id,
  )
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (state && target.targetNetValueCents !== null && target.adjustmentDateTime) {
    after(async () => {
      await runGoogleAdsConversionAdjustment({
        adjustmentDateTime: target.adjustmentDateTime ?? undefined,
        amountCents: state.amount_cents,
        intakeId: state.id,
        paymentStatus: state.payment_status,
        refundAmountCents: state.refund_amount_cents,
        requestPath: "/api/stripe/webhook",
        source: "stripe_charge_refunded",
        supabase,
        targetNetValueCents: target.targetNetValueCents,
      })
    })
  }
}

/*
 * Email reservation remains before the event claim because it is itself
 * idempotent. A transient outbox failure must keep the Stripe event replayable.
 */
async function reserveChargeRefundEmail(input: {
  ctx: WebhookContext
  intakeId: string
  isPriorityBreachRefund: boolean
  latest: Stripe.Refund
  refundIsFullRefund: boolean
}): Promise<string | null> {
  const intakeRead = await input.ctx.supabase
    .from("intakes")
    .select("id, patient_id, status")
    .eq("id", input.intakeId)
    .single()
  if (intakeRead.error) {
    return `Refund notification intake lookup failed: ${intakeRead.error.message}`
  }
  if (!intakeRead.data?.patient_id) return null

  const patientRead = await input.ctx.supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", intakeRead.data.patient_id)
    .single()
  if (patientRead.error) {
    return `Refund notification patient lookup failed: ${patientRead.error.message}`
  }
  if (!patientRead.data?.email) return null

  const wasDeclinedOrCancelled =
    intakeRead.data.status === "declined" || intakeRead.data.status === "cancelled"

  const reservation = await reserveRefundEmail({
    amountCents: input.latest.amount,
    intakeId: input.intakeId,
    livemode: input.ctx.event.livemode,
    patientId: patientRead.data.id,
    patientName: greetingFirstName(patientRead.data.full_name),
    refundReason: input.isPriorityBreachRefund
      ? "Priority review fee refunded"
      : input.refundIsFullRefund
        ? wasDeclinedOrCancelled
          ? "Your request was declined or cancelled"
          : "Full refund processed"
        : "Partial refund processed",
    stripeRefundId: input.latest.id,
    to: patientRead.data.email,
  })
  return reservation.success
    ? null
    : reservation.error || "Refund notification reservation failed"
}

async function failChargeRefundRetryably(
  ctx: WebhookContext,
  chargeId: string,
  intakeId: string | null,
  message: string,
  errorCode: string,
): Promise<NextResponse> {
  reportStripeRefundEvidenceFailure(ctx.event, message)
  if (!ctx.adminReplay) {
    await addToDeadLetterQueue(
      ctx.supabase,
      ctx.event.id,
      ctx.event.type,
      chargeId,
      intakeId,
      message,
      errorCode,
      ctx.event as unknown as Record<string, unknown>,
    )
  }
  return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
}
