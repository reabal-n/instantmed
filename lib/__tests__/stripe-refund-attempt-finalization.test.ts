import type Stripe from "stripe"
import { describe, expect, it, vi } from "vitest"

import type { StripeRefundEvidenceRow } from "@/lib/stripe/refund-event-ledger"
import { finalizePersistedStripeRefundAttempts } from "@/lib/stripe/refund-event-persistence"

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111"
const SECOND_ATTEMPT_ID = "22222222-2222-4222-8222-222222222222"

function refund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    amount: 995,
    balance_transaction: null,
    charge: "ch_refund",
    created: Math.floor(Date.parse("2026-08-16T01:00:00.000Z") / 1_000),
    currency: "aud",
    id: "re_refund",
    metadata: { refund_attempt_id: ATTEMPT_ID },
    object: "refund",
    payment_intent: "pi_refund",
    reason: "requested_by_customer",
    receipt_number: null,
    source_transfer_reversal: null,
    status: "pending",
    transfer_reversal: null,
    ...overrides,
  } as Stripe.Refund
}

function evidence(
  overrides: Partial<StripeRefundEvidenceRow> = {},
): StripeRefundEvidenceRow {
  return {
    amount_cents: 995,
    balance_transaction_id: null,
    charge_id: "ch_refund",
    currency: "aud",
    evidence_key: "live:event:evt_refund:refund:re_refund",
    evidence_source: "refund.updated",
    failure_balance_transaction_id: null,
    intake_id: "intake-1",
    is_priority_fee_refund: false,
    livemode: true,
    payment_intent_id: "pi_refund",
    refund_cash_at: null,
    refund_created_at: "2026-08-16T01:00:00.000Z",
    refund_reversed_at: null,
    refund_status: "pending",
    stripe_event_created_at: "2026-08-16T01:00:01.000Z",
    stripe_event_id: "evt_refund",
    stripe_refund_id: "re_refund",
    ...overrides,
  }
}

function supabaseResult(input: {
  data: boolean
  error?: { message: string } | null
}) {
  const rpc = vi.fn(async () => ({
    data: input.data,
    error: input.error ?? null,
  }))
  return { rpc, supabase: { rpc } }
}

describe("finalizePersistedStripeRefundAttempts", () => {
  it("does not let prior global terminal state finalize a current pending observation", async () => {
    // The RPC would return true if called against an older terminal lifecycle.
    // Current invocation-local evidence is pending, so it must not be called.
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence()],
      livemode: true,
      refunds: [refund()],
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("finalizes terminal exact evidence with immutable attempt identity", async () => {
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence({
        balance_transaction_id: "txn_refund",
        refund_cash_at: "2026-08-16T01:02:00.000Z",
        refund_status: "succeeded",
      })],
      livemode: true,
      refunds: [refund({ status: "succeeded" })],
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(rpc).toHaveBeenCalledWith("finalize_stripe_refund_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_expected_outcome: "succeeded",
      p_expected_refund_cash_at: "2026-08-16T01:02:00.000Z",
      p_expected_refund_reversed_at: null,
      p_livemode: true,
      p_stripe_refund_id: "re_refund",
    })
  })

  it("retries stale success evidence when the current lifecycle advanced to reversal", async () => {
    const { supabase } = supabaseResult({ data: false })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence({
        balance_transaction_id: "txn_refund",
        refund_cash_at: "2026-08-16T01:02:00.000Z",
        refund_status: "succeeded",
      })],
      livemode: true,
      refunds: [refund({ status: "succeeded" })],
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/terminal evidence/i)
    expect(supabase.rpc).toHaveBeenCalledWith("finalize_stripe_refund_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_expected_outcome: "succeeded",
      p_expected_refund_cash_at: "2026-08-16T01:02:00.000Z",
      p_expected_refund_reversed_at: null,
      p_livemode: true,
      p_stripe_refund_id: "re_refund",
    })
  })

  it("passes the exact reversal outcome and timestamps to the semantic CAS", async () => {
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence({
        balance_transaction_id: "txn_refund",
        failure_balance_transaction_id: "txn_reversal",
        refund_cash_at: "2026-08-16T01:02:00.000Z",
        refund_reversed_at: "2026-08-16T01:04:00.000Z",
        refund_status: "failed",
      })],
      livemode: true,
      refunds: [refund({ status: "failed" })],
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(rpc).toHaveBeenCalledWith("finalize_stripe_refund_attempt", {
      p_attempt_id: ATTEMPT_ID,
      p_expected_outcome: "failed",
      p_expected_refund_cash_at: "2026-08-16T01:02:00.000Z",
      p_expected_refund_reversed_at: "2026-08-16T01:04:00.000Z",
      p_livemode: true,
      p_stripe_refund_id: "re_refund",
    })
  })

  it("evaluates false per exact refund in a mixed pending and terminal batch", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
    const pending = refund({ id: "re_pending" })
    const terminal = refund({
      id: "re_terminal",
      metadata: { refund_attempt_id: SECOND_ATTEMPT_ID },
      status: "succeeded",
    })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [
        evidence({
          evidence_key: "live:event:evt_refund:refund:re_terminal",
          balance_transaction_id: "txn_terminal",
          refund_cash_at: "2026-08-16T01:02:00.000Z",
          refund_status: "succeeded",
          stripe_refund_id: "re_terminal",
        }),
        evidence({
          evidence_key: "live:event:evt_refund:refund:re_pending",
          stripe_refund_id: "re_pending",
        }),
      ],
      livemode: true,
      refunds: [pending, terminal],
      supabase: { rpc } as never,
    })

    expect(result.error).toMatch(/terminal evidence/i)
    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith("finalize_stripe_refund_attempt", {
      p_attempt_id: SECOND_ATTEMPT_ID,
      p_expected_outcome: "succeeded",
      p_expected_refund_cash_at: "2026-08-16T01:02:00.000Z",
      p_expected_refund_reversed_at: null,
      p_livemode: true,
      p_stripe_refund_id: "re_terminal",
    })
  })

  it("keeps finalization errors retryable", async () => {
    const { supabase } = supabaseResult({
      data: false,
      error: { message: "attempt ledger unavailable" },
    })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence({
        balance_transaction_id: "txn_refund",
        refund_cash_at: "2026-08-16T01:02:00.000Z",
        refund_status: "succeeded",
      })],
      livemode: true,
      refunds: [refund({ status: "succeeded" })],
      supabase: supabase as never,
    })

    expect(result.error).toBe(
      "Stripe refund attempt finalization failed: attempt ledger unavailable",
    )
  })

  it("skips legacy refunds without attempt metadata", async () => {
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence()],
      livemode: true,
      refunds: [refund({ metadata: {} })],
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("rejects malformed attempt metadata before calling the RPC", async () => {
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [evidence()],
      livemode: true,
      refunds: [refund({ metadata: { refund_attempt_id: "not-a-uuid" } })],
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/metadata is invalid/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("validates the whole batch before finalizing any earlier refund", async () => {
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [
        evidence({
          balance_transaction_id: "txn_refund",
          refund_cash_at: "2026-08-16T01:02:00.000Z",
          refund_status: "succeeded",
        }),
        evidence({
          evidence_key: "live:event:evt_refund:refund:re_invalid",
          refund_cash_at: "2026-08-16T01:03:00.000Z",
          refund_status: "succeeded",
          stripe_refund_id: "re_invalid",
        }),
      ],
      livemode: true,
      refunds: [
        refund({ status: "succeeded" }),
        refund({
          id: "re_invalid",
          metadata: { refund_attempt_id: "not-a-uuid" },
          status: "succeeded",
        }),
      ],
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/metadata is invalid/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("rejects one attempt id mapped to two refunds before any RPC", async () => {
    const { rpc, supabase } = supabaseResult({ data: true })

    const result = await finalizePersistedStripeRefundAttempts({
      evidence: [
        evidence({
          balance_transaction_id: "txn_refund",
          refund_cash_at: "2026-08-16T01:02:00.000Z",
          refund_status: "succeeded",
        }),
        evidence({
          evidence_key: "live:event:evt_refund:refund:re_second",
          refund_cash_at: "2026-08-16T01:03:00.000Z",
          refund_status: "succeeded",
          stripe_refund_id: "re_second",
        }),
      ],
      livemode: true,
      refunds: [
        refund({ status: "succeeded" }),
        refund({ id: "re_second", status: "succeeded" }),
      ],
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/conflicts across refunds/i)
    expect(rpc).not.toHaveBeenCalled()
  })
})
