import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import {
  buildStripeRefundEventEvidence,
  hasSameStripeRefundEvidence,
  STRIPE_REFUND_EVIDENCE_SELECT,
  type StripeRefundEvidenceRow,
} from "@/lib/stripe/refund-event-ledger"

const log = createLogger("stripe-webhook:refund-ledger")

export type PersistStripeRefundEvidenceResult = {
  error: string | null
  intakeId: string | null
  refunds: Stripe.Refund[]
}

export type StripeRefundReconciliationState = {
  amount_cents: number | null
  id: string
  payment_status: string
  priority_fee_refunded_at: string | null
  refund_amount_cents: number | null
  refund_status: string | null
  refund_stripe_id: string | null
  refunded_at: string | null
}

export async function reconcilePersistedStripeRefundState(input: {
  intakeId: string | null
  livemode: boolean
  refunds: Stripe.Refund[]
  supabase: SupabaseClient
}): Promise<{
  error: string | null
  state: StripeRefundReconciliationState | null
}> {
  if (!input.intakeId) return { error: null, state: null }
  const triggerRefund = input.refunds.reduce<Stripe.Refund | null>(
    (latest, refund) => !latest || refund.created > latest.created ? refund : latest,
    null,
  )
  const { data, error } = await input.supabase.rpc("reconcile_intake_refund_cash_state", {
    p_intake_id: input.intakeId,
    p_livemode: input.livemode,
    p_trigger_status: triggerRefund?.status ?? null,
  })
  if (error) {
    return {
      error: `Stripe refund intake reconciliation failed: ${error.message}`,
      state: null,
    }
  }
  const rpcIntakeId = data && typeof data === "object" && "intake_id" in data
    ? data.intake_id
    : input.intakeId
  if (rpcIntakeId !== input.intakeId) {
    return { error: "Stripe refund reconciliation returned a conflicting intake", state: null }
  }

  const stateRead = await input.supabase
    .from("intakes")
    .select(
      "id, amount_cents, payment_status, priority_fee_refunded_at, " +
      "refund_amount_cents, refund_status, refund_stripe_id, refunded_at",
    )
    .eq("id", input.intakeId)
    .maybeSingle()
  if (stateRead.error) {
    return {
      error: `Stripe refund reconciled state read failed: ${stateRead.error.message}`,
      state: null,
    }
  }
  if (!stateRead.data) {
    return { error: "Stripe refund reconciled intake is missing", state: null }
  }
  return {
    error: null,
    state: stateRead.data as unknown as StripeRefundReconciliationState,
  }
}

export async function readExactRefundAdjustmentTarget(input: {
  state: StripeRefundReconciliationState | null
  supabase: SupabaseClient
}): Promise<{
  adjustmentDateTime: Date | null
  error: string | null
  targetNetValueCents: number | null
}> {
  if (!input.state) {
    return { adjustmentDateTime: null, error: null, targetNetValueCents: null }
  }
  const { data, error } = await input.supabase
    .from("stripe_payment_adjustment_targets")
    .select("target_net_value_cents, adjustment_at")
    .eq("intake_id", input.state.id)
    .maybeSingle()
  if (error) {
    return {
      error: `Stripe refund aggregate Ads target lookup failed: ${error.message}`,
      adjustmentDateTime: null,
      targetNetValueCents: null,
    }
  }
  if (data) {
    const target = Number(data.target_net_value_cents)
    const adjustmentDateTime = typeof data.adjustment_at === "string"
      ? new Date(data.adjustment_at)
      : null
    return Number.isInteger(target) && target >= 0 && adjustmentDateTime &&
      Number.isFinite(adjustmentDateTime.getTime())
      ? { adjustmentDateTime, error: null, targetNetValueCents: target }
      : {
          adjustmentDateTime: null,
          error: "Stripe refund aggregate Ads target is invalid",
          targetNetValueCents: null,
        }
  }
  return { adjustmentDateTime: null, error: null, targetNetValueCents: null }
}

export async function persistStripeRefundEventEvidence(input: {
  event: Stripe.Event
  supabase: SupabaseClient
}): Promise<PersistStripeRefundEvidenceResult> {
  const refundsResult = await exactRefundsForEvent(input.event)
  if (refundsResult.error) {
    return { error: refundsResult.error, intakeId: null, refunds: [] }
  }

  const paymentIntentId = refundPaymentIntentId(input.event, refundsResult.refunds)
  const intakeResult = await findRefundIntake(input.supabase, paymentIntentId)
  if (intakeResult.error) {
    return { error: intakeResult.error, intakeId: null, refunds: refundsResult.refunds }
  }

  const evidence = buildStripeRefundEventEvidence({
    event: input.event,
    intakeId: intakeResult.intakeId,
    refunds: refundsResult.refunds,
  })
  const expectedEvidenceCount = new Set(
    refundsResult.refunds.map((refund) => refund.id),
  ).size
  if (evidence.length !== expectedEvidenceCount || evidence.length === 0) {
    return {
      error: "Stripe refund event contains no valid exact refund evidence",
      intakeId: intakeResult.intakeId,
      refunds: refundsResult.refunds,
    }
  }

  const { error } = await input.supabase
    .from("stripe_refund_events")
    .upsert(evidence satisfies StripeRefundEvidenceRow[], {
      ignoreDuplicates: true,
      onConflict: "evidence_key",
    })
  if (error) {
    return {
      error: `Stripe refund evidence write failed: ${error.message}`,
      intakeId: intakeResult.intakeId,
      refunds: refundsResult.refunds,
    }
  }

  const verification = await input.supabase
    .from("stripe_refund_events")
    .select(STRIPE_REFUND_EVIDENCE_SELECT)
    .in("evidence_key", evidence.map((row) => row.evidence_key))
  if (verification.error) {
    return {
      error: `Stripe refund evidence verification failed: ${verification.error.message}`,
      intakeId: intakeResult.intakeId,
      refunds: refundsResult.refunds,
    }
  }
  const persistedByKey = new Map(
    ((verification.data ?? []) as unknown as StripeRefundEvidenceRow[])
      .map((row) => [row.evidence_key, row]),
  )
  if (evidence.some((row) => !hasSameStripeRefundEvidence(
    row,
    persistedByKey.get(row.evidence_key),
  ))) {
    return {
      error: "Stripe refund evidence conflicts with an immutable observation",
      intakeId: intakeResult.intakeId,
      refunds: refundsResult.refunds,
    }
  }

  return { error: null, intakeId: intakeResult.intakeId, refunds: refundsResult.refunds }
}

export function reportStripeRefundEvidenceFailure(
  event: Stripe.Event,
  message: string,
): void {
  log.error(message, { eventId: event.id, eventType: event.type })
  Sentry.captureMessage("Stripe refund evidence unavailable", {
    level: "error",
    tags: { source: "stripe-refund-event-ledger" },
    extra: { eventId: event.id, eventType: event.type },
  })
}

async function exactRefundsForEvent(event: Stripe.Event): Promise<{
  error: string | null
  refunds: Stripe.Refund[]
}> {
  let refunds: Stripe.Refund[]
  if (event.type !== "charge.refunded") {
    refunds = [event.data.object as Stripe.Refund]
  } else {
    const charge = event.data.object as Stripe.Charge
    const embedded = charge.refunds?.data ?? []
    if (embedded.length > 0 && !charge.refunds?.has_more) {
      refunds = embedded
    } else {
      try {
        const listed = await stripe.refunds.list({
          charge: charge.id,
          expand: [
            "data.balance_transaction",
            "data.failure_balance_transaction",
          ],
          limit: 100,
        })
        if (listed.has_more) {
          return {
            error: "Stripe refund evidence exceeds the bounded charge refund read",
            refunds: [],
          }
        }
        refunds = listed.data
      } catch {
        return { error: "Stripe charge refund evidence lookup failed", refunds: [] }
      }
    }
  }

  try {
    return { error: null, refunds: await hydrateRefundBalanceTransactions(refunds) }
  } catch {
    return { error: "Stripe refund balance evidence lookup failed", refunds: [] }
  }
}

async function hydrateRefundBalanceTransactions(
  refunds: Stripe.Refund[],
): Promise<Stripe.Refund[]> {
  const hydrated: Stripe.Refund[] = []
  for (const refund of refunds) {
    const balanceTransaction = typeof refund.balance_transaction === "string"
      ? await stripe.balanceTransactions.retrieve(refund.balance_transaction)
      : refund.balance_transaction
    const failureBalanceTransaction = typeof refund.failure_balance_transaction === "string"
      ? await stripe.balanceTransactions.retrieve(refund.failure_balance_transaction)
      : refund.failure_balance_transaction
    hydrated.push({
      ...refund,
      balance_transaction: balanceTransaction,
      ...(failureBalanceTransaction
        ? { failure_balance_transaction: failureBalanceTransaction }
        : {}),
    })
  }
  return hydrated
}

async function findRefundIntake(
  supabase: SupabaseClient,
  paymentIntentId: string | null,
): Promise<{ error: string | null; intakeId: string | null }> {
  if (!paymentIntentId) return { error: null, intakeId: null }
  const { data, error } = await supabase
    .from("intakes")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()
  if (error) {
    return {
      error: `Stripe refund intake lookup failed: ${error.message}`,
      intakeId: null,
    }
  }
  if (data?.id) return { error: null, intakeId: data.id }

  let paymentIntent: Stripe.PaymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch {
    return { error: "Stripe refund PaymentIntent metadata lookup failed", intakeId: null }
  }
  const metadataIntakeId = paymentIntent.metadata?.intake_id || paymentIntent.metadata?.request_id
  if (!metadataIntakeId) return { error: null, intakeId: null }

  const metadataRead = await supabase
    .from("intakes")
    .select("id, stripe_payment_intent_id")
    .eq("id", metadataIntakeId)
    .maybeSingle()
  if (metadataRead.error) {
    return {
      error: `Stripe refund metadata intake lookup failed: ${metadataRead.error.message}`,
      intakeId: null,
    }
  }
  if (!metadataRead.data) {
    return { error: "Stripe refund PaymentIntent metadata intake is missing", intakeId: null }
  }
  if (
    metadataRead.data.stripe_payment_intent_id &&
    metadataRead.data.stripe_payment_intent_id !== paymentIntentId
  ) {
    return { error: "Stripe refund PaymentIntent metadata conflicts with intake", intakeId: null }
  }
  return { error: null, intakeId: metadataRead.data.id }
}

function refundPaymentIntentId(
  event: Stripe.Event,
  refunds: Stripe.Refund[],
): string | null {
  const refundPaymentIntent = refunds
    .map((refund) => stripeId(refund.payment_intent))
    .find((value): value is string => Boolean(value))
  if (refundPaymentIntent) return refundPaymentIntent
  if (event.type !== "charge.refunded") return null
  return stripeId((event.data.object as Stripe.Charge).payment_intent)
}

function stripeId(value: { id: string } | string | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}
