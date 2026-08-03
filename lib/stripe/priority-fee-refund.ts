/**
 * Priority-fee breach auto-refund (operator decision 2026-08-03).
 *
 * Priority review sells queue position, not a turnaround promise — but when a
 * priority intake is still undecided PRIORITY_BREACH_HOURS after payment, the
 * fee didn't buy anything real. The stale-queue cron calls this to refund the
 * fee automatically (overnight breaches happen while no operator is awake),
 * stamp `priority_fee_refunded_at`, and let approval emails acknowledge it.
 *
 * Money-path invariants:
 * - Fee-only partial refund; never touches the service amount.
 * - Idempotent per intake via a fixed Stripe idempotency key, and once-only
 *   via the `priority_fee_refunded_at` stamp (re-checked by the cron query).
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
export const PRIORITY_FEE_CENTS = Math.round(PRICING.PRIORITY_FEE * 100)

export interface PriorityBreachIntake {
  id: string
  category: string | null
  is_priority: boolean | null
  payment_status: string | null
  amount_cents: number | null
  refund_amount_cents: number | null
  priority_fee_refunded_at: string | null
  stripe_payment_intent_id: string | null
  payment_id: string | null
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
export interface PriorityRefundDb {
  from(table: "intakes"): {
    update(values: Record<string, unknown>): {
      eq(column: "id", value: string): PromiseLike<{ error: { message: string } | null }>
    }
  }
}

export type PriorityFeeRefundResult =
  | { status: "refunded"; refundId: string; amountCents: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string }

export async function refundPriorityFeeOnBreach(
  deps: { stripe: PriorityRefundStripe; supabase: PriorityRefundDb },
  intake: PriorityBreachIntake,
): Promise<PriorityFeeRefundResult> {
  if (!intake.is_priority) return { status: "skipped", reason: "not_priority" }
  if (intake.priority_fee_refunded_at) return { status: "skipped", reason: "already_refunded" }
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
      { idempotencyKey: `priority_breach_${intake.id}` },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe error"
    captureBreachRefundFailure(intake.id, message)
    return { status: "failed", error: message }
  }

  const nowIso = new Date().toISOString()
  const refundedCents = refund.amount ?? PRIORITY_FEE_CENTS
  const { error: updateError } = await deps.supabase
    .from("intakes")
    .update({
      payment_status: "partially_refunded",
      refund_status: "succeeded",
      refund_stripe_id: refund.id,
      refund_amount_cents: (intake.refund_amount_cents ?? 0) + refundedCents,
      refunded_at: nowIso,
      priority_fee_refunded_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", intake.id)

  if (updateError) {
    // Money moved but the stamp didn't land: the cron retries next hour and the
    // fixed idempotency key makes Stripe return the same refund, so this
    // self-heals without double-refunding. Alarm loudly anyway.
    captureBreachRefundFailure(
      intake.id,
      `Refund succeeded but intake update failed: ${updateError.message}`,
    )
    return { status: "failed", error: "state_write_failed" }
  }

  logger.info("Priority fee refunded on breach", {
    intakeId: intake.id,
    refundId: refund.id,
    amountCents: refundedCents,
  })
  return { status: "refunded", refundId: refund.id, amountCents: refundedCents }
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
