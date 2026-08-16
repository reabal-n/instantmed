import { after, NextResponse } from "next/server"

import {
  queueExactGoogleAdsConversionAdjustment,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
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

export async function handleRefundLifecycle(ctx: WebhookContext): Promise<HandlerResult> {
  const evidence = await persistStripeRefundEventEvidence(ctx)
  if (evidence.error) {
    reportStripeRefundEvidenceFailure(ctx.event, evidence.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        ctx.supabase,
        ctx.event.id,
        ctx.event.type,
        null,
        evidence.intakeId,
        evidence.error,
        "REFUND_EVIDENCE_UNAVAILABLE",
        ctx.event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const reconciliation = await reconcilePersistedStripeRefundState({
    intakeId: evidence.intakeId,
    livemode: ctx.event.livemode,
    refunds: evidence.refunds,
    supabase: ctx.supabase,
  })
  if (reconciliation.error) {
    reportStripeRefundEvidenceFailure(ctx.event, reconciliation.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        ctx.supabase,
        ctx.event.id,
        ctx.event.type,
        null,
        evidence.intakeId,
        reconciliation.error,
        "REFUND_STATE_RECONCILIATION_FAILED",
        ctx.event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  if (!evidence.intakeId || !reconciliation.state) {
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }
  const notification = await finalizeRefundNotifications({
    evidence: evidence.evidence,
    intakeId: evidence.intakeId,
    livemode: ctx.event.livemode,
    supabase: ctx.supabase,
  })
  if (notification.error) {
    reportStripeRefundEvidenceFailure(ctx.event, notification.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        ctx.supabase,
        ctx.event.id,
        ctx.event.type,
        null,
        evidence.intakeId,
        notification.error,
        "REFUND_NOTIFICATION_FINALIZATION_FAILED",
        ctx.event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  const attemptFinalization = await finalizePersistedStripeRefundAttempts({
    evidence: evidence.evidence,
    livemode: ctx.event.livemode,
    refunds: evidence.refunds,
    supabase: ctx.supabase,
  })
  if (attemptFinalization.error) {
    reportStripeRefundEvidenceFailure(ctx.event, attemptFinalization.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        ctx.supabase,
        ctx.event.id,
        ctx.event.type,
        null,
        evidence.intakeId,
        attemptFinalization.error,
        "REFUND_ATTEMPT_FINALIZATION_FAILED",
        ctx.event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  // Patient communication is a cash-settlement obligation. Reserve it before
  // optional acquisition reconciliation so an Ads outage cannot suppress a
  // truthful refund notice.
  const target = await readExactRefundAdjustmentTarget({
    state: reconciliation.state,
    supabase: ctx.supabase,
  })
  if (target.error) {
    reportStripeRefundEvidenceFailure(ctx.event, target.error)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        ctx.supabase,
        ctx.event.id,
        ctx.event.type,
        null,
        evidence.intakeId,
        target.error,
        "REFUND_ADJUSTMENT_TARGET_UNAVAILABLE",
        ctx.event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
  }

  if (
    target.targetNetValueCents !== null &&
    target.adjustmentDateTime
  ) {
    const queued = await queueExactGoogleAdsConversionAdjustment({
      adjustmentDateTime: target.adjustmentDateTime,
      amountCents: reconciliation.state.amount_cents,
      intakeId: reconciliation.state.id,
      source: "stripe_refund_lifecycle",
      supabase: ctx.supabase,
      targetNetValueCents: target.targetNetValueCents,
    })
    if (queued.error) {
      reportStripeRefundEvidenceFailure(ctx.event, queued.error)
      if (!ctx.adminReplay) {
        await addToDeadLetterQueue(
          ctx.supabase,
          ctx.event.id,
          ctx.event.type,
          null,
          evidence.intakeId,
          queued.error,
          "REFUND_ADJUSTMENT_QUEUE_FAILED",
          ctx.event as unknown as Record<string, unknown>,
        )
      }
      return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
    }
  }

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(
    ctx.supabase,
    ctx.event.id,
    ctx.event.type,
    evidence.intakeId ?? undefined,
  )
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (
    target.targetNetValueCents !== null &&
    target.adjustmentDateTime
  ) {
    const state = reconciliation.state
    after(async () => {
      await runGoogleAdsConversionAdjustment({
        adjustmentDateTime: target.adjustmentDateTime ?? undefined,
        amountCents: state.amount_cents,
        intakeId: state.id,
        paymentStatus: state.payment_status,
        refundAmountCents: state.refund_amount_cents,
        requestPath: ctx.requestPath || "/api/stripe/webhook",
        source: "stripe_refund_lifecycle",
        supabase: ctx.supabase,
        targetNetValueCents: target.targetNetValueCents,
      })
    })
  }

  return undefined
}
