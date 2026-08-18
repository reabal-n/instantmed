import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111"
const operations: string[] = []
const mocks = vi.hoisted(() => ({
  addToDeadLetterQueue: vi.fn(),
  after: vi.fn(),
  finalizeAttempts: vi.fn(),
  finalizeNotifications: vi.fn(),
  persist: vi.fn(),
  queue: vi.fn(),
  readTarget: vi.fn(),
  reconcile: vi.fn(),
  reportFailure: vi.fn(),
  runAdjustment: vi.fn(),
  tryClaimEvent: vi.fn(),
}))

vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: mocks.after,
}))
vi.mock("@/lib/analytics/google-ads-conversion-adjustments", () => ({
  queueExactGoogleAdsConversionAdjustment: mocks.queue,
  runGoogleAdsConversionAdjustment: mocks.runAdjustment,
}))
vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ info: vi.fn() }),
}))
vi.mock("@/lib/stripe/refund-event-persistence", () => ({
  finalizePersistedStripeRefundAttempts: mocks.finalizeAttempts,
  persistStripeRefundEventEvidence: mocks.persist,
  readExactRefundAdjustmentTarget: mocks.readTarget,
  reconcilePersistedStripeRefundState: mocks.reconcile,
  reportStripeRefundEvidenceFailure: mocks.reportFailure,
}))
vi.mock("@/lib/stripe/refund-notification-finalizer", () => ({
  finalizeRefundNotifications: mocks.finalizeNotifications,
}))
vi.mock("@/app/api/stripe/webhook/handlers/utils", () => ({
  addToDeadLetterQueue: mocks.addToDeadLetterQueue,
  tryClaimEvent: mocks.tryClaimEvent,
}))

import { handleChargeRefunded } from "@/app/api/stripe/webhook/handlers/charge-refunded"
import { handleRefundLifecycle } from "@/app/api/stripe/webhook/handlers/refund-lifecycle"

type Handler = typeof handleChargeRefunded

function event(type: "charge.refunded" | "refund.updated"): Stripe.Event {
  return {
    created: Math.floor(Date.parse("2026-08-16T01:02:00.000Z") / 1_000),
    data: {
      object: type === "charge.refunded"
        ? {
            amount_refunded: 995,
            id: "ch_refund",
            object: "charge",
            payment_intent: "pi_refund",
          }
        : {
            id: "re_refund",
            object: "refund",
          },
    },
    id: `evt_${type.replaceAll(".", "_")}`,
    livemode: true,
    object: "event",
    pending_webhooks: 1,
    request: null,
    type,
  } as Stripe.Event
}

const cases: Array<{ handler: Handler; label: string; type: Stripe.Event.Type }> = [
  { handler: handleChargeRefunded, label: "charge.refunded", type: "charge.refunded" },
  { handler: handleRefundLifecycle, label: "refund.updated", type: "refund.updated" },
]

describe("refund downstream finalization ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    operations.length = 0
    mocks.persist.mockImplementation(async () => {
      operations.push("persist")
      return {
        error: null,
        evidence: [{ refund_cash_at: "2026-08-16T01:02:00.000Z" }],
        intakeId: "intake-1",
        refunds: [{
          id: "re_refund",
          metadata: { refund_attempt_id: ATTEMPT_ID },
          status: "succeeded",
        }],
      }
    })
    mocks.reconcile.mockImplementation(async () => {
      operations.push("reconcile")
      return {
        error: null,
        state: {
          amount_cents: 4_995,
          id: "intake-1",
          payment_status: "partially_refunded",
          refund_amount_cents: 995,
        },
      }
    })
    mocks.finalizeNotifications.mockImplementation(async () => {
      operations.push("notification")
      return { error: null }
    })
    mocks.finalizeAttempts.mockImplementation(async () => {
      operations.push("attempt")
      return { error: null }
    })
    mocks.readTarget.mockImplementation(async () => {
      operations.push("target")
      return {
        adjustmentDateTime: new Date("2026-08-16T01:03:00.000Z"),
        error: null,
        targetNetValueCents: 4_000,
      }
    })
    mocks.queue.mockImplementation(async () => {
      operations.push("queue")
      return { error: null, state: "pending" }
    })
    mocks.tryClaimEvent.mockImplementation(async () => {
      operations.push("claim")
      return true
    })
  })

  it.each(cases)(
    "$label finalizes the cash attempt after notification but before Ads and event claim",
    async ({ handler, type }) => {
      const supabase = {}

      const response = await handler({
        event: event(type as "charge.refunded" | "refund.updated"),
        startTime: Date.now(),
        supabase: supabase as never,
      })

      expect(response).toBeUndefined()
      expect(operations).toEqual([
        "persist",
        "reconcile",
        "notification",
        "attempt",
        "target",
        "queue",
        "claim",
      ])
      expect(mocks.finalizeAttempts).toHaveBeenCalledWith({
        evidence: [expect.objectContaining({ refund_cash_at: expect.any(String) })],
        livemode: true,
        refunds: [expect.objectContaining({ id: "re_refund" })],
        supabase,
      })
    },
  )

  it.each(cases)(
    "$label never finalizes an attempt when durable notification fails",
    async ({ handler, type }) => {
      mocks.finalizeNotifications.mockImplementation(async () => {
        operations.push("notification")
        return { error: "notification outbox unavailable" }
      })

      const response = await handler({
        event: event(type as "charge.refunded" | "refund.updated"),
        startTime: Date.now(),
        supabase: {} as never,
      })

      expect((response as Response).status).toBe(500)
      expect(operations).toEqual(["persist", "reconcile", "notification"])
      expect(mocks.finalizeAttempts).not.toHaveBeenCalled()
      expect(mocks.tryClaimEvent).not.toHaveBeenCalled()
    },
  )

  it.each(cases)(
    "$label leaves Ads work retryable without keeping the cash attempt active",
    async ({ handler, type }) => {
      mocks.queue.mockImplementation(async () => {
        operations.push("queue")
        return { error: "Ads queue unavailable" }
      })

      const response = await handler({
        event: event(type as "charge.refunded" | "refund.updated"),
        startTime: Date.now(),
        supabase: {} as never,
      })

      expect((response as Response).status).toBe(500)
      expect(operations).toEqual([
        "persist",
        "reconcile",
        "notification",
        "attempt",
        "target",
        "queue",
      ])
      expect(mocks.finalizeAttempts).toHaveBeenCalledOnce()
      expect(mocks.tryClaimEvent).not.toHaveBeenCalled()
    },
  )

  it.each(cases)(
    "$label retries terminal attempt finalization before starting Ads work",
    async ({ handler, type }) => {
      mocks.finalizeAttempts.mockImplementation(async () => {
        operations.push("attempt")
        return { error: "terminal attempt finalization incomplete" }
      })

      const response = await handler({
        event: event(type as "charge.refunded" | "refund.updated"),
        startTime: Date.now(),
        supabase: {} as never,
      })

      expect((response as Response).status).toBe(500)
      expect(operations).toEqual([
        "persist",
        "reconcile",
        "notification",
        "attempt",
      ])
      expect(mocks.queue).not.toHaveBeenCalled()
      expect(mocks.tryClaimEvent).not.toHaveBeenCalled()
    },
  )
})
