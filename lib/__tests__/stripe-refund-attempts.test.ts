import { describe, expect, it, vi } from "vitest"

import { requestStripeRefund } from "@/lib/stripe/refund-attempts"

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111"
const INTAKE_ID = "22222222-2222-4222-8222-222222222222"
const LEASE_TOKEN = "33333333-3333-4333-8333-333333333333"
const PAYMENT_INTENT_ID = "pi_refund_attempt_contract"
const STRIPE_REFUND_ID = "re_refund_attempt_contract"

const reservation = {
  attempt_id: ATTEMPT_ID,
  idempotency_key: `refund-attempt:${ATTEMPT_ID}`,
  lease_token: LEASE_TOKEN,
  requested_amount_cents: 4_000,
  reserved: true,
}

function refundHarness(options: {
  completionApplied?: boolean
  refundResponse?: Record<string, unknown>
  reservationData?: Record<string, unknown>
  stripeError?: Error
} = {}) {
  const refundCreate = options.stripeError
    ? vi.fn().mockRejectedValue(options.stripeError)
    : vi.fn().mockResolvedValue({
        amount: reservation.requested_amount_cents,
        id: STRIPE_REFUND_ID,
        metadata: {
          intake_id: INTAKE_ID,
          refund_attempt_id: ATTEMPT_ID,
          refund_type: "decline",
        },
        payment_intent: PAYMENT_INTENT_ID,
        status: "pending",
        ...options.refundResponse,
      })
  const rpc = vi.fn(async (name: string) => {
    if (name === "reserve_stripe_refund_attempt") {
      return { data: options.reservationData ?? reservation, error: null }
    }
    if (name === "complete_stripe_refund_attempt") {
      return { data: options.completionApplied ?? true, error: null }
    }
    if (name === "complete_stripe_refund_attempt_error") {
      return { data: true, error: null }
    }
    return { data: null, error: { message: `Unexpected RPC: ${name}` } }
  })
  const from = vi.fn()

  return {
    from,
    refundCreate,
    rpc,
    stripe: { refunds: { create: refundCreate } },
    supabase: { from, rpc },
  }
}

const request = {
  intakeId: INTAKE_ID,
  paymentIntentId: PAYMENT_INTENT_ID,
  refundType: "decline" as const,
  targetTotalCents: 4_995,
}

describe("durable Stripe refund attempts", () => {
  it("reserves the exact remaining amount and submits canonical Stripe parameters before CAS completion", async () => {
    const { from, refundCreate, rpc, stripe, supabase } = refundHarness()

    const result = await requestStripeRefund(
      { stripe: stripe as never, supabase: supabase as never },
      request,
    )

    expect(rpc).toHaveBeenNthCalledWith(1, "reserve_stripe_refund_attempt", {
      p_actor_profile_id: null,
      p_intake_id: INTAKE_ID,
      p_livemode: false,
      p_payment_intent_id: PAYMENT_INTENT_ID,
      p_refund_type: "decline",
      p_target_total_cents: 4_995,
    })
    expect(refundCreate).toHaveBeenCalledWith(
      {
        amount: 4_000,
        metadata: {
          intake_id: INTAKE_ID,
          refund_attempt_id: ATTEMPT_ID,
          refund_type: "decline",
        },
        payment_intent: PAYMENT_INTENT_ID,
        reason: "requested_by_customer",
      },
      { idempotencyKey: `refund-attempt:${ATTEMPT_ID}` },
    )
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_stripe_refund_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_lease_token: LEASE_TOKEN,
      p_stripe_refund_id: STRIPE_REFUND_ID,
      p_stripe_status: "pending",
    })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(
      refundCreate.mock.invocationCallOrder[0],
    )
    expect(refundCreate.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[1],
    )
    expect(result).toMatchObject({
      amountCents: 4_000,
      attemptId: ATTEMPT_ID,
      refundId: STRIPE_REFUND_ID,
      status: "submitted",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("marks only the leased attempt unknown when Stripe throws ambiguously", async () => {
    const stripeError = new Error("Connection reset after the request was written")
    const { from, refundCreate, rpc, stripe, supabase } = refundHarness({
      stripeError,
    })

    const result = await requestStripeRefund(
      { stripe: stripe as never, supabase: supabase as never },
      request,
    )

    expect(refundCreate).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "complete_stripe_refund_attempt_error",
      expect.objectContaining({
        p_attempt_id: ATTEMPT_ID,
        p_lease_token: LEASE_TOKEN,
        p_outcome: "unknown_outcome",
      }),
    )
    expect(result).toMatchObject({
      attemptId: ATTEMPT_ID,
      status: "unknown_outcome",
    })
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalledWith(
      expect.stringMatching(/reconcile_intake|update_intake|payment_status/),
      expect.anything(),
    )
  })

  it("does not bind a Stripe response whose immutable attempt identity conflicts", async () => {
    const { rpc, stripe, supabase } = refundHarness({
      refundResponse: { payment_intent: "pi_conflicting" },
    })

    const result = await requestStripeRefund(
      { stripe: stripe as never, supabase: supabase as never },
      request,
    )

    expect(result).toMatchObject({
      attemptId: ATTEMPT_ID,
      refundId: STRIPE_REFUND_ID,
      status: "unknown_outcome",
    })
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "complete_stripe_refund_attempt_error",
      expect.objectContaining({
        p_attempt_id: ATTEMPT_ID,
        p_lease_token: LEASE_TOKEN,
        p_outcome: "unknown_outcome",
      }),
    )
    expect(rpc).not.toHaveBeenCalledWith(
      "complete_stripe_refund_attempt",
      expect.anything(),
    )
  })

  it("accepts a webhook-winner submitted-completion CAS miss idempotently", async () => {
    const { from, rpc, stripe, supabase } = refundHarness({
      completionApplied: false,
    })

    const result = await requestStripeRefund(
      { stripe: stripe as never, supabase: supabase as never },
      request,
    )

    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenLastCalledWith("complete_stripe_refund_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_lease_token: LEASE_TOKEN,
      p_stripe_refund_id: STRIPE_REFUND_ID,
      p_stripe_status: "pending",
    })
    expect(result).toMatchObject({
      attemptId: ATTEMPT_ID,
      refundId: STRIPE_REFUND_ID,
      status: "submitted",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("returns an existing matching attempt without making another Stripe request", async () => {
    const { from, refundCreate, rpc, stripe, supabase } = refundHarness({
      reservationData: {
        ...reservation,
        active: true,
        matches_request: true,
        outcome: "active",
        reserved: false,
      },
    })

    const result = await requestStripeRefund(
      { stripe: stripe as never, supabase: supabase as never },
      request,
    )

    expect(result).toEqual({
      amountCents: 4_000,
      attemptId: ATTEMPT_ID,
      status: "active",
    })
    expect(refundCreate).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalled()
  })

  it("returns cash-satisfied when exact evidence already covers the target", async () => {
    const { from, refundCreate, rpc, stripe, supabase } = refundHarness({
      reservationData: {
        active: false,
        attempt_id: null,
        idempotency_key: null,
        lease_token: null,
        matches_request: true,
        outcome: "cash_satisfied",
        requested_amount_cents: 0,
        reserved: false,
      },
    })

    const result = await requestStripeRefund(
      { stripe: stripe as never, supabase: supabase as never },
      request,
    )

    expect(result).toEqual({ amountCents: 0, status: "cash_satisfied" })
    expect(refundCreate).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalled()
  })
})
