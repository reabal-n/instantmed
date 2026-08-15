import { after, NextResponse } from "next/server"

import {
  queueExactGoogleAdsConversionAdjustment,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
import {
  persistStripeRefundEventEvidence,
  readExactRefundAdjustmentTarget,
  reconcilePersistedStripeRefundState,
  reportStripeRefundEvidenceFailure,
} from "@/lib/stripe/refund-event-persistence"

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

  const reversedRefundIds = evidence.refunds
    .filter((refund) => Boolean(refund.failure_balance_transaction))
    .map((refund) => refund.id)
  if (evidence.intakeId && reversedRefundIds.length > 0) {
    const cancellation = await ctx.supabase.rpc("cancel_stripe_refund_notifications", {
      p_intake_id: evidence.intakeId,
      p_refund_ids: reversedRefundIds,
    })
    if (cancellation.error) {
      const message = `Stripe refund notification cancellation failed: ${cancellation.error.message}`
      reportStripeRefundEvidenceFailure(ctx.event, message)
      if (!ctx.adminReplay) {
        await addToDeadLetterQueue(
          ctx.supabase,
          ctx.event.id,
          ctx.event.type,
          null,
          evidence.intakeId,
          message,
          "REFUND_NOTIFICATION_CANCELLATION_FAILED",
          ctx.event as unknown as Record<string, unknown>,
        )
      }
      return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
    }
  }

  if (
    reconciliation.state &&
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
    reconciliation.state &&
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
