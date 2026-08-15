import { describe, expect, it, vi } from "vitest"

import { PRICING } from "@/lib/constants"
import {
  type PriorityBreachIntake,
  type PriorityRefundDb,
  type PriorityRefundStripe,
  refundPriorityFeeOnBreach,
} from "@/lib/stripe/priority-fee-refund"

// Derived the same way the module does (the module keeps it unexported).
const PRIORITY_FEE_CENTS = Math.round(PRICING.PRIORITY_FEE * 100)
const TRIGGER_REWRITTEN_RESERVATION_AT = "2026-08-14T00:00:00.777Z"

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
    refund_status: "not_applicable",
    refund_stripe_id: null,
    priority_fee_refunded_at: null,
    priority_fee_refund_retry_attempted_at: null,
    stripe_payment_intent_id: "pi_123",
    payment_id: "cs_123",
    updated_at: "2026-08-14T00:00:00.000Z",
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

function makeDb(options: {
  reservationError?: { message: string } | null
  finalError?: { message: string } | null
  finalMatched?: boolean
} = {}) {
  const updates: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = []
  const db: PriorityRefundDb = {
    from: () => ({
      update: (values: Record<string, unknown>) => {
        const mutation = { values, filters: [] as Array<[string, unknown]> }
        const index = updates.push(mutation) - 1
        const chain = {
          eq: (column: string, value: unknown) => {
            mutation.filters.push([column, value])
            return chain
          },
          select: () => ({
            maybeSingle: async () => ({
              data: index === 1 && options.finalMatched === false
                ? null
                : index === 0
                  ? { id: "intake-1", updated_at: TRIGGER_REWRITTEN_RESERVATION_AT }
                  : { id: "intake-1" },
              error: index === 0
                ? options.reservationError ?? null
                : options.finalError ?? null,
            }),
          }),
          then: (
            onFulfilled?: (value: { error: { message: string } | null }) => unknown,
          ) => Promise.resolve({ error: null }).then(onFulfilled),
        }
        return chain as never
      },
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

  it("requests exactly the fee but leaves cash truth pending for the webhook", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db, updates } = makeDb()
    const result = await refundPriorityFeeOnBreach({ stripe, supabase: db }, baseIntake())

    expect(result).toEqual({ status: "pending", refundId: "re_1", amountCents: PRIORITY_FEE_CENTS })
    expect(refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_123",
        amount: PRIORITY_FEE_CENTS,
        metadata: expect.objectContaining({ refund_type: "priority_breach" }),
      }),
      { idempotencyKey: "priority_breach_intake-1" },
    )
    expect(updates).toHaveLength(2)
    expect(updates[0].filters).toContainEqual(["id", "intake-1"])
    expect(updates[0].values).toMatchObject({
      refund_status: "pending",
    })
    expect(updates[1].values).toMatchObject({
      refund_status: "pending",
      refund_stripe_id: "re_1",
    })
    expect(updates[1].values).not.toHaveProperty("payment_status")
    expect(updates[1].values).not.toHaveProperty("refund_amount_cents")
    expect(updates[1].values).not.toHaveProperty("priority_fee_refunded_at")
    expect(updates[1].values).not.toHaveProperty("refunded_at")
    expect(updates[1].filters).toContainEqual([
      "updated_at",
      TRIGGER_REWRITTEN_RESERVATION_AT,
    ])
  })

  it("does not submit another refund while exact cash evidence is pending", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db } = makeDb()

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ refund_status: "pending", refund_stripe_id: "re_pending" }),
    )

    expect(result).toEqual({ status: "skipped", reason: "refund_pending" })
    expect(refundCreate).not.toHaveBeenCalled()
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
    expect(result.status).toBe("pending")
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
    expect(updates).toHaveLength(2)
    expect(updates[0].values).toMatchObject({ refund_status: "pending" })
    expect(updates[1].values).toMatchObject({ refund_status: "failed" })
  })

  it("reports failure (for hourly retry) when the state write fails after the refund", async () => {
    const { stripe } = makeStripe()
    const { db, updates } = makeDb({ finalError: { message: "connection reset" } })
    const result = await refundPriorityFeeOnBreach({ stripe, supabase: db }, baseIntake())
    expect(result).toEqual({ status: "failed", error: "state_write_failed" })
    expect(updates).toHaveLength(2)
  })

  it("does not overwrite exact webhook state when it lands before create returns", async () => {
    const { stripe } = makeStripe({ refundResult: { id: "re_fast", amount: PRIORITY_FEE_CENTS } })
    const { db, updates } = makeDb({ finalMatched: false })

    const result = await refundPriorityFeeOnBreach({ stripe, supabase: db }, baseIntake())

    expect(result).toEqual({ status: "pending", refundId: "re_fast", amountCents: PRIORITY_FEE_CENTS })
    expect(updates[1].filters).toContainEqual(["refund_status", "pending"])
    expect(updates[1].filters.some(([column]) => column === "updated_at")).toBe(true)
  })

  it("advances the idempotency generation once after exact failed-refund evidence", async () => {
    const { stripe, refundCreate } = makeStripe({ refundResult: { id: "re_retry", amount: PRIORITY_FEE_CENTS } })
    const { db, updates } = makeDb()

    await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ refund_status: "failed", refund_stripe_id: "re_failed" }),
    )

    expect(refundCreate).toHaveBeenCalledWith(
      expect.anything(),
      { idempotencyKey: "priority_breach_intake-1_after_re_failed" },
    )
    expect(updates[0].values).toHaveProperty("priority_fee_refund_retry_attempted_at")
  })

  it("does not create an unbounded third generation after the bounded retry failed", async () => {
    const { stripe, refundCreate } = makeStripe()
    const { db } = makeDb()

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({
        refund_status: "failed",
        refund_stripe_id: "re_retry_failed",
        priority_fee_refund_retry_attempted_at: "2026-08-14T01:00:00.000Z",
      }),
    )

    expect(result).toEqual({ status: "skipped", reason: "failed_refund_retry_exhausted" })
    expect(refundCreate).not.toHaveBeenCalled()
  })
})
