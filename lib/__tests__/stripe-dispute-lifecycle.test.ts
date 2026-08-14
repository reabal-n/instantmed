import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  captureMessage: vi.fn(),
  retrieveCharge: vi.fn(),
  runGoogleAdsConversionAdjustment: vi.fn(),
  sendDisputeAlertEmail: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server")
  return { ...actual, after: mocks.after }
})

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/analytics/google-ads-conversion-adjustments", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/analytics/google-ads-conversion-adjustments")
  >("@/lib/analytics/google-ads-conversion-adjustments")
  return {
    ...actual,
    runGoogleAdsConversionAdjustment: mocks.runGoogleAdsConversionAdjustment,
  }
})

vi.mock("@/lib/email/template-sender", () => ({
  sendDisputeAlertEmail: mocks.sendDisputeAlertEmail,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    charges: { retrieve: mocks.retrieveCharge },
  },
}))

import { handleChargeDisputeCreated } from "@/app/api/stripe/webhook/handlers/charge-dispute-created"
import { handleChargeDisputeLifecycle } from "@/app/api/stripe/webhook/handlers/charge-dispute-lifecycle"

type TableMutation = {
  payload: Record<string, unknown>
  table: string
  type: "update" | "upsert"
}

function createSupabaseMock(input?: {
  cashResult?: { data: Record<string, unknown> | null; error: { message: string } | null }
  disputeRow?: Record<string, unknown> | null
  intakeLookupError?: { message: string } | null
  intakeRow?: Record<string, unknown> | null
  upsertError?: { message: string } | null
}) {
  const mutations: TableMutation[] = []
  const rpc = vi.fn(async (name: string) => {
    if (name === "try_process_stripe_event") return { data: true, error: null }
    if (name === "record_stripe_dispute_cash_event") {
      return input?.cashResult ?? { data: { applied: true }, error: null }
    }
    return { data: null, error: null }
  })

  const from = vi.fn((table: string) => {
    let mutationResult = { data: [] as Record<string, unknown>[], error: null as { message: string } | null }
    const chain = {
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (table === "intakes") {
          return {
            data: input?.intakeRow ?? null,
            error: input?.intakeLookupError ?? null,
          }
        }
        if (table === "stripe_disputes") return { data: input?.disputeRow ?? null, error: null }
        return { data: null, error: null }
      }),
      not: vi.fn(() => chain),
      or: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(async () => {
        if (table === "intakes") {
          return {
            data: input?.intakeRow ?? null,
            error: input?.intakeLookupError ?? null,
          }
        }
        if (table === "stripe_disputes") return { data: input?.disputeRow ?? null, error: null }
        return { data: null, error: null }
      }),
      then: (resolve: (value: typeof mutationResult) => unknown) =>
        Promise.resolve(mutationResult).then(resolve),
      update: vi.fn((payload: Record<string, unknown>) => {
        mutations.push({ payload, table, type: "update" })
        mutationResult = { data: [{ id: "updated" }], error: null }
        return chain
      }),
      upsert: vi.fn((payload: Record<string, unknown>) => {
        mutations.push({ payload, table, type: "upsert" })
        mutationResult = {
          data: [],
          error: table === "stripe_disputes" ? input?.upsertError ?? null : null,
        }
        return chain
      }),
    }
    return chain
  })

  return { mutations, rpc, supabase: { from, rpc } }
}

function disputeEvent(
  type: Stripe.Event.Type,
  overrides: Partial<Stripe.Dispute> = {},
): Stripe.Event {
  return {
    created: Math.floor(Date.parse("2026-06-18T01:30:00.000Z") / 1000),
    data: {
      object: {
        amount: 4995,
        balance_transactions: [],
        charge: "ch_dispute",
        created: Math.floor(Date.parse("2026-06-17T01:30:00.000Z") / 1000),
        currency: "aud",
        evidence_details: { due_by: null },
        id: "dp_test",
        payment_intent: "pi_dispute",
        reason: "fraudulent",
        status: "needs_response",
        ...overrides,
      } as Stripe.Dispute,
    },
    id: `evt_${type.replaceAll(".", "_")}`,
    livemode: false,
    object: "event",
    pending_webhooks: 1,
    request: null,
    type,
  } as Stripe.Event
}

describe("Stripe dispute lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveCharge.mockResolvedValue({ payment_intent: "pi_dispute" })
    mocks.sendDisputeAlertEmail.mockResolvedValue({ success: true })
  })

  it("records a created dispute without treating the dispute notice as a cash loss", async () => {
    const { mutations, supabase } = createSupabaseMock({
      intakeRow: {
        amount_cents: 4995,
        id: "intake-1",
        refund_amount_cents: 0,
      },
    })

    await handleChargeDisputeCreated({
      event: disputeEvent("charge.dispute.created"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mutations).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({ dispute_id: "dp_test" }),
      table: "stripe_disputes",
      type: "upsert",
    }))
    expect(mutations.filter((row) => row.table === "intakes")).toEqual([])
    expect(mocks.after).not.toHaveBeenCalled()
    expect(mocks.runGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
  })

  it("leaves a created event unclaimed and retryable when its ledger snapshot fails", async () => {
    const { rpc, supabase } = createSupabaseMock({
      intakeRow: { id: "intake-1" },
      upsertError: { message: "temporary dispute ledger outage" },
    })

    const response = await handleChargeDisputeCreated({
      event: disputeEvent("charge.dispute.created"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(rpc).not.toHaveBeenCalledWith(
      "try_process_stripe_event",
      expect.anything(),
    )
    expect(mocks.sendDisputeAlertEmail).not.toHaveBeenCalled()
  })

  it("deducts an open dispute withdrawal without making an irreversible Ads retraction", async () => {
    const { rpc, supabase } = createSupabaseMock({
      cashResult: {
        data: {
          amount_cents: 4995,
          applied: true,
          intake_id: "intake-1",
          intake_updated: true,
          refund_amount_cents: 0,
          restored_payment_status: null,
        },
        error: null,
      },
      intakeRow: {
        amount_cents: 4995,
        id: "intake-1",
        refund_amount_cents: 0,
      },
    })
    const event = disputeEvent("charge.dispute.funds_withdrawn", {
      balance_transactions: [{ amount: -4995, currency: "aud" } as Stripe.BalanceTransaction],
      status: "under_review",
    })

    await handleChargeDisputeLifecycle({
      event,
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(rpc).toHaveBeenCalledWith("record_stripe_dispute_cash_event", {
      p_amount_cents: 4995,
      p_dispute_id: "dp_test",
      p_event_at: "2026-06-18T01:30:00.000Z",
      p_event_id: "evt_charge_dispute_funds_withdrawn",
      p_event_type: "charge.dispute.funds_withdrawn",
    })
    expect(mocks.after).not.toHaveBeenCalled()
    expect(mocks.runGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
  })

  it("restores retained revenue only when Stripe durably reinstates withdrawn funds", async () => {
    const { mutations, rpc, supabase } = createSupabaseMock({
      cashResult: {
        data: {
          amount_cents: 4995,
          applied: true,
          intake_id: "intake-1",
          intake_updated: true,
          refund_amount_cents: 0,
          restored_payment_status: "paid",
        },
        error: null,
      },
      intakeRow: {
        amount_cents: 4995,
        id: "intake-1",
        payment_status: "disputed",
        refund_amount_cents: 0,
        refunded_at: null,
      },
    })
    const event = disputeEvent("charge.dispute.funds_reinstated", {
      balance_transactions: [
        { amount: -4995, currency: "aud" } as Stripe.BalanceTransaction,
        { amount: 4995, currency: "aud" } as Stripe.BalanceTransaction,
      ],
      status: "won",
    })

    await handleChargeDisputeLifecycle({
      event,
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(rpc).toHaveBeenCalledWith("record_stripe_dispute_cash_event", {
      p_amount_cents: 4995,
      p_dispute_id: "dp_test",
      p_event_at: "2026-06-18T01:30:00.000Z",
      p_event_id: "evt_charge_dispute_funds_reinstated",
      p_event_type: "charge.dispute.funds_reinstated",
    })
    expect(mutations).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        outcome: "won",
        resolved_at: "2026-06-18T01:30:00.000Z",
        status: "won",
      }),
      table: "stripe_disputes",
      type: "update",
    }))
    expect(mocks.after).not.toHaveBeenCalled()
    expect(mocks.runGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
  })

  it("records a won decision without restoring cash on charge.dispute.closed alone", async () => {
    const { mutations, rpc, supabase } = createSupabaseMock({
      intakeRow: {
        amount_cents: 4995,
        id: "intake-1",
        payment_status: "disputed",
        refund_amount_cents: 0,
        refunded_at: null,
      },
    })

    await handleChargeDisputeLifecycle({
      event: disputeEvent("charge.dispute.closed", { status: "won" }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(rpc).not.toHaveBeenCalledWith(
      "record_stripe_dispute_cash_event",
      expect.anything(),
    )
    expect(mutations).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        outcome: "won",
        resolved_at: "2026-06-18T01:30:00.000Z",
        status: "won",
      }),
      table: "stripe_disputes",
      type: "update",
    }))
    expect(mocks.after).not.toHaveBeenCalled()
    expect(mocks.runGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
  })

  it("retracts only after a durable lost decision with outstanding withdrawn cash", async () => {
    const { supabase } = createSupabaseMock({
      disputeRow: {
        funds_reinstated_cents: 0,
        funds_withdrawn_cents: 4995,
        intake_id: "intake-1",
        status: "lost",
      },
      intakeRow: {
        amount_cents: 4995,
        id: "intake-1",
        payment_status: "disputed",
        refund_amount_cents: 0,
        refunded_at: null,
      },
    })

    await handleChargeDisputeLifecycle({
      event: disputeEvent("charge.dispute.closed", { status: "lost" }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.after).toHaveBeenCalledTimes(1)
    await mocks.after.mock.calls[0][0]()
    expect(mocks.runGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentDateTime: new Date("2026-06-18T01:30:00.000Z"),
        amountCents: 4995,
        intakeId: "intake-1",
        paymentStatus: "disputed",
        refundAmountCents: 0,
        requestPath: "/api/stripe/webhook",
        source: "stripe_charge_dispute_lost",
        targetNetValueCents: 0,
      }),
    )
  })

  it("fails retryably instead of inventing cash movement from the dispute amount", async () => {
    const { mutations, rpc, supabase } = createSupabaseMock({
      intakeRow: { id: "intake-1" },
    })

    const response = await handleChargeDisputeLifecycle({
      event: disputeEvent("charge.dispute.funds_withdrawn", {
        amount: 4995,
        balance_transactions: [],
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(mutations).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
    expect(mocks.after).not.toHaveBeenCalled()
  })

  it("leaves cash unclaimed and retryable when the intake lookup transiently fails", async () => {
    const { mutations, rpc, supabase } = createSupabaseMock({
      intakeLookupError: { message: "temporary intake lookup outage" },
    })

    const response = await handleChargeDisputeLifecycle({
      event: disputeEvent("charge.dispute.funds_withdrawn", {
        balance_transactions: [
          { amount: -4995, currency: "aud" } as Stripe.BalanceTransaction,
        ],
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(mutations).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
    expect(mocks.after).not.toHaveBeenCalled()
  })

  it("leaves a reinstatement unclaimed and retryable when no withdrawal is durable yet", async () => {
    const { rpc, supabase } = createSupabaseMock({
      cashResult: {
        data: null,
        error: { message: "dispute cash reinstatement requires a prior withdrawal" },
      },
      intakeRow: { id: "intake-1" },
    })

    const response = await handleChargeDisputeLifecycle({
      event: disputeEvent("charge.dispute.funds_reinstated", {
        balance_transactions: [
          { amount: 4995, currency: "aud" } as Stripe.BalanceTransaction,
        ],
        status: "won",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(rpc).toHaveBeenCalledWith(
      "record_stripe_dispute_cash_event",
      expect.anything(),
    )
    expect(rpc).not.toHaveBeenCalledWith(
      "try_process_stripe_event",
      expect.anything(),
    )
    expect(mocks.after).not.toHaveBeenCalled()
  })

  it("does not duplicate intake or Ads effects when the cash event was already applied", async () => {
    const { rpc, supabase } = createSupabaseMock({
      cashResult: {
        data: {
          amount_cents: 4995,
          applied: false,
          intake_id: "intake-1",
          intake_updated: false,
          refund_amount_cents: 0,
        },
        error: null,
      },
      intakeRow: { id: "intake-1" },
    })

    await handleChargeDisputeLifecycle({
      adminReplay: true,
      event: disputeEvent("charge.dispute.funds_withdrawn", {
        balance_transactions: [
          { amount: -4995, currency: "aud" } as Stripe.BalanceTransaction,
        ],
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(rpc).toHaveBeenCalledWith(
      "record_stripe_dispute_cash_event",
      expect.anything(),
    )
    expect(rpc).not.toHaveBeenCalledWith(
      "try_process_stripe_event",
      expect.anything(),
    )
    expect(mocks.after).not.toHaveBeenCalled()
    expect(mocks.runGoogleAdsConversionAdjustment).not.toHaveBeenCalled()
  })
})
