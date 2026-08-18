import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import {
  buildStripeRefundApiEvidence,
  buildStripeRefundEventEvidence,
  hasSameStripeRefundEvidence,
  STRIPE_REFUND_EVIDENCE_SELECT,
  type StripeRefundEvidenceRow,
} from "@/lib/stripe/refund-event-ledger"
import { resolveStripeRefundIntake } from "@/lib/stripe/refund-intake-resolution"

const log = createLogger("stripe-webhook:refund-ledger")
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PersistStripeRefundEvidenceResult = {
  evidence: StripeRefundEvidenceRow[]
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
    return { evidence: [], error: refundsResult.error, intakeId: null, refunds: [] }
  }

  const eventCharge = input.event.type === "charge.refunded"
    ? input.event.data.object as Stripe.Charge
    : null
  const eventPaymentIntentId = stripeId(eventCharge?.payment_intent)
  const resolutions = []
  for (const refund of refundsResult.refunds) {
    const resolution = await resolveStripeRefundIntake(
      { stripe, supabase: input.supabase },
      { eventCharge, eventPaymentIntentId, refund },
    )
    if (resolution.error) {
      return {
        evidence: [],
        error: resolution.error,
        intakeId: null,
        refunds: refundsResult.refunds,
      }
    }
    if (!resolution.intakeId) {
      return {
        evidence: [],
        error: "Stripe refund could not be linked to one intake",
        intakeId: null,
        refunds: refundsResult.refunds,
      }
    }
    resolutions.push({ refund, resolution })
  }

  if (resolutions.length === 0) {
    return {
      evidence: [],
      error: "Stripe refund event contains no refunds",
      intakeId: null,
      refunds: refundsResult.refunds,
    }
  }
  const intakeIds = new Set(
    resolutions.map(({ resolution }) => resolution.intakeId),
  )
  if (intakeIds.size !== 1) {
    return {
      evidence: [],
      error: "Stripe refunds in one event resolve to different intakes",
      intakeId: null,
      refunds: refundsResult.refunds,
    }
  }
  const intakeId = resolutions[0]?.resolution.intakeId ?? null
  if (!intakeId) {
    return {
      evidence: [],
      error: "Stripe refund event has no resolved intake",
      intakeId: null,
      refunds: refundsResult.refunds,
    }
  }

  for (const { refund, resolution } of resolutions) {
    const attemptId = refund.metadata?.refund_attempt_id?.trim()
    if (!attemptId) continue
    if (!UUID_PATTERN.test(attemptId)) {
      return {
        evidence: [],
        error: "Stripe refund attempt metadata is invalid",
        intakeId,
        refunds: refundsResult.refunds,
      }
    }
    if (!resolution.paymentIntentId) {
      return {
        evidence: [],
        error: "Stripe refund attempt metadata has no resolved PaymentIntent",
        intakeId,
        refunds: refundsResult.refunds,
      }
    }
    const binding = await input.supabase.rpc(
      "bind_stripe_refund_attempt_from_webhook",
      {
        p_amount_cents: refund.amount,
        p_attempt_id: attemptId,
        p_intake_id: intakeId,
        p_livemode: input.event.livemode,
        p_payment_intent_id: resolution.paymentIntentId,
        p_refund_type: refund.metadata?.refund_type ?? null,
        p_stripe_refund_id: refund.id,
        p_stripe_status: refund.status ?? null,
      },
    )
    if (binding.error || binding.data !== true) {
      return {
        evidence: [],
        error: binding.error
          ? `Stripe refund attempt binding failed: ${binding.error.message}`
          : "Stripe refund attempt binding returned incomplete evidence",
        intakeId,
        refunds: refundsResult.refunds,
      }
    }
  }

  const evidence = buildStripeRefundEventEvidence({
    event: input.event,
    intakeId,
    refunds: refundsResult.refunds,
  })
  const expectedEvidenceCount = new Set(
    refundsResult.refunds.map((refund) => refund.id),
  ).size
  if (evidence.length !== expectedEvidenceCount || evidence.length === 0) {
    return {
      evidence: [],
      error: "Stripe refund event contains no valid exact refund evidence",
      intakeId,
      refunds: refundsResult.refunds,
    }
  }

  const persistence = await persistAndVerifyRefundEvidence(
    input.supabase,
    evidence,
  )
  if (persistence.error) {
    return {
      evidence: [],
      error: persistence.error,
      intakeId,
      refunds: refundsResult.refunds,
    }
  }

  return {
    evidence: persistence.evidence,
    error: null,
    intakeId,
    refunds: refundsResult.refunds,
  }
}

export async function persistStripeRefundApiObservation(input: {
  intakeId: string
  livemode: boolean
  refund: Stripe.Refund
  supabase: SupabaseClient
}): Promise<{ evidence: StripeRefundEvidenceRow[]; error: string | null }> {
  const evidence = buildStripeRefundApiEvidence(input)
  if (!evidence) {
    return {
      evidence: [],
      error: "Stripe refund recovery contains no valid exact evidence",
    }
  }
  return persistAndVerifyRefundEvidence(input.supabase, [evidence])
}

/**
 * Mark durable refund attempts downstream-complete only after exact evidence
 * has been persisted and patient notification work has succeeded. Pending
 * invocation-local evidence skips finalization and remains recovery-owned;
 * terminal exact evidence must win its semantic lifecycle CAS or stay retryable.
 */
export async function finalizePersistedStripeRefundAttempts(input: {
  evidence: StripeRefundEvidenceRow[]
  livemode: boolean
  refunds: Stripe.Refund[]
  supabase: SupabaseClient
}): Promise<{ error: string | null }> {
  const attemptRefundIds = new Map<string, string>()
  const refundAttemptIds = new Map<string, string>()
  const candidates = new Map<string, {
    attemptId: string
    expectedOutcome: "failed" | "succeeded"
    refundCashAt: string | null
    refundId: string
    refundReversedAt: string | null
  }>()

  for (const refund of input.refunds) {
    const attemptId = refund.metadata?.refund_attempt_id?.trim()
    if (!attemptId) continue
    if (!UUID_PATTERN.test(attemptId)) {
      return { error: "Stripe refund attempt metadata is invalid" }
    }

    const priorRefundId = attemptRefundIds.get(attemptId)
    if (priorRefundId && priorRefundId !== refund.id) {
      return { error: "Stripe refund attempt metadata conflicts across refunds" }
    }
    attemptRefundIds.set(attemptId, refund.id)
    const priorAttemptId = refundAttemptIds.get(refund.id)
    if (priorAttemptId && priorAttemptId !== attemptId) {
      return { error: "Stripe refund metadata maps one refund to multiple attempts" }
    }
    refundAttemptIds.set(refund.id, attemptId)

    const exactEvidence = input.evidence.filter(
      (row) => row.stripe_refund_id === refund.id,
    )
    if (exactEvidence.length === 0) {
      return { error: "Stripe refund attempt finalization evidence is missing" }
    }
    if (exactEvidence.some((row) => row.livemode !== input.livemode)) {
      return { error: "Stripe refund attempt finalization evidence conflicts with Stripe mode" }
    }
    const localLifecycle = currentLocalRefundEvidence(exactEvidence)
    if (!localLifecycle || !isTerminalRefundEvidence(localLifecycle)) continue
    candidates.set(attemptId, {
      attemptId,
      expectedOutcome: terminalRefundOutcome(localLifecycle),
      refundCashAt: localLifecycle.refund_cash_at,
      refundId: refund.id,
      refundReversedAt: localLifecycle.refund_reversed_at,
    })
  }

  for (const candidate of candidates.values()) {
    let finalization: Awaited<ReturnType<SupabaseClient["rpc"]>>
    try {
      finalization = await input.supabase.rpc("finalize_stripe_refund_attempt", {
        p_attempt_id: candidate.attemptId,
        p_expected_outcome: candidate.expectedOutcome,
        p_expected_refund_cash_at: candidate.refundCashAt,
        p_expected_refund_reversed_at: candidate.refundReversedAt,
        p_livemode: input.livemode,
        p_stripe_refund_id: candidate.refundId,
      })
    } catch {
      return { error: "Stripe refund attempt finalization failed" }
    }
    if (finalization.error) {
      return {
        error: `Stripe refund attempt finalization failed: ${finalization.error.message}`,
      }
    }
    if (finalization.data === true) continue
    return {
      error: finalization.data === false
        ? "Stripe refund attempt finalization returned false for terminal evidence"
        : "Stripe refund attempt finalization returned an invalid result",
    }
  }

  return { error: null }
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

function currentLocalRefundEvidence(
  evidence: StripeRefundEvidenceRow[],
): StripeRefundEvidenceRow | null {
  return [...evidence].sort((left, right) => {
    const timestampDifference = refundEvidenceLifecycleAt(right) -
      refundEvidenceLifecycleAt(left)
    if (timestampDifference !== 0) return timestampDifference
    const statusDifference = refundStatusPriority(right.refund_status) -
      refundStatusPriority(left.refund_status)
    if (statusDifference !== 0) return statusDifference
    return right.evidence_key.localeCompare(left.evidence_key)
  })[0] ?? null
}

function isTerminalRefundEvidence(row: StripeRefundEvidenceRow): boolean {
  return Boolean(
    row.refund_cash_at ||
    row.refund_reversed_at ||
    row.refund_status === "failed" ||
    row.refund_status === "canceled",
  )
}

function terminalRefundOutcome(
  row: StripeRefundEvidenceRow,
): "failed" | "succeeded" {
  return row.refund_reversed_at ||
    row.refund_status === "failed" ||
    row.refund_status === "canceled"
    ? "failed"
    : "succeeded"
}

function refundEvidenceLifecycleAt(row: StripeRefundEvidenceRow): number {
  if (
    row.evidence_source === "refund.created" ||
    row.evidence_source === "refund.updated" ||
    row.evidence_source === "refund.failed"
  ) {
    return parsedTimestamp(row.stripe_event_created_at)
  }
  return Math.max(
    parsedTimestamp(row.refund_reversed_at),
    parsedTimestamp(row.refund_cash_at),
    parsedTimestamp(row.refund_created_at),
  )
}

function refundStatusPriority(status: string | null): number {
  if (status === "failed" || status === "canceled") return 50
  if (status === "succeeded") return 40
  if (status === "requires_action" || status === "pending") return 30
  return 10
}

function parsedTimestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
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

function stripeId(
  value: { id: string } | string | null | undefined,
): string | null {
  if (typeof value === "string") return value.trim() || null
  return value?.id?.trim() || null
}

async function persistAndVerifyRefundEvidence(
  supabase: SupabaseClient,
  evidence: StripeRefundEvidenceRow[],
): Promise<{ evidence: StripeRefundEvidenceRow[]; error: string | null }> {
  const { error } = await supabase
    .from("stripe_refund_events")
    .upsert(evidence satisfies StripeRefundEvidenceRow[], {
      ignoreDuplicates: true,
      onConflict: "evidence_key",
    })
  if (error) {
    return {
      evidence: [],
      error: `Stripe refund evidence write failed: ${error.message}`,
    }
  }

  const verification = await supabase
    .from("stripe_refund_events")
    .select(STRIPE_REFUND_EVIDENCE_SELECT)
    .in("evidence_key", evidence.map((row) => row.evidence_key))
  if (verification.error) {
    return {
      evidence: [],
      error: `Stripe refund evidence verification failed: ${verification.error.message}`,
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
      evidence: [],
      error: "Stripe refund evidence conflicts with an immutable observation",
    }
  }
  return {
    evidence: evidence.map((row) => persistedByKey.get(row.evidence_key)!),
    error: null,
  }
}
