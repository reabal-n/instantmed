import type Stripe from "stripe"

export const STRIPE_REFUND_EVIDENCE_SELECT = [
  "amount_cents",
  "balance_transaction_id",
  "charge_id",
  "currency",
  "evidence_key",
  "evidence_source",
  "failure_balance_transaction_id",
  "intake_id",
  "is_priority_fee_refund",
  "livemode",
  "payment_intent_id",
  "refund_cash_at",
  "refund_created_at",
  "refund_reversed_at",
  "refund_status",
  "stripe_event_created_at",
  "stripe_event_id",
  "stripe_refund_id",
].join(", ")

type StripeRefundEvidenceSource =
  | "charge.refunded"
  | "refund.created"
  | "refund.failed"
  | "refund.list.backfill"
  | "refund.updated"

export type StripeRefundEvidenceRow = {
  amount_cents: number
  balance_transaction_id: string | null
  charge_id: string | null
  currency: string
  evidence_key: string
  evidence_source: StripeRefundEvidenceSource
  failure_balance_transaction_id: string | null
  intake_id: string | null
  is_priority_fee_refund: boolean
  livemode: boolean
  payment_intent_id: string | null
  refund_cash_at: string | null
  refund_created_at: string
  refund_reversed_at: string | null
  refund_status: string | null
  stripe_event_created_at: string | null
  stripe_event_id: string | null
  stripe_refund_id: string
}

type StripeRefundEventEvidenceInput = {
  event: Stripe.Event
  intakeId: string | null
  refunds?: Stripe.Refund[]
}

type RefundBalanceLifecycle = {
  balanceTransactionId: string | null
  cashAt: string | null
  failureBalanceTransactionId: string | null
  reversedAt: string | null
}

export function buildStripeRefundEventEvidence(
  input: StripeRefundEventEvidenceInput,
): StripeRefundEvidenceRow[] {
  const eventType = input.event.type
  if (
    eventType !== "charge.refunded" &&
    eventType !== "refund.created" &&
    eventType !== "refund.failed" &&
    eventType !== "refund.updated"
  ) {
    return []
  }

  const eventCreatedAt = stripeTimestamp(input.event.created)
  if (!eventCreatedAt) return []

  const object = input.event.data.object
  const charge = eventType === "charge.refunded"
    ? object as Stripe.Charge
    : null
  const refunds = eventType === "charge.refunded"
    ? input.refunds ?? charge?.refunds?.data ?? []
    : input.refunds ?? [object as Stripe.Refund]
  const chargePaymentIntentId = stripeId(charge?.payment_intent ?? null)
  const uniqueRefunds = new Map(refunds.map((refund) => [refund.id, refund]))

  return [...uniqueRefunds.values()].flatMap((refund) => {
    const evidence = buildEvidenceFields(refund)
    if (!evidence) return []

    return [{
      ...evidence,
      evidence_key: `${modePrefix(input.event.livemode)}:event:${input.event.id}:refund:${refund.id}`,
      evidence_source: eventType,
      intake_id: input.intakeId,
      livemode: input.event.livemode,
      payment_intent_id: stripeId(refund.payment_intent) ?? chargePaymentIntentId,
      stripe_event_created_at: eventCreatedAt,
      stripe_event_id: input.event.id,
    } satisfies StripeRefundEvidenceRow]
  })
}

export function buildStripeRefundBackfillEvidence(input: {
  intakeId: string | null
  livemode: boolean
  refund: Stripe.Refund
}): StripeRefundEvidenceRow | null {
  const evidence = buildEvidenceFields(input.refund)
  if (!evidence) return null

  return {
    ...evidence,
    evidence_key: [
      `${modePrefix(input.livemode)}:refund:${input.refund.id}:observation`,
      evidence.balance_transaction_id ?? "none",
      evidence.failure_balance_transaction_id ?? "none",
      evidence.refund_status ?? "unknown",
    ].join(":"),
    evidence_source: "refund.list.backfill",
    intake_id: input.intakeId,
    livemode: input.livemode,
    payment_intent_id: stripeId(input.refund.payment_intent),
    stripe_event_created_at: null,
    stripe_event_id: null,
  }
}

export function hasSameStripeRefundEvidence(
  expected: StripeRefundEvidenceRow,
  actual: StripeRefundEvidenceRow | undefined,
): boolean {
  if (!actual) return false
  return (Object.keys(expected) as Array<keyof StripeRefundEvidenceRow>)
    .every((key) => {
      const expectedValue = expected[key]
      const actualValue = actual[key]
      if (
        key === "refund_cash_at" ||
        key === "refund_created_at" ||
        key === "refund_reversed_at" ||
        key === "stripe_event_created_at"
      ) {
        if (expectedValue === null || actualValue === null) {
          return expectedValue === actualValue
        }
        return Date.parse(String(expectedValue)) === Date.parse(String(actualValue))
      }
      return actualValue === expectedValue
    })
}

function buildEvidenceFields(refund: Stripe.Refund): Omit<
  StripeRefundEvidenceRow,
  | "evidence_key"
  | "evidence_source"
  | "intake_id"
  | "livemode"
  | "payment_intent_id"
  | "stripe_event_created_at"
  | "stripe_event_id"
> | null {
  const refundCreatedAt = stripeTimestamp(refund.created)
  const lifecycle = refundBalanceLifecycle(refund)
  if (
    !refundCreatedAt ||
    !lifecycle ||
    !refund.id ||
    !Number.isInteger(refund.amount) ||
    refund.amount <= 0 ||
    !refund.currency
  ) {
    return null
  }

  return {
    amount_cents: refund.amount,
    balance_transaction_id: lifecycle.balanceTransactionId,
    charge_id: stripeId(refund.charge),
    currency: refund.currency.toLowerCase(),
    failure_balance_transaction_id: lifecycle.failureBalanceTransactionId,
    is_priority_fee_refund: refund.metadata?.refund_type === "priority_breach",
    refund_cash_at: lifecycle.cashAt,
    refund_created_at: refundCreatedAt,
    refund_reversed_at: lifecycle.reversedAt,
    refund_status: refund.status ?? null,
    stripe_refund_id: refund.id,
  }
}

function refundBalanceLifecycle(refund: Stripe.Refund): RefundBalanceLifecycle | null {
  const initial = expandedBalanceTransaction(refund.balance_transaction)
  const failure = expandedBalanceTransaction(refund.failure_balance_transaction ?? null)
  if (initial && !validRefundBalanceTransaction(initial, refund, "out")) return null
  if (failure && !validRefundBalanceTransaction(failure, refund, "in")) return null

  const cashAt = initial ? stripeTimestamp(initial.created) : null
  const reversedAt = failure ? stripeTimestamp(failure.created) : null
  if ((initial && !cashAt) || (failure && !reversedAt)) return null
  if (cashAt && reversedAt && Date.parse(reversedAt) < Date.parse(cashAt)) return null

  if (refund.status === "succeeded" && !cashAt) return null
  if (refund.status === "failed" && (!cashAt || !reversedAt)) return null
  if (refund.status === "canceled" && Boolean(cashAt) !== Boolean(reversedAt)) return null

  return {
    balanceTransactionId: stripeId(refund.balance_transaction),
    cashAt,
    failureBalanceTransactionId: stripeId(refund.failure_balance_transaction ?? null),
    reversedAt,
  }
}

function validRefundBalanceTransaction(
  transaction: Stripe.BalanceTransaction,
  refund: Stripe.Refund,
  direction: "in" | "out",
): boolean {
  const sourceId = stripeId(transaction.source)
  const hasExpectedDirection = direction === "out"
    ? transaction.amount === -refund.amount && (
        transaction.type === "refund" || transaction.type === "payment_refund"
      )
    : transaction.amount === refund.amount && (
        transaction.type === "refund_failure" ||
        transaction.type === "payment_refund" ||
        transaction.type === "adjustment"
      )
  return Boolean(
    transaction.id &&
    transaction.object === "balance_transaction" &&
    sourceId === refund.id &&
    transaction.currency.toLowerCase() === refund.currency.toLowerCase() &&
    hasExpectedDirection,
  )
}

function expandedBalanceTransaction(
  value: Stripe.Refund["balance_transaction"] | Stripe.Refund["failure_balance_transaction"] | null,
): Stripe.BalanceTransaction | null {
  return typeof value === "object" && value?.object === "balance_transaction"
    ? value
    : null
}

function stripeTimestamp(value: number): string | null {
  if (!Number.isInteger(value) || value <= 0) return null
  return new Date(value * 1000).toISOString()
}

function stripeId(value: { id: string } | string | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}

function modePrefix(livemode: boolean): "live" | "test" {
  return livemode ? "live" : "test"
}
