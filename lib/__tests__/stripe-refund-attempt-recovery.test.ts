import type Stripe from "stripe"
import { describe, expect, it, vi } from "vitest"

import {
  type ClaimedStripeRefundAttempt,
  recoverStripeRefundAttempt,
} from "@/lib/stripe/refund-attempt-recovery"

const NOW = Date.parse("2026-08-16T06:00:00.000Z")

function attempt(
  overrides: Partial<ClaimedStripeRefundAttempt> = {},
): ClaimedStripeRefundAttempt {
  return {
    attempt_id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-08-16T01:00:00.000Z",
    idempotency_key: "refund-attempt:11111111-1111-4111-8111-111111111111",
    intake_id: "22222222-2222-4222-8222-222222222222",
    lease_token: "33333333-3333-4333-8333-333333333333",
    livemode: true,
    payment_intent_id: "pi_recovery",
    refund_type: "decline",
    requested_amount_cents: 4_000,
    state: "unknown_outcome",
    stripe_refund_id: null,
    ...overrides,
  }
}

function refund(
  overrides: Partial<Stripe.Refund> = {},
): Stripe.Refund {
  return {
    amount: 4_000,
    balance_transaction: null,
    charge: "ch_recovery",
    created: Math.floor(NOW / 1_000),
    currency: "aud",
    id: "re_recovery",
    metadata: {
      intake_id: "22222222-2222-4222-8222-222222222222",
      refund_attempt_id: "11111111-1111-4111-8111-111111111111",
      refund_type: "decline",
    },
    object: "refund",
    payment_intent: "pi_recovery",
    reason: "requested_by_customer",
    receipt_number: null,
    source_transfer_reversal: null,
    status: "pending",
    transfer_reversal: null,
    ...overrides,
  } as Stripe.Refund
}

function harness(input?: {
  bindingApplied?: boolean
  errorCompletionApplied?: boolean
  listed?: Stripe.Refund[]
  retrieved?: Stripe.Refund
  retrieveError?: Error
}) {
  const create = vi.fn(async () => refund())
  const list = vi.fn(async () => ({
    data: input?.listed ?? [],
    has_more: false,
  }))
  const retrieve = input?.retrieveError
    ? vi.fn().mockRejectedValue(input.retrieveError)
    : vi.fn(async () => input?.retrieved ?? refund())
  const rpc = vi.fn(async (name: string) => ({
    data: name === "bind_stripe_refund_attempt_from_webhook"
      ? input?.bindingApplied ?? true
      : name === "complete_stripe_refund_attempt_error"
        ? input?.errorCompletionApplied ?? true
      : true,
    error: null,
  }))

  return {
    create,
    list,
    retrieve,
    rpc,
    stripe: { refunds: { create, list, retrieve } },
    supabase: { rpc },
  }
}

describe("recoverStripeRefundAttempt", () => {
  it("retrieves a known Stripe refund without creating another mutation", async () => {
    const known = refund({ id: "re_known" })
    const { create, list, retrieve, stripe, supabase } = harness({ retrieved: known })

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      { attempt: attempt({ stripe_refund_id: "re_known" }), nowMs: NOW },
    )

    expect(retrieve).toHaveBeenCalledWith("re_known", {
      expand: ["balance_transaction", "failure_balance_transaction"],
    })
    expect(list).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(result).toEqual({ error: null, refund: known, status: "observed" })
  })

  it.each(["succeeded", "failed", "canceled"] as const)(
    "reschedules a terminal %s attempt without regressing its money state",
    async (state) => {
      const { rpc, stripe, supabase } = harness({
        retrieveError: new Error("temporary Stripe outage"),
      })

      const result = await recoverStripeRefundAttempt(
        { stripe: stripe as never, supabase: supabase as never },
        {
          attempt: attempt({ state, stripe_refund_id: "re_terminal" }),
          nowMs: NOW,
        },
      )

      expect(result).toEqual({
        error: "Stripe refund lookup failed during durable recovery",
        refund: null,
        status: "retryable",
      })
      expect(rpc).toHaveBeenCalledWith(
        "complete_stripe_refund_attempt_error",
        {
          p_attempt_id: "11111111-1111-4111-8111-111111111111",
          p_error: "Stripe refund lookup failed during durable recovery",
          p_lease_token: "33333333-3333-4333-8333-333333333333",
          p_outcome: "unknown_outcome",
        },
      )
    },
  )

  it("quarantines a terminal attempt when Stripe says its bound refund is missing", async () => {
    const missing = Object.assign(new Error("No such refund"), {
      code: "resource_missing",
      statusCode: 404,
    })
    const { rpc, stripe, supabase } = harness({ retrieveError: missing })

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      {
        attempt: attempt({ state: "succeeded", stripe_refund_id: "re_missing" }),
        nowMs: NOW,
      },
    )

    expect(rpc).toHaveBeenCalledWith("complete_stripe_refund_attempt_error", {
      p_attempt_id: "11111111-1111-4111-8111-111111111111",
      p_error: "Stripe refund lookup failed during durable recovery",
      p_lease_token: "33333333-3333-4333-8333-333333333333",
      p_outcome: "manual_review",
    })
    expect(result).toEqual({
      error: "Stripe refund lookup failed during durable recovery",
      refund: null,
      status: "manual_review",
    })
  })

  it.each(["submitted", "succeeded"] as const)(
    "quarantines a %s attempt whose bound Stripe identity conflicts",
    async (state) => {
      const conflicting = refund({
        id: "re_conflict",
        metadata: {
          intake_id: "22222222-2222-4222-8222-222222222222",
          refund_attempt_id: "99999999-9999-4999-8999-999999999999",
          refund_type: "decline",
        },
      })
      const { rpc, stripe, supabase } = harness({ retrieved: conflicting })

      const result = await recoverStripeRefundAttempt(
        { stripe: stripe as never, supabase: supabase as never },
        {
          attempt: attempt({ state, stripe_refund_id: "re_conflict" }),
          nowMs: NOW,
        },
      )

      expect(rpc).toHaveBeenCalledWith("complete_stripe_refund_attempt_error", {
        p_attempt_id: "11111111-1111-4111-8111-111111111111",
        p_error: "Stripe refund identity conflicts with the durable refund attempt",
        p_lease_token: "33333333-3333-4333-8333-333333333333",
        p_outcome: "manual_review",
      })
      expect(result).toEqual({
        error: "Stripe refund identity conflicts with the durable refund attempt",
        refund: null,
        status: "manual_review",
      })
    },
  )

  it("binds an attempt-metadata match discovered through a bounded PaymentIntent list", async () => {
    const discovered = refund({ id: "re_discovered" })
    const { create, list, rpc, stripe, supabase } = harness({ listed: [discovered] })

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      { attempt: attempt(), nowMs: NOW },
    )

    expect(list).toHaveBeenCalledWith({
      expand: ["data.balance_transaction", "data.failure_balance_transaction"],
      limit: 100,
      payment_intent: "pi_recovery",
    })
    expect(create).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith("bind_stripe_refund_attempt_from_webhook", {
      p_amount_cents: 4_000,
      p_attempt_id: "11111111-1111-4111-8111-111111111111",
      p_intake_id: "22222222-2222-4222-8222-222222222222",
      p_livemode: true,
      p_payment_intent_id: "pi_recovery",
      p_refund_type: "decline",
      p_stripe_refund_id: "re_discovered",
      p_stripe_status: "pending",
    })
    expect(result).toEqual({ error: null, refund: discovered, status: "observed" })
  })

  it("replays the exact original request only inside the bounded idempotency window", async () => {
    const { create, rpc, stripe, supabase } = harness()

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      { attempt: attempt(), nowMs: NOW },
    )

    expect(create).toHaveBeenCalledWith({
      amount: 4_000,
      expand: ["balance_transaction", "failure_balance_transaction"],
      metadata: {
        intake_id: "22222222-2222-4222-8222-222222222222",
        refund_attempt_id: "11111111-1111-4111-8111-111111111111",
        refund_type: "decline",
      },
      payment_intent: "pi_recovery",
      reason: "requested_by_customer",
    }, { idempotencyKey: "refund-attempt:11111111-1111-4111-8111-111111111111" })
    expect(rpc).toHaveBeenCalledWith("complete_stripe_refund_attempt", {
      p_attempt_id: "11111111-1111-4111-8111-111111111111",
      p_lease_token: "33333333-3333-4333-8333-333333333333",
      p_stripe_refund_id: "re_recovery",
      p_stripe_status: "pending",
    })
    expect(result).toEqual({
      error: null,
      refund: expect.objectContaining({ id: "re_recovery" }),
      status: "resubmitted",
    })
  })

  it("does not persist a discovered refund when attempt binding is not confirmed", async () => {
    const discovered = refund({ id: "re_unbound" })
    const { stripe, supabase } = harness({
      bindingApplied: false,
      listed: [discovered],
    })

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      { attempt: attempt(), nowMs: NOW },
    )

    expect(result).toEqual({
      error: "Stripe refund attempt binding returned incomplete evidence",
      refund: discovered,
      status: "observed",
    })
  })

  it("never creates a fresh mutation after the safe idempotency window", async () => {
    const { create, rpc, stripe, supabase } = harness()

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      {
        attempt: attempt({ created_at: "2026-08-14T00:00:00.000Z" }),
        nowMs: NOW,
      },
    )

    expect(create).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith("complete_stripe_refund_attempt_error", {
      p_attempt_id: "11111111-1111-4111-8111-111111111111",
      p_error: "Stripe refund outcome remains unknown beyond the safe replay window",
      p_lease_token: "33333333-3333-4333-8333-333333333333",
      p_outcome: "manual_review",
    })
    expect(result).toEqual({
      error: "Stripe refund outcome remains unknown beyond the safe replay window",
      refund: null,
      status: "manual_review",
    })
  })

  it("does not report quarantine complete when its durable CAS misses", async () => {
    const { rpc, stripe, supabase } = harness({ errorCompletionApplied: false })

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      {
        attempt: attempt({ created_at: "2026-08-14T00:00:00.000Z" }),
        nowMs: NOW,
      },
    )

    expect(rpc).toHaveBeenCalledWith("complete_stripe_refund_attempt_error", {
      p_attempt_id: "11111111-1111-4111-8111-111111111111",
      p_error: "Stripe refund outcome remains unknown beyond the safe replay window",
      p_lease_token: "33333333-3333-4333-8333-333333333333",
      p_outcome: "manual_review",
    })
    expect(result).toEqual({
      error: "Stripe refund outcome remains unknown beyond the safe replay window; " +
        "durable attempt update returned incomplete evidence",
      refund: null,
      status: "retryable",
    })
  })

  it("fails closed when a bounded list contains conflicting attempt matches", async () => {
    const { create, rpc, stripe, supabase } = harness({
      listed: [refund({ id: "re_one" }), refund({ id: "re_two" })],
    })

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: supabase as never },
      { attempt: attempt(), nowMs: NOW },
    )

    expect(create).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith("complete_stripe_refund_attempt_error", {
      p_attempt_id: "11111111-1111-4111-8111-111111111111",
      p_error: "Multiple Stripe refunds match one durable refund attempt",
      p_lease_token: "33333333-3333-4333-8333-333333333333",
      p_outcome: "manual_review",
    })
    expect(result.error).toMatch(/multiple/i)
    expect(result.refund).toBeNull()
  })

  it("keeps transient Stripe reads retryable instead of escalating immediately", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }))
    const stripe = {
      refunds: {
        create: vi.fn(),
        list: vi.fn().mockRejectedValue(new Error("temporary Stripe outage")),
        retrieve: vi.fn(),
      },
    }

    const result = await recoverStripeRefundAttempt(
      { stripe: stripe as never, supabase: { rpc } as never },
      { attempt: attempt(), nowMs: NOW },
    )

    expect(result).toEqual({
      error: "Stripe refund list failed during durable recovery",
      refund: null,
      status: "retryable",
    })
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })
})
