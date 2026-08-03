import { describe, expect, it, vi } from "vitest"

import {
  PRIORITY_FEE_CENTS,
  type PriorityBreachIntake,
  type PriorityRefundDb,
  type PriorityRefundStripe,
  refundPriorityFeeOnBreach,
} from "@/lib/stripe/priority-fee-refund"

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}))

function baseIntake(overrides: Partial<PriorityBreachIntake> = {}): PriorityBreachIntake {
  return {
    id: "intake-1",
    category: "prescription",
    is_priority: true,
    payment_status: "paid",
    amount_cents: 3990,
    refund_amount_cents: 0,
    priority_fee_refunded_at: null,
    stripe_payment_intent_id: "pi_123",
    payment_id: "cs_123",
    ...overrides,
  }
}

function makeStripe(overrides: {
  refundResult?: { id: string; amount: number | null }
  refundError?: Error
  sessionPaymentIntent?: string | { id: string } | null
  sessionError?: Error
} = {}) {
  const refundCreate = vi.fn(async () => {
    if (overrides.refundError) throw overrides.refundError
    return overrides.refundResult ?? { id: "re_1", amount: PRIORITY_FEE_CENTS }
  })
  const sessionRetrieve = vi.fn(async () => {
    if (overrides.sessionError) throw overrides.sessionError
    return { payment_intent: overrides.sessionPaymentIntent ?? "pi_from_session" }
  })
  const stripe: PriorityRefundStripe = {
    refunds: { create: refundCreate as unknown as PriorityRefundStripe["refunds"]["create"] },
    checkout: {
      sessions: {
        retrieve: sessionRetrieve as unknown as PriorityRefundStripe["checkout"]["sessions"]["retrieve"],
      },
    },
  }
  return { stripe, refundCreate, sessionRetrieve }
}

function makeDb(updateError: { message: string } | null = null) {
  const updates: Array<{ values: Record<string, unknown>; id: string }> = []
  const db: PriorityRefundDb = {
    from: () => ({
      update: (values: Record<string, unknown>) => ({
        eq: (_column: "id", id: string) => {
          updates.push({ values, id })
          return Promise.resolve({ error: updateError })
        },
      }),
    }),
  }
  return { db, updates }
}

describe("refundPriorityFeeOnBreach", () => {
  it("skips non-priority intakes", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db } = makeDb()
    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ is_priority: false }),
    )
    expect(result).toEqual({ status: "skipped", reason: "not_priority" })
    expect(refundCreate).not.toHaveBeenCalled()
  })

  it("skips when the fee was already refunded (once-only stamp)", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db } = makeDb()
    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ priority_fee_refunded_at: "2026-08-03T00:00:00.000Z" }),
    )
    expect(result).toEqual({ status: "skipped", reason: "already_refunded" })
    expect(refundCreate).not.toHaveBeenCalled()
  })

  it.each(["partially_refunded", "refunded", "failed", "unpaid"])(
    "never stacks on payment_status=%s",
    async (paymentStatus) => {
      const { stripe, refundCreate } = makeStripe()
      const { db } = makeDb()
      const result = await refundPriorityFeeOnBreach(
        { stripe, supabase: db },
        baseIntake({ payment_status: paymentStatus }),
      )
      expect(result.status).toBe("skipped")
      expect(refundCreate).not.toHaveBeenCalled()
    },
  )

  it("skips when prior refund cents exist even if payment_status reads paid", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db } = makeDb()
    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ refund_amount_cents: 500 }),
    )
    expect(result).toEqual({ status: "skipped", reason: "existing_refund_amount" })
    expect(refundCreate).not.toHaveBeenCalled()
  })

  it("skips when the charge is not strictly larger than the fee", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db } = makeDb()
    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ amount_cents: PRIORITY_FEE_CENTS }),
    )
    expect(result).toEqual({ status: "skipped", reason: "amount_too_small" })
    expect(refundCreate).not.toHaveBeenCalled()
  })

  it("refunds exactly the fee with a fixed idempotency key and stamps the intake", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db, updates } = makeDb()
    const result = await refundPriorityFeeOnBreach({ stripe, supabase: db }, baseIntake())

    expect(result).toEqual({ status: "refunded", refundId: "re_1", amountCents: PRIORITY_FEE_CENTS })
    expect(refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_123",
        amount: PRIORITY_FEE_CENTS,
        metadata: expect.objectContaining({ refund_type: "priority_breach" }),
      }),
      { idempotencyKey: "priority_breach_intake-1" },
    )
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe("intake-1")
    expect(updates[0].values).toMatchObject({
      payment_status: "partially_refunded",
      refund_status: "succeeded",
      refund_stripe_id: "re_1",
      refund_amount_cents: PRIORITY_FEE_CENTS,
    })
    expect(updates[0].values.priority_fee_refunded_at).toBeTruthy()
    expect(updates[0].values.refunded_at).toBeTruthy()
  })

  it("resolves the payment intent from the checkout session when missing", async () => {
    const { stripe, sessionRetrieve, refundCreate } = makeStripe({
      sessionPaymentIntent: { id: "pi_resolved" },
    })
    const { db } = makeDb()
    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ stripe_payment_intent_id: null }),
    )
    expect(sessionRetrieve).toHaveBeenCalledWith("cs_123")
    expect(refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_resolved" }),
      expect.anything(),
    )
    expect(result.status).toBe("refunded")
  })

  it("fails without touching state when no payment intent can be resolved", async () => {
    const { stripe, refundCreate } = makeStripe({ sessionError: new Error("boom") })
    const { db, updates } = makeDb()
    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ stripe_payment_intent_id: null }),
    )
    expect(result).toEqual({ status: "failed", error: "no_payment_intent" })
    expect(refundCreate).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it("fails without touching state when Stripe rejects the refund", async () => {
    const { stripe } = makeStripe({ refundError: new Error("card_declined") })
    const { db, updates } = makeDb()
    const result = await refundPriorityFeeOnBreach({ stripe, supabase: db }, baseIntake())
    expect(result).toEqual({ status: "failed", error: "card_declined" })
    expect(updates).toHaveLength(0)
  })

  it("reports failure (for hourly retry) when the state write fails after the refund", async () => {
    const { stripe } = makeStripe()
    const { db, updates } = makeDb({ message: "connection reset" })
    const result = await refundPriorityFeeOnBreach({ stripe, supabase: db }, baseIntake())
    expect(result).toEqual({ status: "failed", error: "state_write_failed" })
    expect(updates).toHaveLength(1)
  })
})
