import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import {
  queueExactGoogleAdsConversionAdjustment,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
import { createLogger } from "@/lib/observability/logger"
import {
  finalizePersistedStripeRefundAttempts,
  persistStripeRefundEventEvidence,
  readExactRefundAdjustmentTarget,
  reconcilePersistedStripeRefundState,
  reportStripeRefundEvidenceFailure,
} from "@/lib/stripe/refund-event-persistence"
import { finalizeRefundNotifications } from "@/lib/stripe/refund-notification-finalizer"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:charge-refunded")

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
  if (!state) {
    return failChargeRefundRetryably(
      ctx,
      charge.id,
      evidence.intakeId,
      "Stripe refund reconciled state is unavailable",
      "REFUND_STATE_RECONCILIATION_FAILED",
    )
  }
  const notification = await finalizeRefundNotifications({
    evidence: evidence.evidence,
    intakeId: state.id,
    livemode: event.livemode,
    supabase,
  })
  if (notification.error) {
    return failChargeRefundRetryably(
      ctx,
      charge.id,
      state.id,
      notification.error,
      "REFUND_NOTIFICATION_FINALIZATION_FAILED",
    )
  }

  const attemptFinalization = await finalizePersistedStripeRefundAttempts({
    evidence: evidence.evidence,
    livemode: event.livemode,
    refunds: evidence.refunds,
    supabase,
  })
  if (attemptFinalization.error) {
    return failChargeRefundRetryably(
      ctx,
      charge.id,
      state.id,
      attemptFinalization.error,
      "REFUND_ATTEMPT_FINALIZATION_FAILED",
    )
  }

  // Cash-confirmed patient communication outranks optional acquisition work.
  // The exact-key reservation is idempotent if a later Ads failure retries the
  // Stripe event.
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

  if (target.targetNetValueCents !== null && target.adjustmentDateTime) {
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
