import { NextResponse } from "next/server"

import {
  persistStripeRefundEventEvidence,
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

  const reconciliationError = await reconcilePersistedStripeRefundState({
    intakeId: evidence.intakeId,
    livemode: ctx.event.livemode,
    refunds: evidence.refunds,
    supabase: ctx.supabase,
  })
  if (reconciliationError) {
    reportStripeRefundEvidenceFailure(ctx.event, reconciliationError)
    if (!ctx.adminReplay) {
      await addToDeadLetterQueue(
        ctx.supabase,
        ctx.event.id,
        ctx.event.type,
        null,
        evidence.intakeId,
        reconciliationError,
        "REFUND_STATE_RECONCILIATION_FAILED",
        ctx.event as unknown as Record<string, unknown>,
      )
    }
    return NextResponse.json({ error: "Refund evidence unavailable" }, { status: 500 })
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

  return undefined
}
