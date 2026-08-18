import type Stripe from "stripe"
import { describe, expect, it, vi } from "vitest"

import { PRICING } from "@/lib/constants"
import {
  type PriorityBreachIntake,
  type PriorityRefundDb,
  type PriorityRefundStripe,
  refundPriorityFeeOnBreach,
} from "@/lib/stripe/priority-fee-refund"

const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333"
const LEASE_TOKEN = "44444444-4444-4444-8444-444444444444"
const PRIORITY_FEE_CENTS = Math.round(PRICING.PRIORITY_FEE * 100)

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

function baseIntake(overrides: Partial<PriorityBreachIntake> = {}): PriorityBreachIntake {
  return {
    amount_cents: 3_990,
    category: "prescription",
    id: "intake-1",
    is_priority: true,
    payment_id: "cs_123",
    payment_status: "paid",
    priority_fee_refunded_at: null,
    refund_amount_cents: 0,
    refund_status: "not_applicable",
    refund_stripe_id: null,
    stripe_payment_intent_id: "pi_123",
    updated_at: "2026-08-14T00:00:00.000Z",
    ...overrides,
  }
}

function refundHarness(options: {
  refundError?: Error
  reservationError?: { message: string } | null
  sessionError?: Error
  sessionPaymentIntent?: string | { id: string } | null
} = {}) {
  const refundCreate = options.refundError
    ? vi.fn().mockRejectedValue(options.refundError)
    : vi.fn(async (params: Stripe.RefundCreateParams) => ({
        amount: params.amount ?? 0,
        id: "re_priority",
        metadata: params.metadata ?? {},
        payment_intent: params.payment_intent ?? null,
        status: "pending",
      }))
  const sessionRetrieve = options.sessionError
    ? vi.fn().mockRejectedValue(options.sessionError)
    : vi.fn().mockResolvedValue({
        payment_intent: options.sessionPaymentIntent ?? "pi_from_session",
      })
  const rpc = vi.fn(async (name: string): Promise<{
    data: boolean | Record<string, unknown> | null
    error: { message: string } | null
  }> => {
    if (name === "reserve_stripe_refund_attempt") {
      return {
        data: options.reservationError
          ? null
          : {
              attempt_id: ATTEMPT_ID,
              idempotency_key: `refund-attempt:${ATTEMPT_ID}`,
              lease_token: LEASE_TOKEN,
              requested_amount_cents: PRIORITY_FEE_CENTS,
              reserved: true,
            },
        error: options.reservationError ?? null,
      }
    }
    if (name === "complete_stripe_refund_attempt") {
      return { data: true, error: null }
    }
    if (name === "complete_stripe_refund_attempt_error") {
      return { data: true, error: null }
    }
    return { data: null, error: { message: `Unexpected RPC: ${name}` } }
  })
  const from = vi.fn()
  const stripe: PriorityRefundStripe = {
    checkout: {
      sessions: {
        retrieve: sessionRetrieve as unknown as PriorityRefundStripe["checkout"]["sessions"]["retrieve"],
      },
    },
    refunds: {
      create: refundCreate as unknown as PriorityRefundStripe["refunds"]["create"],
    },
  }
  const db = { from, rpc } as unknown as PriorityRefundDb

  return { db, from, refundCreate, rpc, sessionRetrieve, stripe }
}

describe("refundPriorityFeeOnBreach", () => {
  it.each([
    {
      expected: { reason: "not_priority", status: "skipped" },
      label: "non-priority intake",
      overrides: { is_priority: false },
    },
    {
      expected: { reason: "already_refunded", status: "skipped" },
      label: "cash-confirmed priority refund",
      overrides: { priority_fee_refunded_at: "2026-08-03T00:00:00.000Z" },
    },
    {
      expected: { reason: "refund_pending", status: "skipped" },
      label: "pending refund attempt",
      overrides: { refund_status: "pending", refund_stripe_id: null },
    },
    {
      expected: { reason: "existing_refund_amount", status: "skipped" },
      label: "existing refund cash",
      overrides: { refund_amount_cents: 500 },
    },
    {
      expected: { reason: "amount_too_small", status: "skipped" },
      label: "charge no larger than the fee",
      overrides: { amount_cents: PRIORITY_FEE_CENTS },
    },
  ])("gates $label before reserving money", async ({ expected, overrides }) => {
    const { db, from, refundCreate, rpc, stripe } = refundHarness()

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake(overrides),
    )

    expect(result).toEqual(expected)
    expect(rpc).not.toHaveBeenCalled()
    expect(refundCreate).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it.each(["partially_refunded", "refunded", "failed", "unpaid"])(
    "never stacks on payment_status=%s",
    async (paymentStatus) => {
      const { db, from, refundCreate, rpc, stripe } = refundHarness()

      const result = await refundPriorityFeeOnBreach(
        { stripe, supabase: db },
        baseIntake({ payment_status: paymentStatus }),
      )

      expect(result).toEqual({
        reason: `payment_status_${paymentStatus}`,
        status: "skipped",
      })
      expect(rpc).not.toHaveBeenCalled()
      expect(refundCreate).not.toHaveBeenCalled()
      expect(from).not.toHaveBeenCalled()
    },
  )

  it("routes the exact priority fee through the durable attempt lifecycle", async () => {
    const { db, from, refundCreate, rpc, stripe } = refundHarness()

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake(),
    )

    expect(rpc).toHaveBeenNthCalledWith(1, "reserve_stripe_refund_attempt", {
      p_actor_profile_id: null,
      p_intake_id: "intake-1",
      p_livemode: false,
      p_payment_intent_id: "pi_123",
      p_refund_type: "priority_breach",
      p_target_total_cents: PRIORITY_FEE_CENTS,
    })
    expect(refundCreate).toHaveBeenCalledWith(
      {
        amount: PRIORITY_FEE_CENTS,
        metadata: {
          intake_id: "intake-1",
          refund_attempt_id: ATTEMPT_ID,
          refund_type: "priority_breach",
        },
        payment_intent: "pi_123",
        reason: "requested_by_customer",
      },
      { idempotencyKey: `refund-attempt:${ATTEMPT_ID}` },
    )
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_stripe_refund_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_lease_token: LEASE_TOKEN,
      p_stripe_refund_id: "re_priority",
      p_stripe_status: "pending",
    })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(
      refundCreate.mock.invocationCallOrder[0],
    )
    expect(refundCreate.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[1],
    )
    expect(result).toEqual({
      amountCents: PRIORITY_FEE_CENTS,
      attemptId: ATTEMPT_ID,
      refundId: "re_priority",
      status: "pending",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("resolves a missing PaymentIntent from the Checkout Session", async () => {
    const { db, from, refundCreate, rpc, sessionRetrieve, stripe } = refundHarness({
      sessionPaymentIntent: { id: "pi_resolved" },
    })

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ stripe_payment_intent_id: null }),
    )

    expect(sessionRetrieve).toHaveBeenCalledWith("cs_123")
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "reserve_stripe_refund_attempt",
      expect.objectContaining({ p_payment_intent_id: "pi_resolved" }),
    )
    expect(refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_resolved" }),
      expect.anything(),
    )
    expect(result.status).toBe("pending")
    expect(from).not.toHaveBeenCalled()
  })

  it("keeps an ambiguous Stripe outcome pending and durably recoverable", async () => {
    const { db, from, rpc, stripe } = refundHarness({
      refundError: new Error("Connection reset after Stripe accepted the request"),
    })

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake(),
    )

    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "complete_stripe_refund_attempt_error",
      {
        p_attempt_id: ATTEMPT_ID,
        p_error: "stripe_refund_create_threw",
        p_lease_token: LEASE_TOKEN,
        p_outcome: "unknown_outcome",
      },
    )
    expect(result).toEqual({
      amountCents: PRIORITY_FEE_CENTS,
      attemptId: ATTEMPT_ID,
      status: "pending",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("treats an existing active attempt as pending without another Stripe request", async () => {
    const { db, from, refundCreate, rpc, stripe } = refundHarness()
    rpc.mockResolvedValueOnce({
      data: {
        active: true,
        attempt_id: ATTEMPT_ID,
        idempotency_key: `refund-attempt:${ATTEMPT_ID}`,
        lease_token: null as string | null,
        matches_request: true,
        outcome: "active",
        requested_amount_cents: PRIORITY_FEE_CENTS,
        reserved: false,
      },
      error: null,
    })

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake(),
    )

    expect(result).toEqual({ reason: "refund_pending", status: "skipped" })
    expect(refundCreate).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it("fails before reservation when no PaymentIntent can be resolved", async () => {
    const { db, from, refundCreate, rpc, stripe } = refundHarness({
      sessionError: new Error("Checkout Session unavailable"),
    })

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake({ stripe_payment_intent_id: null }),
    )

    expect(result).toEqual({ error: "no_payment_intent", status: "failed" })
    expect(rpc).not.toHaveBeenCalled()
    expect(refundCreate).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it("surfaces a durable-attempt reservation failure without moving money", async () => {
    const { db, from, refundCreate, stripe } = refundHarness({
      reservationError: { message: "refund attempt lease unavailable" },
    })

    const result = await refundPriorityFeeOnBreach(
      { stripe, supabase: db },
      baseIntake(),
    )

    expect(result).toEqual({
      error: "refund_attempt_reservation_failed",
      status: "failed",
    })
    expect(refundCreate).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })
})
