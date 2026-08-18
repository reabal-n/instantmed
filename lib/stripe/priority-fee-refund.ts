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
 * - The stale-queue cron initiates generation 1 only. Durable recovery owns
 *   same-key replay and the one bounded successor after terminal failure.
 * - Only fires from `payment_status = "paid"` with zero prior refund cents, so
 *   it can never stack on a support or decline refund.
 * - A later decline still tops the patient up to a FULL refund:
 *   decline-refund.ts refunds the remaining balance and accumulates
 *   `refund_amount_cents` (see the partially_refunded gate in decline-intake).
 */

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { PRICING } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"
import { requestStripeRefund } from "@/lib/stripe/refund-attempts"

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
  stripe_payment_intent_id: string | null
  payment_id: string | null
  updated_at: string
}

/** Minimal Stripe surface so unit tests can inject a fake. */
export interface PriorityRefundStripe {
  refunds: Pick<Stripe["refunds"], "create">
  checkout: {
    sessions: {
      retrieve(id: string): Promise<{ payment_intent: string | { id: string } | null }>
    }
  }
}

export type PriorityRefundDb = Pick<SupabaseClient, "rpc">

export type PriorityFeeRefundResult =
  | {
      status: "pending"
      attemptId: string
      refundId?: string
      amountCents: number
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string }

export async function refundPriorityFeeOnBreach(
  deps: { stripe: PriorityRefundStripe; supabase: PriorityRefundDb },
  intake: PriorityBreachIntake,
): Promise<PriorityFeeRefundResult> {
  if (!intake.is_priority) return { status: "skipped", reason: "not_priority" }
  if (intake.priority_fee_refunded_at) return { status: "skipped", reason: "already_refunded" }
  if (intake.refund_status === "pending") {
    return { status: "skipped", reason: "refund_pending" }
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

  const result = await requestStripeRefund({
    stripe: deps.stripe,
    supabase: deps.supabase,
  }, {
    intakeId: intake.id,
    paymentIntentId,
    refundType: "priority_breach",
    targetTotalCents: PRIORITY_FEE_CENTS,
  })

  if (result.status === "failed") {
    captureBreachRefundFailure(intake.id, result.error)
    return { status: "failed", error: result.error }
  }
  if (result.status === "cash_satisfied") {
    return { status: "skipped", reason: "already_refunded" }
  }
  if (result.status === "active") {
    return { status: "skipped", reason: "refund_pending" }
  }

  logger.info("Priority fee refund requested on breach", {
    attemptId: result.attemptId,
    outcome: result.status,
    intakeId: intake.id,
    refundId: result.refundId,
    amountCents: result.amountCents,
  })
  return {
    status: "pending",
    attemptId: result.attemptId,
    ...(result.refundId ? { refundId: result.refundId } : {}),
    amountCents: result.amountCents,
  }
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
