import * as Sentry from "@sentry/nextjs"
import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import {
  queueExactGoogleAdsConversionAdjustment,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"

import type { HandlerResult, WebhookContext } from "./types"
import { addToDeadLetterQueue, tryClaimEvent } from "./utils"

const log = createLogger("stripe-webhook:dispute-lifecycle")

type DisputeIntakeRow = {
  amount_cents: number | null
  id: string
  payment_status?: string | null
  refund_amount_cents: number | null
  refunded_at?: string | null
}

type DisputeCashRpcResult = {
  amount_cents?: number | null
  applied?: boolean
  intake_id?: string | null
  intake_updated?: boolean
  refund_amount_cents?: number | null
  restored_payment_status?: string | null
}

type DisputeAdsTargetRow = {
  adjustment_at: string | null
  amount_cents: number | null
  intake_id: string
  payment_status: string
  refund_amount_cents: number | null
  target_net_value_cents: number
}

type DisputeCashEventType =
  | "charge.dispute.funds_reinstated"
  | "charge.dispute.funds_withdrawn"

type DisputeIntakeLookup = {
  error: string | null
  intake: DisputeIntakeRow | null
}

const TERMINAL_DISPUTE_STATUSES = new Set<Stripe.Dispute.Status>([
  "lost",
  "prevented",
  "warning_closed",
  "won",
])

export async function handleChargeDisputeLifecycle(
  ctx: WebhookContext,
): Promise<HandlerResult> {
  const { event, supabase } = ctx
  const dispute = event.data.object as Stripe.Dispute
  const eventAt = stripeEventTime(event)
  const chargeId = stripeId(dispute.charge)

  if (!eventAt) {
    return failRetryably(ctx, dispute.id, "Stripe dispute event has no valid event timestamp")
  }

  const isCashEvent =
    event.type === "charge.dispute.funds_reinstated" ||
    event.type === "charge.dispute.funds_withdrawn"
  const isStatusEvent =
    event.type === "charge.dispute.closed" || event.type === "charge.dispute.updated"
  if (!isCashEvent && !isStatusEvent) {
    return NextResponse.json({ error: "Unsupported dispute lifecycle event" }, { status: 400 })
  }
  if (event.type === "charge.dispute.closed" && !TERMINAL_DISPUTE_STATUSES.has(dispute.status)) {
    return failRetryably(
      ctx,
      dispute.id,
      `Stripe charge.dispute.closed has non-terminal status ${dispute.status}`,
    )
  }

  const cashEventType = isCashEvent ? event.type as DisputeCashEventType : null
  const movementCents = cashEventType
    ? disputeCashMovementCents(dispute, cashEventType)
    : null
  if (cashEventType && movementCents === null) {
    return failRetryably(
      ctx,
      dispute.id,
      `Stripe ${event.type} payload has no matching balance transaction`,
    )
  }

  const intakeLookup = await findLinkedIntake(ctx, dispute)
  if (intakeLookup.error) {
    return failRetryably(ctx, dispute.id, intakeLookup.error)
  }
  const intake = intakeLookup.intake
  const snapshotError = await seedDisputeSnapshot(ctx, dispute, chargeId, intake?.id ?? null)
  if (snapshotError) return failRetryably(ctx, dispute.id, snapshotError)

  const statusError = await recordDisputeStatus(ctx, dispute, eventAt)
  if (statusError) return failRetryably(ctx, dispute.id, statusError)

  const persistedLink = await readPersistedDisputeLink(ctx, dispute.id)
  if (persistedLink.error) return failRetryably(ctx, dispute.id, persistedLink.error)
  if (
    persistedLink.livemode !== event.livemode ||
    (intake && persistedLink.intakeId !== intake.id)
  ) {
    return failRetryably(
      ctx,
      dispute.id,
      "Stripe dispute persisted linkage conflicts with verified PaymentIntent evidence",
    )
  }

  let cashResult: DisputeCashRpcResult | null = null
  if (!cashEventType || movementCents === null) {
    cashResult = null
  } else {
    const { data, error } = await supabase.rpc("record_stripe_dispute_cash_event", {
      p_amount_cents: movementCents,
      p_dispute_id: dispute.id,
      p_event_at: eventAt,
      p_event_id: event.id,
      p_event_type: cashEventType,
    })
    if (error) {
      return failRetryably(
        ctx,
        dispute.id,
        `Stripe dispute cash event write failed: ${error.message}`,
      )
    }
    cashResult = (data ?? {}) as DisputeCashRpcResult
  }

  if (
    cashResult?.intake_id &&
    persistedLink.intakeId &&
    cashResult.intake_id !== persistedLink.intakeId
  ) {
    return failRetryably(
      ctx,
      dispute.id,
      "Stripe dispute cash reconciliation returned a conflicting intake",
    )
  }

  const linkedIntake = intake ?? (cashResult?.intake_id
      ? {
          amount_cents: positiveInteger(cashResult.amount_cents),
          id: cashResult.intake_id,
          refund_amount_cents: nonNegativeInteger(cashResult.refund_amount_cents),
        }
      : null)
  if (event.livemode && !linkedIntake) {
    return failRetryably(ctx, dispute.id, "Live Stripe dispute is not linked to an intake")
  }

  const targetResult = linkedIntake
    ? await readAggregateDisputeAdsTarget(ctx, linkedIntake.id)
    : { error: null, target: null }
  if (targetResult.error) return failRetryably(ctx, dispute.id, targetResult.error)

  if (targetResult.target) {
    const adjustmentAt = targetResult.target.adjustment_at || eventAt
    const queued = await queueExactGoogleAdsConversionAdjustment({
      adjustmentDateTime: new Date(adjustmentAt),
      amountCents: targetResult.target.amount_cents,
      intakeId: targetResult.target.intake_id,
      source: "stripe_charge_dispute_lost",
      supabase,
      targetNetValueCents: targetResult.target.target_net_value_cents,
    })
    if (queued.error) return failRetryably(ctx, dispute.id, queued.error)
  }

  const shouldProcess = ctx.adminReplay || await tryClaimEvent(
    supabase,
    event.id,
    event.type,
    linkedIntake?.id,
    chargeId ?? undefined,
  )
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  scheduleAggregateDisputeAdjustment(ctx, targetResult.target, eventAt)
}

async function readAggregateDisputeAdsTarget(
  ctx: WebhookContext,
  intakeId: string,
): Promise<{ error: string | null; target: DisputeAdsTargetRow | null }> {
  const { data, error } = await ctx.supabase
    .from("stripe_payment_adjustment_targets")
    .select(
      "intake_id, amount_cents, refund_amount_cents, payment_status, " +
      "target_net_value_cents, adjustment_at",
    )
    .eq("intake_id", intakeId)
    .maybeSingle()
  if (error) {
    return {
      error: `Stripe aggregate dispute Ads target lookup failed: ${error.message}`,
      target: null,
    }
  }
  return { error: null, target: (data as DisputeAdsTargetRow | null) ?? null }
}

function scheduleAggregateDisputeAdjustment(
  ctx: WebhookContext,
  target: DisputeAdsTargetRow | null,
  fallbackEventAt: string,
): void {
  if (!target) return
  const adjustmentAt = target.adjustment_at || fallbackEventAt
  after(async () => {
    await runGoogleAdsConversionAdjustment({
      adjustmentDateTime: new Date(adjustmentAt),
      amountCents: target.amount_cents,
      intakeId: target.intake_id,
      paymentStatus: target.payment_status,
      refundAmountCents: target.refund_amount_cents,
      requestPath: ctx.requestPath || "/api/stripe/webhook",
      source: "stripe_charge_dispute_lost",
      supabase: ctx.supabase,
      targetNetValueCents: target.target_net_value_cents,
    })
  })
}

async function findLinkedIntake(
  ctx: WebhookContext,
  dispute: Stripe.Dispute,
): Promise<DisputeIntakeLookup> {
  const paymentIntentId = stripeId(dispute.payment_intent)
  if (paymentIntentId) {
    const { data, error } = await ctx.supabase
      .from("intakes")
      .select("id, amount_cents, refund_amount_cents, refunded_at, payment_status")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle()
    if (error) {
      log.error("Failed to resolve dispute intake by PaymentIntent", {
        disputeId: dispute.id,
        eventId: ctx.event.id,
        paymentIntentId,
      }, error)
      return {
        error: `Stripe dispute intake lookup failed: ${error.message}`,
        intake: null,
      }
    }
    if (data) return { error: null, intake: data as DisputeIntakeRow }

    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch {
      return {
        error: "Stripe dispute PaymentIntent metadata lookup failed",
        intake: null,
      }
    }
    const metadataIntakeId = paymentIntent.metadata?.intake_id ||
      paymentIntent.metadata?.request_id
    if (metadataIntakeId) {
      const metadataRead = await ctx.supabase
        .from("intakes")
        .select("id, amount_cents, refund_amount_cents, refunded_at, payment_status, stripe_payment_intent_id")
        .eq("id", metadataIntakeId)
        .maybeSingle()
      if (metadataRead.error) {
        return {
          error: `Stripe dispute metadata intake lookup failed: ${metadataRead.error.message}`,
          intake: null,
        }
      }
      if (!metadataRead.data) {
        return {
          error: "Stripe dispute PaymentIntent metadata intake is missing",
          intake: null,
        }
      }
      if (
        metadataRead.data.stripe_payment_intent_id &&
        metadataRead.data.stripe_payment_intent_id !== paymentIntentId
      ) {
        return {
          error: "Stripe dispute PaymentIntent metadata conflicts with intake",
          intake: null,
        }
      }
      return { error: null, intake: metadataRead.data as DisputeIntakeRow }
    }
  }

  const { data: ledgerRow, error: ledgerError } = await ctx.supabase
    .from("stripe_disputes")
    .select("intake_id")
    .eq("dispute_id", dispute.id)
    .maybeSingle()
  if (ledgerError) {
    return {
      error: `Stripe dispute ledger lookup failed: ${ledgerError.message}`,
      intake: null,
    }
  }
  if (!ledgerRow?.intake_id) return { error: null, intake: null }

  const { data, error } = await ctx.supabase
    .from("intakes")
    .select("id, amount_cents, refund_amount_cents, refunded_at, payment_status")
    .eq("id", ledgerRow.intake_id)
    .maybeSingle()
  if (error) {
    return {
      error: `Stripe dispute linked intake lookup failed: ${error.message}`,
      intake: null,
    }
  }
  return { error: null, intake: (data as DisputeIntakeRow | null) ?? null }
}

async function seedDisputeSnapshot(
  ctx: WebhookContext,
  dispute: Stripe.Dispute,
  chargeId: string | null,
  intakeId: string | null,
): Promise<string | null> {
  const { error } = await ctx.supabase.from("stripe_disputes").upsert({
    amount: dispute.amount,
    charge_id: chargeId,
    created_at: new Date(dispute.created * 1000).toISOString(),
    currency: dispute.currency,
    dispute_id: dispute.id,
    intake_id: intakeId,
    livemode: ctx.event.livemode,
    reason: dispute.reason,
    status: dispute.status,
  }, { onConflict: "dispute_id", ignoreDuplicates: true })
  if (error) return `Stripe dispute snapshot write failed: ${error.message}`

  if (intakeId) {
    const { error: linkError } = await ctx.supabase
      .from("stripe_disputes")
      .update({ intake_id: intakeId })
      .eq("dispute_id", dispute.id)
      .is("intake_id", null)
    if (linkError) return `Stripe dispute intake link failed: ${linkError.message}`
  }

  return null
}

async function recordDisputeStatus(
  ctx: WebhookContext,
  dispute: Stripe.Dispute,
  eventAt: string,
): Promise<string | null> {
  const { error } = await ctx.supabase.rpc("record_stripe_dispute_status_event", {
    p_dispute_id: dispute.id,
    p_event_at: eventAt,
    p_event_id: ctx.event.id,
    p_livemode: ctx.event.livemode,
    p_status: dispute.status,
  })
  return error ? `Stripe dispute status write failed: ${error.message}` : null
}

async function readPersistedDisputeLink(
  ctx: WebhookContext,
  disputeId: string,
): Promise<{ error: string | null; intakeId: string | null; livemode: boolean | null }> {
  const { data, error } = await ctx.supabase
    .from("stripe_disputes")
    .select("intake_id, livemode")
    .eq("dispute_id", disputeId)
    .single()
  if (error) {
    return {
      error: `Stripe dispute persisted link verification failed: ${error.message}`,
      intakeId: null,
      livemode: null,
    }
  }
  return {
    error: null,
    intakeId: data?.intake_id ?? null,
    livemode: typeof data?.livemode === "boolean" ? data.livemode : null,
  }
}

function disputeCashMovementCents(
  dispute: Stripe.Dispute,
  eventType: DisputeCashEventType,
): number | null {
  const direction = eventType === "charge.dispute.funds_withdrawn" ? -1 : 1
  let cents = 0
  for (const transaction of dispute.balance_transactions ?? []) {
    if (transaction.currency !== dispute.currency) continue
    if (direction < 0 && transaction.amount < 0) cents += Math.abs(transaction.amount)
    if (direction > 0 && transaction.amount > 0) cents += transaction.amount
  }
  return positiveInteger(cents)
}

function stripeEventTime(event: Stripe.Event): string | null {
  return Number.isInteger(event.created) && event.created > 0
    ? new Date(event.created * 1000).toISOString()
    : null
}

function stripeId(value: { id: string } | string | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null
}

async function failRetryably(
  ctx: WebhookContext,
  disputeId: string,
  message: string,
): Promise<NextResponse> {
  log.error(message, { disputeId, eventId: ctx.event.id, eventType: ctx.event.type })
  Sentry.captureMessage(message, {
    level: "error",
    tags: { source: "stripe-dispute-lifecycle" },
    extra: { disputeId, eventId: ctx.event.id, eventType: ctx.event.type },
  })
  if (!ctx.adminReplay) {
    await addToDeadLetterQueue(
      ctx.supabase,
      ctx.event.id,
      ctx.event.type,
      disputeId,
      null,
      message,
      "DISPUTE_LIFECYCLE_UPDATE_FAILED",
      ctx.event as unknown as Record<string, unknown>,
    )
  }
  return NextResponse.json({ error: "Dispute lifecycle update unavailable" }, { status: 500 })
}
