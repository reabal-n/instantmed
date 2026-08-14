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

export async function reconcilePersistedStripeRefundState(input: {
  intakeId: string | null
  livemode: boolean
  refunds: Stripe.Refund[]
  supabase: SupabaseClient
}): Promise<string | null> {
  if (!input.intakeId) return null
  const triggerRefund = input.refunds.reduce<Stripe.Refund | null>(
    (latest, refund) => !latest || refund.created > latest.created ? refund : latest,
    null,
  )
  const { error } = await input.supabase.rpc("reconcile_intake_refund_cash_state", {
    p_intake_id: input.intakeId,
    p_livemode: input.livemode,
    p_trigger_status: triggerRefund?.status ?? null,
  })
  return error
    ? `Stripe refund intake reconciliation failed: ${error.message}`
    : null
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
  return { error: null, intakeId: data?.id ?? null }
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
