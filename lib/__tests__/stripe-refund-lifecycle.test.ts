import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  captureMessage: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  listRefunds: vi.fn(),
  reserveRefundEmail: vi.fn(),
  resolveRefundIntake: vi.fn(),
  retrieveBalanceTransaction: vi.fn(),
  runGoogleAdsConversionAdjustment: vi.fn(),
}))

vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: mocks.after,
}))
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.captureMessage }))
vi.mock("@/lib/analytics/google-ads-conversion-adjustments", async () => ({
  ...(await vi.importActual<typeof import("@/lib/analytics/google-ads-conversion-adjustments")>(
    "@/lib/analytics/google-ads-conversion-adjustments",
  )),
  runGoogleAdsConversionAdjustment: mocks.runGoogleAdsConversionAdjustment,
}))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => mocks.logger }))
vi.mock("@/lib/email/template-sender", () => ({
  reserveRefundEmail: mocks.reserveRefundEmail,
}))
vi.mock("@/lib/stripe/refund-intake-resolution", () => ({
  resolveStripeRefundIntake: mocks.resolveRefundIntake,
}))
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    balanceTransactions: { retrieve: mocks.retrieveBalanceTransaction },
    refunds: { list: mocks.listRefunds },
  },
}))

import { handleRefundLifecycle } from "@/app/api/stripe/webhook/handlers/refund-lifecycle"
import {
  persistStripeRefundApiObservation,
  persistStripeRefundEventEvidence,
} from "@/lib/stripe/refund-event-persistence"

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
  intakeMissing?: boolean
  bindingError?: { message: string } | null
  ledgerError?: { message: string } | null
  persistedEvidenceTransform?: (row: Record<string, unknown>) => Record<string, unknown>
  reconciliationError?: { message: string } | null
  state?: Record<string, unknown>
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
    const operation = name === "reconcile_intake_refund_cash_state"
      ? "reconcile"
      : name === "bind_stripe_refund_attempt_from_webhook"
        ? "bind"
      : name === "queue_google_ads_conversion_adjustment"
        ? "queue"
        : name === "cancel_stripe_refund_notifications"
          ? "cancel"
          : "claim"
    operations.push(operation)
    return {
      data: name === "reconcile_intake_refund_cash_state"
        ? { applied: true, intake_id: "intake-1" }
        : name === "queue_google_ads_conversion_adjustment"
          ? { queued: true, state: "pending" }
          : name === "cancel_stripe_refund_notifications"
            ? 1
            : true,
      error: name === "reconcile_intake_refund_cash_state"
        ? input?.reconciliationError ?? null
        : name === "bind_stripe_refund_attempt_from_webhook"
          ? input?.bindingError ?? null
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
    if (table === "stripe_payment_adjustment_targets") {
      const target = {
        eq: vi.fn(() => target),
        maybeSingle: vi.fn(async () => {
          operations.push("target")
          const refundAmountCents = Number(input?.state?.refund_amount_cents ?? 995)
          return {
            data: {
              adjustment_at: "2026-05-20T06:59:00.000Z",
              target_net_value_cents: 4995 - refundAmountCents,
            },
            error: null,
          }
        }),
      }
      return { select: vi.fn(() => target) }
    }
    const chain = {
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        const operation = chain.selected === "id"
          ? "intake"
          : chain.selected.includes("stripe_payment_intent_id")
            ? "metadata_intake"
            : "state"
        operations.push(operation)
        return {
          data: input?.intakeError
            ? null
            : input?.intakeMissing && chain.selected === "id"
              ? null
              : chain.selected.includes("stripe_payment_intent_id")
                ? { id: "intake-1", stripe_payment_intent_id: "pi_refund" }
              : {
                amount_cents: 4995,
                id: "intake-1",
                payment_status: "partially_refunded",
                priority_fee_refunded_at: null,
                refund_amount_cents: 995,
                refund_status: "succeeded",
                refund_stripe_id: "re_refund",
                refunded_at: "2026-05-20T06:59:00.000Z",
                ...input?.state,
              },
          error: input?.intakeError ?? null,
        }
      }),
      single: vi.fn(async () => {
        if (chain.selected === "id, patient_id") {
          operations.push("notification_intake")
          return {
            data: { id: "intake-1", patient_id: "patient-1" },
            error: null,
          }
        }
        if (chain.selected === "id, full_name, email") {
          operations.push("notification_patient")
          return {
            data: {
              email: "patient@example.test",
              full_name: "patient example",
              id: "patient-1",
            },
            error: null,
          }
        }
        return { data: null, error: null }
      }),
      selected: "",
      select: vi.fn((selected: string) => {
        chain.selected = selected
        return chain
      }),
    }
    return chain
  })
  return {
    deadLetters,
    from,
    operations,
    rpc,
    supabase: { from, rpc },
    upsert,
  }
}

describe("Stripe refund lifecycle evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveRefundIntake.mockResolvedValue({
      error: null,
      intakeId: "intake-1",
      paymentIntentId: "pi_refund",
    })
    mocks.reserveRefundEmail.mockResolvedValue({
      emailId: "outbox-refund",
      success: true,
    })
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
    expect(operations).toEqual([
      "ledger",
      "verify",
      "reconcile",
      "state",
      "notification_intake",
      "notification_patient",
      "target",
      "queue",
      "claim",
    ])
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        amount_cents: 995,
        evidence_key: "live:event:evt_refund_created:refund:re_refund",
        intake_id: "intake-1",
        refund_created_at: "2026-05-20T06:58:52.000Z",
      }),
    ], { ignoreDuplicates: true, onConflict: "evidence_key" })
    expect(rpc).toHaveBeenCalledWith("try_process_stripe_event", expect.anything())
    expect(rpc).toHaveBeenCalledWith("queue_google_ads_conversion_adjustment", {
      p_adjustment_at: "2026-05-20T06:59:00.000Z",
      p_adjustment_type: "RESTATEMENT",
      p_intake_id: "intake-1",
      p_source: "stripe_refund_lifecycle",
      p_target_net_value_cents: 4000,
    })
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
    const { operations, rpc, supabase } = createSupabaseMock({
      state: {
        payment_status: "paid",
        refund_amount_cents: 0,
        refund_status: "failed",
        refunded_at: null,
      },
    })

    await handleRefundLifecycle({
      event: failedEvent,
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(operations).toEqual([
      "ledger",
      "verify",
      "reconcile",
      "state",
      "cancel",
      "target",
      "queue",
      "claim",
    ])
    expect(rpc).toHaveBeenCalledWith("reconcile_intake_refund_cash_state", {
      p_intake_id: "intake-1",
      p_livemode: true,
      p_trigger_status: "failed",
    })
    expect(rpc).toHaveBeenCalledWith("cancel_stripe_refund_notifications", {
      p_intake_id: "intake-1",
      p_refund_ids: ["re_refund"],
    })
    expect(rpc).toHaveBeenCalledWith("queue_google_ads_conversion_adjustment", {
      p_adjustment_at: "2026-05-20T06:59:00.000Z",
      p_adjustment_type: "RESTATEMENT",
      p_intake_id: "intake-1",
      p_source: "stripe_refund_lifecycle",
      p_target_net_value_cents: 4995,
    })
    for (const [callback] of mocks.after.mock.calls) await callback()
    expect(mocks.runGoogleAdsConversionAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeId: "intake-1",
        paymentStatus: "paid",
        refundAmountCents: 0,
        source: "stripe_refund_lifecycle",
        targetNetValueCents: 4995,
      }),
    )
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
    expect(operations).toEqual(["ledger", "verify", "reconcile"])
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
    expect(operations).toEqual(["ledger", "verify"])
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "REFUND_EVIDENCE_UNAVAILABLE",
      event_id: "evt_refund_updated",
    }))
    expect(rpc).not.toHaveBeenCalled()
  })

  it("does not persist unlinked evidence after a transient intake query failure", async () => {
    mocks.resolveRefundIntake.mockResolvedValue({
      error: "Stripe refund intake lookup failed: temporary intake lookup outage",
      intakeId: null,
      paymentIntentId: "pi_refund",
    })
    const { operations, rpc, supabase, upsert } = createSupabaseMock()

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.created"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(operations).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("persists legacy evidence only after the shared resolver returns a linked intake", async () => {
    mocks.resolveRefundIntake.mockResolvedValue({
      error: null,
      intakeId: "intake-1",
      paymentIntentId: "pi_refund",
    })
    const { operations, supabase, upsert } = createSupabaseMock({ intakeMissing: true })

    const response = await handleRefundLifecycle({
      event: refundEvent("refund.created"),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(response).toBeUndefined()
    expect(mocks.resolveRefundIntake).toHaveBeenCalledWith(
      expect.objectContaining({ supabase }),
      {
        eventPaymentIntentId: null,
        refund: expect.objectContaining({ id: "re_refund" }),
      },
    )
    expect(operations.slice(0, 2)).toEqual(["ledger", "verify"])
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({ intake_id: "intake-1" }),
    ], expect.anything())
  })

  it("binds valid durable-attempt metadata before persisting and returns verified evidence", async () => {
    const attemptId = "11111111-1111-4111-8111-111111111111"
    const event = refundEvent("refund.updated", {
      metadata: {
        intake_id: "intake-1",
        refund_attempt_id: attemptId,
        refund_type: "decline",
      },
      status: "pending",
    })
    const { operations, rpc, supabase } = createSupabaseMock()

    const result = await persistStripeRefundEventEvidence({
      event,
      supabase: supabase as never,
    })

    expect(result.error).toBeNull()
    expect(result.evidence).toEqual([
      expect.objectContaining({
        evidence_key: "live:event:evt_refund_updated:refund:re_refund",
        intake_id: "intake-1",
        stripe_refund_id: "re_refund",
      }),
    ])
    expect(rpc).toHaveBeenCalledWith("bind_stripe_refund_attempt_from_webhook", {
      p_amount_cents: 995,
      p_attempt_id: attemptId,
      p_intake_id: "intake-1",
      p_livemode: true,
      p_payment_intent_id: "pi_refund",
      p_refund_type: "decline",
      p_stripe_refund_id: "re_refund",
      p_stripe_status: "pending",
    })
    expect(operations.slice(0, 3)).toEqual(["bind", "ledger", "verify"])
  })

  it("does not persist evidence when durable-attempt binding fails", async () => {
    const event = refundEvent("refund.updated", {
      metadata: {
        refund_attempt_id: "11111111-1111-4111-8111-111111111111",
      },
    })
    const { operations, supabase, upsert } = createSupabaseMock({
      bindingError: { message: "temporary attempt ledger outage" },
    })

    const result = await persistStripeRefundEventEvidence({
      event,
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/attempt binding failed/i)
    expect(result.evidence).toEqual([])
    expect(operations).toEqual(["bind"])
    expect(upsert).not.toHaveBeenCalled()
  })

  it("fails closed on malformed durable-attempt metadata", async () => {
    const event = refundEvent("refund.updated", {
      metadata: { refund_attempt_id: "not-a-uuid" },
    })
    const { supabase, upsert } = createSupabaseMock()

    const result = await persistStripeRefundEventEvidence({
      event,
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/attempt metadata is invalid/i)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("persists a verified recovery observation without inventing a webhook event", async () => {
    const recovered = refundEvent("refund.updated").data.object as Stripe.Refund
    const { operations, supabase, upsert } = createSupabaseMock()

    const result = await persistStripeRefundApiObservation({
      intakeId: "intake-1",
      livemode: true,
      refund: {
        ...recovered,
        balance_transaction: await mocks.retrieveBalanceTransaction("txn_refund"),
      },
      supabase: supabase as never,
    })

    expect(result.error).toBeNull()
    expect(result.evidence).toEqual([
      expect.objectContaining({
        evidence_key: "live:refund:re_refund:api:txn_refund:none:succeeded",
        evidence_source: "refund.api.reconcile",
        stripe_event_id: null,
      }),
    ])
    expect(operations).toEqual(["ledger", "verify"])
    expect(upsert).toHaveBeenCalledOnce()
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
    expect(result.evidence).toHaveLength(2)
    expect(mocks.listRefunds).toHaveBeenCalledWith({
      charge: "ch_refund",
      expand: ["data.balance_transaction", "data.failure_balance_transaction"],
      limit: 100,
    })
    expect(upsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ stripe_refund_id: "re_refund" }),
      expect.objectContaining({ stripe_refund_id: "re_topup" }),
    ]), expect.anything())
    expect(mocks.resolveRefundIntake).toHaveBeenCalledTimes(2)
    expect(mocks.resolveRefundIntake).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ eventPaymentIntentId: "pi_refund" }),
    )
  })

  it("fails closed before insertion when refunds in one event resolve to different intakes", async () => {
    const firstRefund = refundEvent("refund.created").data.object as Stripe.Refund
    const secondRefund = {
      ...firstRefund,
      amount: 4000,
      balance_transaction: "txn_topup",
      id: "re_topup",
    }
    mocks.listRefunds.mockResolvedValue({
      data: [firstRefund, secondRefund],
      has_more: false,
    })
    mocks.resolveRefundIntake
      .mockResolvedValueOnce({
        error: null,
        intakeId: "intake-1",
        paymentIntentId: "pi_refund",
      })
      .mockResolvedValueOnce({
        error: null,
        intakeId: "intake-2",
        paymentIntentId: "pi_refund",
      })
    const chargeEvent = {
      ...refundEvent("refund.created"),
      data: {
        object: {
          id: "ch_refund",
          object: "charge",
          payment_intent: "pi_refund",
          refunds: { data: [], has_more: true },
        } as unknown as Stripe.Charge,
      },
      id: "evt_charge_refunded_conflict",
      type: "charge.refunded",
    } as Stripe.Event
    const { operations, supabase, upsert } = createSupabaseMock()

    const result = await persistStripeRefundEventEvidence({
      event: chargeEvent,
      supabase: supabase as never,
    })

    expect(result.error).toMatch(/different intakes/i)
    expect(result.evidence).toEqual([])
    expect(operations).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
  })
})
