import * as Sentry from "@sentry/nextjs"
import { after, NextResponse } from "next/server"
import type Stripe from "stripe"

import {
  buildLostDisputeTargetNetValueCents,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
import { createLogger } from "@/lib/observability/logger"

import type { HandlerResult, WebhookContext } from "./types"
import { tryClaimEvent } from "./utils"

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

type DisputeCashSnapshot = {
  funds_reinstated_cents: number | null
  funds_withdrawn_cents: number | null
  status: string | null
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

  if (!cashEventType || movementCents === null) {
    const adjustmentError = await scheduleLostDisputeAdjustment(
      ctx,
      dispute,
      intake,
      eventAt,
    )
    if (adjustmentError) return failRetryably(ctx, dispute.id, adjustmentError)
    if (!ctx.adminReplay) {
      await tryClaimEvent(
        supabase,
        event.id,
        event.type,
        intake?.id,
        chargeId ?? undefined,
      )
    }
    return
  }

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

  const result = (data ?? {}) as DisputeCashRpcResult
  const adjustmentError = await scheduleLostDisputeAdjustment(
    ctx,
    dispute,
    intake ?? (result.intake_id
      ? {
          amount_cents: positiveInteger(result.amount_cents),
          id: result.intake_id,
          refund_amount_cents: nonNegativeInteger(result.refund_amount_cents),
        }
      : null),
    eventAt,
  )
  if (adjustmentError) return failRetryably(ctx, dispute.id, adjustmentError)

  // Cash-event columns and the database RPC are the idempotency boundary. Claim
  // only after the durable mutation so a transient write failure cannot poison
  // Stripe's retry by marking the event processed first.
  if (!ctx.adminReplay) {
    await tryClaimEvent(
      supabase,
      event.id,
      event.type,
      intake?.id,
      chargeId ?? undefined,
    )
  }
}

async function scheduleLostDisputeAdjustment(
  ctx: WebhookContext,
  dispute: Stripe.Dispute,
  intake: DisputeIntakeRow | null,
  eventAt: string,
): Promise<string | null> {
  if (dispute.status !== "lost" || !intake) return null

  const { data, error } = await ctx.supabase
    .from("stripe_disputes")
    .select("status, funds_withdrawn_cents, funds_reinstated_cents")
    .eq("dispute_id", dispute.id)
    .maybeSingle()
  if (error) return `Stripe lost-dispute cash lookup failed: ${error.message}`
  if (!data) return "Stripe lost-dispute cash ledger row is missing"

  const snapshot = data as DisputeCashSnapshot
  // A newer lifecycle event may already have won. Trust the durable row rather
  // than an out-of-order lost payload before making an irreversible retraction.
  if (snapshot.status !== "lost") return null

  const amountCents = positiveInteger(intake.amount_cents) ?? dispute.amount
  const refundAmountCents = nonNegativeInteger(intake.refund_amount_cents) ?? 0
  const targetNetValueCents = buildLostDisputeTargetNetValueCents({
    amountCents,
    fundsReinstatedCents: snapshot.funds_reinstated_cents,
    fundsWithdrawnCents: snapshot.funds_withdrawn_cents,
    refundAmountCents,
  })
  if (targetNetValueCents === null) return null
  const intakeId = intake.id

  after(async () => {
    await runGoogleAdsConversionAdjustment({
      adjustmentDateTime: new Date(eventAt),
      amountCents,
      intakeId,
      paymentStatus: "disputed",
      refundAmountCents,
      requestPath: ctx.requestPath || "/api/stripe/webhook",
      source: "stripe_charge_dispute_lost",
      supabase: ctx.supabase,
      targetNetValueCents,
    })
  })

  return null
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
  const terminal = TERMINAL_DISPUTE_STATUSES.has(dispute.status)
  const payload: Record<string, unknown> = {
    dispute_status_event_at: eventAt,
    dispute_status_event_id: ctx.event.id,
    status: dispute.status,
    updated_at: new Date().toISOString(),
  }
  if (terminal) {
    payload.outcome = dispute.status
    payload.resolved_at = eventAt
  }

  let query = ctx.supabase
    .from("stripe_disputes")
    .update(payload)
    .eq("dispute_id", dispute.id)
    .or(`dispute_status_event_at.is.null,dispute_status_event_at.lte.${eventAt}`)
  if (!terminal) query = query.is("resolved_at", null)
  const { error } = await query
  return error ? `Stripe dispute status write failed: ${error.message}` : null
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

function failRetryably(
  ctx: WebhookContext,
  disputeId: string,
  message: string,
): NextResponse {
  log.error(message, { disputeId, eventId: ctx.event.id, eventType: ctx.event.type })
  Sentry.captureMessage(message, {
    level: "error",
    tags: { source: "stripe-dispute-lifecycle" },
    extra: { disputeId, eventId: ctx.event.id, eventType: ctx.event.type },
  })
  return NextResponse.json({ error: "Dispute lifecycle update unavailable" }, { status: 500 })
}
