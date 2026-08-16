import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StripeRefundEvidenceRow } from "@/lib/stripe/refund-event-ledger"
import { finalizeRefundNotifications } from "@/lib/stripe/refund-notification-finalizer"

const mocks = vi.hoisted(() => ({
  reserveRefundEmail: vi.fn(),
}))

vi.mock("@/lib/email/template-sender", () => ({
  reserveRefundEmail: mocks.reserveRefundEmail,
}))

type DatabaseRow = Record<string, unknown>

function createSupabaseMock(input?: {
  cancellationError?: { message: string } | null
  intakes?: DatabaseRow[]
  profiles?: DatabaseRow[]
}) {
  const rows: Record<string, DatabaseRow[]> = {
    intakes: input?.intakes ?? [{
      id: "intake-1",
      patient_id: "patient-1",
      status: "approved",
    }],
    profiles: input?.profiles ?? [{
      email: "patient@example.test",
      full_name: "patient example",
      id: "patient-1",
    }],
  }
  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>()
    const query: Record<string, unknown> = {}
    const result = (single: boolean) => {
      const matching = (rows[table] ?? []).filter((row) =>
        [...filters].every(([column, value]) => row[column] === value),
      )
      return {
        data: single ? matching[0] ?? null : matching,
        error: null,
      }
    }

    query.eq = vi.fn((column: string, value: unknown) => {
      filters.set(column, value)
      return query
    })
    query.limit = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => result(true))
    query.select = vi.fn(() => query)
    query.single = vi.fn(async () => result(true))
    query.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result(false)).then(onFulfilled, onRejected)

    return query
  })
  const rpc = vi.fn(async () => ({
    data: 1,
    error: input?.cancellationError ?? null,
  }))

  return { from, rpc, supabase: { from, rpc } }
}

function evidence(
  overrides: Partial<StripeRefundEvidenceRow> = {},
): StripeRefundEvidenceRow {
  const row: StripeRefundEvidenceRow = {
    amount_cents: 995,
    balance_transaction_id: null,
    charge_id: "ch_refund",
    currency: "aud",
    evidence_key: "live:event:evt_refund:refund:re_refund",
    evidence_source: "refund.created",
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
  if (row.refund_cash_at && overrides.balance_transaction_id === undefined) {
    row.balance_transaction_id = `txn_${row.stripe_refund_id}`
  }
  if (row.refund_reversed_at && overrides.failure_balance_transaction_id === undefined) {
    row.failure_balance_transaction_id = `txn_failure_${row.stripe_refund_id}`
  }
  return row
}

describe("finalizeRefundNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.reserveRefundEmail.mockResolvedValue({
      emailId: "outbox-refund",
      success: true,
    })
  })

  it("does not notify while exact refund cash is still pending", async () => {
    const { from, rpc, supabase } = createSupabaseMock()

    const result = await finalizeRefundNotifications({
      evidence: [evidence()],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(mocks.reserveRefundEmail).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("reserves one exact notification for succeeded cash despite duplicate observations", async () => {
    const { supabase } = createSupabaseMock()
    const cashAt = "2026-08-16T01:02:00.000Z"

    const result = await finalizeRefundNotifications({
      evidence: [
        evidence({ refund_cash_at: cashAt, refund_status: "succeeded" }),
        evidence({
          evidence_key: "live:event:evt_updated:refund:re_refund",
          evidence_source: "refund.updated",
          refund_cash_at: cashAt,
          refund_status: "succeeded",
          stripe_event_id: "evt_updated",
        }),
      ],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(mocks.reserveRefundEmail).toHaveBeenCalledOnce()
    expect(mocks.reserveRefundEmail).toHaveBeenCalledWith({
      amountCents: 995,
      intakeId: "intake-1",
      livemode: true,
      patientId: "patient-1",
      patientName: "Patient",
      refundReason: "Refund processed",
      stripeRefundId: "re_refund",
      to: "patient@example.test",
    })
  })

  it("finalizes a succeeded refund.updated event without a charge.refunded event", async () => {
    const { supabase } = createSupabaseMock()

    const result = await finalizeRefundNotifications({
      evidence: [evidence({
        evidence_source: "refund.updated",
        refund_cash_at: "2026-08-16T01:03:00.000Z",
        refund_status: "succeeded",
      })],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(mocks.reserveRefundEmail).toHaveBeenCalledWith(expect.objectContaining({
      amountCents: 995,
      stripeRefundId: "re_refund",
    }))
  })

  it("reserves each settled refund once with its exact amount and a truthful reason", async () => {
    const { from, supabase } = createSupabaseMock()
    const first = evidence({
      amount_cents: 995,
      refund_cash_at: "2026-08-16T01:04:00.000Z",
      refund_status: "succeeded",
      stripe_refund_id: "re_first",
    })
    const topup = evidence({
      amount_cents: 4000,
      evidence_key: "live:event:evt_topup:refund:re_topup",
      refund_cash_at: "2026-08-16T01:05:00.000Z",
      refund_status: "succeeded",
      stripe_event_id: "evt_topup",
      stripe_refund_id: "re_topup",
    })

    const result = await finalizeRefundNotifications({
      evidence: [first, { ...first, evidence_source: "refund.updated" }, topup],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(mocks.reserveRefundEmail).toHaveBeenCalledTimes(2)
    expect(mocks.reserveRefundEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({
      amountCents: 995,
      refundReason: "Refund processed",
      stripeRefundId: "re_first",
    }))
    expect(mocks.reserveRefundEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({
      amountCents: 4000,
      refundReason: "Refund processed",
      stripeRefundId: "re_topup",
    }))
    expect(from.mock.calls.filter(([table]) => table === "intakes")).toHaveLength(1)
    expect(from.mock.calls.filter(([table]) => table === "profiles")).toHaveLength(1)
  })

  it("uses the priority-fee reason only for priority-fee evidence", async () => {
    const { supabase } = createSupabaseMock()

    const result = await finalizeRefundNotifications({
      evidence: [evidence({
        is_priority_fee_refund: true,
        refund_cash_at: "2026-08-16T01:06:00.000Z",
        refund_status: "succeeded",
      })],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(mocks.reserveRefundEmail).toHaveBeenCalledWith(expect.objectContaining({
      refundReason: "Priority review fee refunded",
    }))
  })

  it("cancels the exact notification when settled cash is reversed", async () => {
    const { rpc, supabase } = createSupabaseMock()

    const result = await finalizeRefundNotifications({
      evidence: [evidence({
        refund_cash_at: "2026-08-16T01:07:00.000Z",
        refund_reversed_at: "2026-08-16T01:08:00.000Z",
        refund_status: "failed",
      })],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: null })
    expect(rpc).toHaveBeenCalledWith("cancel_stripe_refund_notifications", {
      p_intake_id: "intake-1",
      p_refund_ids: ["re_refund"],
    })
    expect(mocks.reserveRefundEmail).not.toHaveBeenCalled()
  })

  it("keeps the event retryable when the exact recipient is missing", async () => {
    const { supabase } = createSupabaseMock({
      intakes: [{ id: "intake-1", patient_id: null, status: "approved" }],
    })

    const result = await finalizeRefundNotifications({
      evidence: [evidence({
        refund_cash_at: "2026-08-16T01:09:00.000Z",
        refund_status: "succeeded",
      })],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/recipient|patient/i)
    expect(mocks.reserveRefundEmail).not.toHaveBeenCalled()
  })

  it("keeps the event retryable when durable email reservation fails", async () => {
    mocks.reserveRefundEmail.mockResolvedValue({
      error: "outbox unavailable",
      success: false,
    })
    const { supabase } = createSupabaseMock()

    const result = await finalizeRefundNotifications({
      evidence: [evidence({
        refund_cash_at: "2026-08-16T01:10:00.000Z",
        refund_status: "succeeded",
      })],
      intakeId: "intake-1",
      livemode: true,
      supabase: supabase as never,
    })

    expect(result).toEqual({ error: "outbox unavailable" })
  })
})
