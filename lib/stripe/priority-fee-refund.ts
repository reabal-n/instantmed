/**
 * Priority-fee breach auto-refund (operator decision 2026-08-03).
 *
 * Priority review sells queue position, not a turnaround promise — but when a
 * priority intake is still undecided PRIORITY_BREACH_HOURS after payment, the
 * fee didn't buy anything real. The stale-queue cron calls this to refund the
 * fee automatically (overnight breaches happen while no operator is awake).
 * Refund creation records a pending request only; exact Stripe balance
 * evidence stamps `priority_fee_refunded_at` through the webhook.
 *
 * Money-path invariants:
 * - Fee-only partial refund; never touches the service amount.
 * - Idempotent per exact refund generation. A durably failed Refund permits
 *   one bounded successor key; the cron never creates an unbounded series.
 * - Only fires from `payment_status = "paid"` with zero prior refund cents, so
 *   it can never stack on a support or decline refund.
 * - A later decline still tops the patient up to a FULL refund:
 *   decline-refund.ts refunds the remaining balance and accumulates
 *   `refund_amount_cents` (see the partially_refunded gate in decline-intake).
 */

import * as Sentry from "@sentry/nextjs"

import { PRICING } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("priority-fee-refund")

/** Hours after paid_at before an undecided priority intake breaches. */
export const PRIORITY_BREACH_HOURS = 3

/** Fee refunded on breach, in cents. Single source: PRICING.PRIORITY_FEE. */
const PRIORITY_FEE_CENTS = Math.round(PRICING.PRIORITY_FEE * 100)

export interface PriorityBreachIntake {
  id: string
  category: string | null
  is_priority: boolean | null
  payment_status: string | null
  amount_cents: number | null
  refund_amount_cents: number | null
  refund_status: string | null
  refund_stripe_id: string | null
  priority_fee_refunded_at: string | null
  priority_fee_refund_retry_attempted_at: string | null
  stripe_payment_intent_id: string | null
  payment_id: string | null
  updated_at: string
}

/** Minimal Stripe surface so unit tests can inject a fake. */
export interface PriorityRefundStripe {
  refunds: {
    create(
      params: {
        payment_intent: string
        amount: number
        reason: "requested_by_customer"
        metadata: Record<string, string>
      },
      options: { idempotencyKey: string },
    ): Promise<{ id: string; amount: number | null }>
  }
  checkout: {
    sessions: {
      retrieve(id: string): Promise<{ payment_intent: string | { id: string } | null }>
    }
  }
}

/** Minimal Supabase surface (the service-role client satisfies this). */
interface PriorityRefundMutation {
  eq(column: string, value: unknown): PriorityRefundMutation
  select(column: "id" | "id, updated_at"): {
    maybeSingle(): PromiseLike<{
      data: { id: string; updated_at?: string } | null
      error: { message: string } | null
    }>
  }
  then<TResult1 = { error: { message: string } | null }>(
    onfulfilled?: ((value: { error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
  ): PromiseLike<TResult1>
}

export interface PriorityRefundDb {
  from(table: "intakes"): {
    update(values: Record<string, unknown>): PriorityRefundMutation
  }
}

export type PriorityFeeRefundResult =
  | { status: "pending"; refundId: string; amountCents: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string }

export async function refundPriorityFeeOnBreach(
  deps: { stripe: PriorityRefundStripe; supabase: PriorityRefundDb },
  intake: PriorityBreachIntake,
): Promise<PriorityFeeRefundResult> {
  if (!intake.is_priority) return { status: "skipped", reason: "not_priority" }
  if (intake.priority_fee_refunded_at) return { status: "skipped", reason: "already_refunded" }
  if (intake.refund_status === "pending" && intake.refund_stripe_id) {
    return { status: "skipped", reason: "refund_pending" }
  }
  const advancesFailedRefund = intake.refund_status === "failed" && Boolean(intake.refund_stripe_id)
  if (advancesFailedRefund && intake.priority_fee_refund_retry_attempted_at) {
    return { status: "skipped", reason: "failed_refund_retry_exhausted" }
  }
  // `paid` only: partially_refunded/refunded means support or decline already
  // moved money on this intake — never stack a fee refund on top of that.
  if (intake.payment_status !== "paid") {
    return { status: "skipped", reason: `payment_status_${intake.payment_status ?? "unknown"}` }
  }
  if ((intake.refund_amount_cents ?? 0) > 0) {
    return { status: "skipped", reason: "existing_refund_amount" }
  }
  // The fee must be a strict subset of the charge; refunding a fee that equals
  // or exceeds the whole payment would be a full refund in disguise.
  if ((intake.amount_cents ?? 0) <= PRIORITY_FEE_CENTS) {
    return { status: "skipped", reason: "amount_too_small" }
  }

  let paymentIntentId = intake.stripe_payment_intent_id
  if (!paymentIntentId && intake.payment_id) {
    try {
      const session = await deps.stripe.checkout.sessions.retrieve(intake.payment_id)
      paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null
    } catch {
      logger.warn("Failed to resolve checkout session for breach refund", { intakeId: intake.id })
    }
  }
  if (!paymentIntentId) {
    captureBreachRefundFailure(intake.id, "No payment intent available for priority breach refund")
    return { status: "failed", error: "no_payment_intent" }
  }

  const requestedReservationAt = new Date(
    Math.max(Date.now(), Date.parse(intake.updated_at) + 1),
  ).toISOString()
  const { data: reserved, error: reservationError } = await deps.supabase
    .from("intakes")
    .update({
      refund_status: "pending",
      refund_error: null,
      updated_at: requestedReservationAt,
      ...(advancesFailedRefund
        ? { priority_fee_refund_retry_attempted_at: requestedReservationAt }
        : {}),
    })
    .eq("id", intake.id)
    .eq("updated_at", intake.updated_at)
    .select("id, updated_at")
    .maybeSingle()
  if (reservationError || !reserved || typeof reserved.updated_at !== "string") {
    const message = reservationError?.message ?? (
      !reserved ? "intake_changed" : "persisted_version_unavailable"
    )
    captureBreachRefundFailure(intake.id, `Could not reserve refund request: ${message}`)
    return { status: "failed", error: "state_reservation_failed" }
  }
  const reservationUpdatedAt = reserved.updated_at

  let refund: { id: string; amount: number | null }
  try {
    refund = await deps.stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: PRIORITY_FEE_CENTS,
        reason: "requested_by_customer",
        metadata: {
          intake_id: intake.id,
          category: intake.category || "unknown",
          refund_type: "priority_breach",
        },
      },
      {
        idempotencyKey: advancesFailedRefund
          ? `priority_breach_${intake.id}_after_${intake.refund_stripe_id}`
          : `priority_breach_${intake.id}`,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe error"
    await deps.supabase
      .from("intakes")
      .update({
        refund_status: "failed",
        refund_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake.id)
      .eq("updated_at", reservationUpdatedAt)
    captureBreachRefundFailure(intake.id, message)
    return { status: "failed", error: message }
  }

  const refundedCents = refund.amount ?? PRIORITY_FEE_CENTS
  const nowIso = new Date().toISOString()
  const { data: updated, error: updateError } = await deps.supabase
    .from("intakes")
    .update({
      refund_status: "pending",
      refund_stripe_id: refund.id,
      refund_error: null,
      updated_at: nowIso,
    })
    .eq("id", intake.id)
    .eq("updated_at", reservationUpdatedAt)
    .eq("refund_status", "pending")
    .select("id")
    .maybeSingle()

  if (updateError) {
    // Stripe accepted the request but pending state did not land. A retry uses
    // the same idempotency key, so it cannot create a second refund.
    captureBreachRefundFailure(
      intake.id,
      `Refund request accepted but intake update failed: ${updateError.message}`,
    )
    return { status: "failed", error: "state_write_failed" }
  }
  if (!updated) {
    logger.info("Exact refund webhook state won the priority create-response race", {
      intakeId: intake.id,
      refundId: refund.id,
    })
  }

  logger.info("Priority fee refund requested on breach", {
    intakeId: intake.id,
    refundId: refund.id,
    amountCents: refundedCents,
  })
  return { status: "pending", refundId: refund.id, amountCents: refundedCents }
}

function captureBreachRefundFailure(intakeId: string, message: string): void {
  logger.error("Priority breach refund failed", { intakeId, message })
  Sentry.captureMessage("Priority fee breach refund failed", {
    level: "error",
    tags: { alert_type: "priority_breach_refund", intake_id: intakeId },
    extra: { message },
    fingerprint: ["priority-breach-refund", intakeId],
  })
}
