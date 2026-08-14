import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  listRefunds: vi.fn(),
  retrieveBalanceTransaction: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.captureMessage }))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => mocks.logger }))
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    balanceTransactions: { retrieve: mocks.retrieveBalanceTransaction },
    refunds: { list: mocks.listRefunds },
  },
}))

import { handleRefundLifecycle } from "@/app/api/stripe/webhook/handlers/refund-lifecycle"
import { persistStripeRefundEventEvidence } from "@/lib/stripe/refund-event-persistence"

function refundEvent(
  type: "refund.created" | "refund.failed" | "refund.updated",
  overrides: Partial<Stripe.Refund> = {},
): Stripe.Event {
  return {
    created: Math.floor(Date.parse("2026-05-20T07:00:00.000Z") / 1000),
    data: {
      object: {
        amount: 995,
        balance_transaction: "txn_refund",
        charge: "ch_refund",
        created: Math.floor(Date.parse("2026-05-20T06:58:52.000Z") / 1000),
        currency: "aud",
        id: "re_refund",
        metadata: {},
        object: "refund",
        payment_intent: "pi_refund",
        reason: "requested_by_customer",
        receipt_number: null,
        source_transfer_reversal: null,
        status: "succeeded",
        transfer_reversal: null,
        ...overrides,
      } as Stripe.Refund,
    },
    id: `evt_${type.replaceAll(".", "_")}`,
    livemode: true,
    object: "event",
    pending_webhooks: 1,
    request: null,
    type,
  } as Stripe.Event
}

function createSupabaseMock(input?: {
  intakeError?: { message: string } | null
  ledgerError?: { message: string } | null
  persistedEvidenceTransform?: (row: Record<string, unknown>) => Record<string, unknown>
  reconciliationError?: { message: string } | null
}) {
  const operations: string[] = []
  const deadLetters: Record<string, unknown>[] = []
  let upsertedEvidence: Record<string, unknown>[] = []
  const upsert = vi.fn(async (rows: Record<string, unknown>[]) => {
    operations.push("ledger")
    upsertedEvidence = rows
    return { data: null, error: input?.ledgerError ?? null }
  })
  const rpc = vi.fn(async (name: string) => {
    operations.push(name === "reconcile_intake_refund_cash_state" ? "reconcile" : "claim")
    return {
      data: true,
      error: name === "reconcile_intake_refund_cash_state"
        ? input?.reconciliationError ?? null
        : null,
    }
  })
  const from = vi.fn((table: string) => {
    if (table === "stripe_refund_events") {
      const verification = {
        in: vi.fn(async () => {
          operations.push("verify")
          return {
            data: upsertedEvidence.map((row) =>
              input?.persistedEvidenceTransform?.(row) ?? row,
            ),
            error: null,
          }
        }),
      }
      return { select: vi.fn(() => verification), upsert }
    }
    if (table === "stripe_webhook_dead_letter") {
      const countQuery = {
        gte: vi.fn(() => countQuery),
        is: vi.fn(async () => ({ count: deadLetters.length })),
      }
      return {
        insert: vi.fn(async (payload: Record<string, unknown>) => {
          deadLetters.push(payload)
          return { error: null }
        }),
        select: vi.fn(() => countQuery),
      }
    }
    const chain = {
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        operations.push("intake")
        return {
          data: input?.intakeError ? null : { id: "intake-1" },
          error: input?.intakeError ?? null,
        }
      }),
      select: vi.fn(() => chain),
    }
    return chain
  })
  return { deadLetters, from, operations, rpc, supabase: { from, rpc }, upsert }
}

describe("Stripe refund lifecycle evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveBalanceTransaction.mockImplementation(async (id: string) => {
      const topup = id === "txn_topup"
      return {
        amount: topup ? -4000 : -995,
        available_on: Math.floor(Date.parse("2026-05-20T06:59:00.000Z") / 1000),
        balance_type: "payments",
        created: Math.floor(Date.parse("2026-05-20T06:59:00.000Z") / 1000),
        currency: "aud",
        description: null,
        exchange_rate: null,
        fee: 0,
        fee_details: [],
        id,
        net: topup ? -4000 : -995,
        object: "balance_transaction",
        reporting_category: "refund",
        source: topup ? "re_topup" : "re_refund",
        status: "available",
        type: "refund",
      } satisfies Stripe.BalanceTransaction
    })
  })

  it("durably inserts exact refund evidence before claiming the event", async () => {
    const { operations, rpc, supabase, upsert } = createSupabaseMock()

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.created"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.retrieveBalanceTransaction).toHaveBeenCalledWith("txn_refund")
    expect(response).toBeUndefined()
    expect(operations).toEqual(["intake", "ledger", "verify", "reconcile", "claim"])
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        amount_cents: 995,
        evidence_key: "live:event:evt_refund_created:refund:re_refund",
        intake_id: "intake-1",
        refund_created_at: "2026-05-20T06:58:52.000Z",
      }),
    ], { ignoreDuplicates: true, onConflict: "evidence_key" })
    expect(rpc).toHaveBeenCalledWith("try_process_stripe_event", expect.anything())
  })

  it("restores failed refund state from exact reversal evidence before claiming", async () => {
    const failedEvent = refundEvent("refund.failed", {
      failure_balance_transaction: "txn_failure",
      status: "failed",
    })
    mocks.retrieveBalanceTransaction.mockImplementation(async (id: string) => ({
      amount: id === "txn_failure" ? 995 : -995,
      available_on: Math.floor(Date.parse("2026-05-20T06:59:00.000Z") / 1000),
      balance_type: "payments",
      created: Math.floor(Date.parse(
        id === "txn_failure"
          ? "2026-05-25T04:05:06.000Z"
          : "2026-05-20T06:59:00.000Z",
      ) / 1000),
      currency: "aud",
      description: null,
      exchange_rate: null,
      fee: 0,
      fee_details: [],
      id,
      net: id === "txn_failure" ? 995 : -995,
      object: "balance_transaction",
      reporting_category: id === "txn_failure" ? "refund_reversal" : "refund",
      source: "re_refund",
      status: "available",
      type: id === "txn_failure" ? "refund_failure" : "refund",
    } satisfies Stripe.BalanceTransaction))
    const { operations, rpc, supabase } = createSupabaseMock()

    await handleRefundLifecycle({
      event: failedEvent,
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(operations).toEqual(["intake", "ledger", "verify", "reconcile", "claim"])
    expect(rpc).toHaveBeenCalledWith("reconcile_intake_refund_cash_state", {
      p_intake_id: "intake-1",
      p_livemode: true,
      p_trigger_status: "failed",
    })
  })

  it("leaves the event unclaimed and retryable on an evidence write failure", async () => {
    const { deadLetters, rpc, supabase } = createSupabaseMock({
      ledgerError: { message: "temporary ledger outage" },
    })

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.updated"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "REFUND_EVIDENCE_UNAVAILABLE",
      event_id: "evt_refund_updated",
      intake_id: "intake-1",
      payload: expect.objectContaining({ id: "evt_refund_updated", type: "refund.updated" }),
    }))
    expect(rpc).not.toHaveBeenCalled()
  })

  it("DLQs a reconciliation failure without claiming poisoned evidence", async () => {
    const { deadLetters, operations, rpc, supabase } = createSupabaseMock({
      reconciliationError: { message: "conflicting exact evidence" },
    })

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.updated"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(operations).toEqual(["intake", "ledger", "verify", "reconcile"])
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "REFUND_STATE_RECONCILIATION_FAILED",
      event_id: "evt_refund_updated",
      intake_id: "intake-1",
    }))
    expect(rpc).not.toHaveBeenCalledWith("try_process_stripe_event", expect.anything())
  })

  it("does not duplicate a DLQ row when an admin replay still fails", async () => {
    const { deadLetters, supabase } = createSupabaseMock({
      ledgerError: { message: "temporary ledger outage" },
    })

    const response = await handleRefundLifecycle({
      adminReplay: true,
      event: refundEvent("refund.updated"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(deadLetters).toEqual([])
  })

  it("fails closed when the same evidence identity has conflicting immutable fields", async () => {
    const { deadLetters, operations, rpc, supabase } = createSupabaseMock({
      persistedEvidenceTransform: (row) => ({ ...row, amount_cents: 996 }),
    })

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.updated"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(operations).toEqual(["intake", "ledger", "verify"])
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "REFUND_EVIDENCE_UNAVAILABLE",
      event_id: "evt_refund_updated",
    }))
    expect(rpc).not.toHaveBeenCalled()
  })

  it("does not persist unlinked evidence after a transient intake query failure", async () => {
    const { operations, rpc, supabase, upsert } = createSupabaseMock({
      intakeError: { message: "temporary intake lookup outage" },
    })

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.created"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(operations).toEqual(["intake"])
    expect(upsert).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("reads the complete bounded refund list when a charge snapshot is paginated", async () => {
    const firstRefund = refundEvent("refund.created").data.object as Stripe.Refund
    const secondRefund = {
      ...firstRefund,
      amount: 4000,
      balance_transaction: "txn_topup",
      created: firstRefund.created + 60,
      id: "re_topup",
    }
    mocks.listRefunds.mockResolvedValue({
      data: [firstRefund, secondRefund],
      has_more: false,
    })
    const chargeEvent = {
      ...refundEvent("refund.created"),
      data: {
        object: {
          amount: 4995,
          amount_refunded: 4995,
          id: "ch_refund",
          object: "charge",
          payment_intent: "pi_refund",
          refunds: {
            data: [secondRefund],
            has_more: true,
          },
        } as unknown as Stripe.Charge,
      },
      id: "evt_charge_refunded",
      type: "charge.refunded",
    } as Stripe.Event
    const { supabase, upsert } = createSupabaseMock()

    const result = await persistStripeRefundEventEvidence({
      event: chargeEvent,
      supabase: supabase as never,
    })

    expect(result.error).toBeNull()
    expect(mocks.listRefunds).toHaveBeenCalledWith({
      charge: "ch_refund",
      expand: ["data.balance_transaction", "data.failure_balance_transaction"],
      limit: 100,
    })
    expect(upsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ stripe_refund_id: "re_refund" }),
      expect.objectContaining({ stripe_refund_id: "re_topup" }),
    ]), expect.anything())
  })
})
