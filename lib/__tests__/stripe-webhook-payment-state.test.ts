import { after } from "next/server"
import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  generateDraftsForIntake: vi.fn(),
  getPostHogClient: vi.fn(() => ({
    alias: vi.fn(),
    capture: vi.fn(),
  })),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  listCheckoutSessions: vi.fn(),
  notifyPaymentReceived: vi.fn(),
  sendPaymentFailedEmail: vi.fn(),
  sendPaidRequestTelegramNotification: vi.fn(),
  sendSessionExpiredEmail: vi.fn(),
  startPostPaymentReviewWork: vi.fn(),
  trackBusinessMetric: vi.fn(),
  trackIntakeFunnelStep: vi.fn(),
}))

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server")
  return {
    ...actual,
    after: mocks.after,
  }
})

vi.mock("@/lib/analytics/posthog-server", () => ({
  getPostHogClient: mocks.getPostHogClient,
  trackBusinessMetric: mocks.trackBusinessMetric,
  trackIntakeFunnelStep: mocks.trackIntakeFunnelStep,
}))

vi.mock("@/app/actions/generate-drafts", () => ({
  generateDraftsForIntake: mocks.generateDraftsForIntake,
}))

vi.mock("@/lib/email/template-sender", () => ({
  sendPaymentFailedEmail: mocks.sendPaymentFailedEmail,
  sendSessionExpiredEmail: mocks.sendSessionExpiredEmail,
}))

vi.mock("@/lib/notifications/paid-request-telegram", () => ({
  sendPaidRequestTelegramNotification: mocks.sendPaidRequestTelegramNotification,
  shouldSendPaidRequestTelegramNotification: vi.fn(),
}))

vi.mock("@/lib/notifications/service", () => ({
  notifyPaymentReceived: mocks.notifyPaymentReceived,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    checkout: {
      sessions: {
        list: mocks.listCheckoutSessions,
      },
    },
  },
}))

vi.mock("@/lib/stripe/post-payment", () => ({
  startPostPaymentReviewWork: mocks.startPostPaymentReviewWork,
}))

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
}))

import { handleChargeRefunded } from "@/app/api/stripe/webhook/handlers/charge-refunded"
import { handleAsyncPaymentFailed } from "@/app/api/stripe/webhook/handlers/checkout-session-async-payment-failed"
import { handleAsyncPaymentSucceeded } from "@/app/api/stripe/webhook/handlers/checkout-session-async-payment-succeeded"
import { handleCheckoutSessionCompleted } from "@/app/api/stripe/webhook/handlers/checkout-session-completed"
import { handleCheckoutSessionExpired } from "@/app/api/stripe/webhook/handlers/checkout-session-expired"
import { handlePaymentIntentFailed } from "@/app/api/stripe/webhook/handlers/payment-intent-payment-failed"

interface UpdateRecord {
  filters: Array<{
    column: string
    method: "eq" | "in"
    value: unknown
  }>
  payload: Record<string, unknown>
  table: string
}

interface UpdateResult {
  data: { id: string } | Array<{ id: string }> | null
  error: null
}

function createUpdateChain(record: UpdateRecord, result: UpdateResult = { data: { id: "intake-1" }, error: null }) {
  const chain = {
    eq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "eq", value })
      return chain
    }),
    in: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "in", value })
      return chain
    }),
    select: vi.fn(() => {
      const selectResult = {
        maybeSingle: vi.fn(async () => result),
        single: vi.fn(async () => result),
        then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
      }

      return selectResult
    }),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  }

  return chain
}

function createPaymentSuccessSupabaseMock() {
  const updates: UpdateRecord[] = []
  const intakeId = "11111111-1111-1111-1111-111111111111"

  function makeSelectResult(table: string, selected?: string) {
    return {
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
        maybeSingle: vi.fn(async () => {
          if (table === "intakes" && selected?.includes("utm_source")) {
            return {
              data: {
                amount_cents: 3900,
                category: "medical_certificate",
                gbraid: null,
                gclid: null,
                subtype: "work",
                utm_campaign: null,
                utm_medium: null,
                utm_source: null,
                wbraid: null,
              },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        single: vi.fn(async () => {
          if (table === "intakes" && (selected?.includes("payment_id") || selected?.includes("payment_status"))) {
            return {
              data: {
                id: intakeId,
                payment_id: "cs_current",
                payment_status: "pending",
                status: "pending_payment",
              },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
      })),
    }
  }

  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn((selected?: string) => makeSelectResult(table, selected)),
      update: vi.fn((payload: Record<string, unknown>) => {
        const record: UpdateRecord = { filters: [], payload, table }
        updates.push(record)
        return createUpdateChain(record, { data: { id: "intake-1" }, error: null })
      }),
    })),
    rpc: vi.fn(async () => ({ data: true, error: null })),
  }

  return { intakeId, supabase, updates }
}

function createSelectChain() {
  return {
    eq: vi.fn(() => ({
      single: vi.fn(async () => ({
        data: {
          category: "medical_certificate",
          patient: { email: null, full_name: null },
        },
        error: null,
      })),
    })),
  }
}

function createWebhookSupabaseMock(
  updateResult: UpdateResult = { data: { id: "intake-1" }, error: null },
  claimResult = { data: true, error: null },
) {
  const updates: UpdateRecord[] = []

  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => createSelectChain()),
      update: vi.fn((payload: Record<string, unknown>) => {
        const record: UpdateRecord = { filters: [], payload, table }
        updates.push(record)
        return createUpdateChain(record, updateResult)
      }),
    })),
    rpc: vi.fn(async () => claimResult),
  }

  return { supabase, updates }
}

function makeEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: "evt_test",
    type,
    data: { object },
  } as unknown as Stripe.Event
}

describe("Stripe webhook payment state transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listCheckoutSessions.mockResolvedValue({ data: [{ id: "cs_current" }] })
  })

  it("only expires the intake for the currently stored checkout session", async () => {
    const { supabase, updates } = createWebhookSupabaseMock()

    await handleCheckoutSessionExpired({
      event: makeEvent("checkout.session.expired", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: {
        payment_status: "expired",
        status: "expired",
      },
      table: "intakes",
    })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "status", method: "eq", value: "pending_payment" },
      { column: "payment_id", method: "eq", value: "cs_current" },
    ]))
  })

  it("does not notify expiry when a stale checkout session no longer matches", async () => {
    const { supabase } = createWebhookSupabaseMock({ data: null, error: null })

    await handleCheckoutSessionExpired({
      event: makeEvent("checkout.session.expired", {
        id: "cs_stale",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.sendSessionExpiredEmail).not.toHaveBeenCalled()
  })

  it("marks failed card attempts as checkout_failed without touching paid intakes", async () => {
    const { supabase, updates } = createWebhookSupabaseMock()

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { message: "Card declined" },
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: {
        payment_status: "failed",
        status: "checkout_failed",
      },
      table: "intakes",
    })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
    expect(mocks.listCheckoutSessions).toHaveBeenCalledWith({ limit: 1, payment_intent: "pi_failed" })
    expect(after).toHaveBeenCalledTimes(1)
  })

  it("does not notify payment failure when the failed PaymentIntent belongs to a stale checkout session", async () => {
    mocks.listCheckoutSessions.mockResolvedValue({ data: [{ id: "cs_stale" }] })
    const { supabase, updates } = createWebhookSupabaseMock({ data: null, error: null })

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { message: "Card declined" },
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_stale" },
    ]))
    expect(mocks.trackBusinessMetric).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
  })

  it("does not consume failed-payment webhook events when Stripe checkout lookup is transiently unavailable", async () => {
    mocks.listCheckoutSessions.mockRejectedValue(new Error("Stripe unavailable"))
    const { supabase } = createWebhookSupabaseMock()

    const response = await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { message: "Card declined" },
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(mocks.trackBusinessMetric).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
  })

  it("does not notify payment failure when the guarded failure update matches no row", async () => {
    const { supabase } = createWebhookSupabaseMock({ data: null, error: null })

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { message: "Card declined" },
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.trackBusinessMetric).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
  })

  it("bypasses prior event claims during admin replay", async () => {
    const { supabase, updates } = createWebhookSupabaseMock(
      { data: { id: "intake-1" }, error: null },
      { data: false, error: null },
    )

    await handlePaymentIntentFailed({
      adminReplay: true,
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { message: "Card declined" },
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    } as never)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(updates[0]).toMatchObject({
      payload: {
        payment_status: "failed",
        status: "checkout_failed",
      },
    })
  })

  it("records canonical refund metadata when Stripe reports a partial charge refund", async () => {
    const refundedAt = "2026-04-14T12:37:28.000Z"
    const { supabase, updates } = createWebhookSupabaseMock({
      data: [{ id: "intake-1" }],
      error: null,
    })

    await handleChargeRefunded({
      event: makeEvent("charge.refunded", {
        amount: 4995,
        amount_refunded: 1995,
        id: "ch_refunded",
        payment_intent: "pi_refunded",
        refunds: {
          data: [
            {
              amount: 1995,
              created: Math.floor(Date.parse(refundedAt) / 1000),
              id: "re_partial",
              status: "succeeded",
            },
          ],
        },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    const intakeUpdate = updates.find((update) => update.table === "intakes")
    expect(intakeUpdate?.payload).toMatchObject({
      payment_status: "partially_refunded",
      refund_amount_cents: 1995,
      refund_status: "succeeded",
      refund_stripe_id: "re_partial",
      refunded_at: refundedAt,
    })

    const paymentUpdate = updates.find((update) => update.table === "payments")
    expect(paymentUpdate?.payload).toMatchObject({
      refund_amount: 1995,
      refund_status: "refunded",
      refunded_at: refundedAt,
      status: "refunded",
      stripe_refund_id: "re_partial",
    })
  })

  it("marks failed async checkout attempts against the current checkout session only", async () => {
    const { supabase, updates } = createWebhookSupabaseMock()

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: {
        payment_status: "failed",
        status: "checkout_failed",
      },
      table: "intakes",
    })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "status", method: "eq", value: "pending_payment" },
      { column: "payment_id", method: "eq", value: "cs_current" },
    ]))
  })

  it("does not notify async payment failure when a stale checkout session no longer matches", async () => {
    const { supabase } = createWebhookSupabaseMock({ data: null, error: null })

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_stale",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it("marks completed checkout sessions paid only when the session is still current", async () => {
    const { intakeId, supabase, updates } = createPaymentSuccessSupabaseMock()

    await handleCheckoutSessionCompleted({
      event: makeEvent("checkout.session.completed", {
        amount_total: 3900,
        customer: "cus_test",
        id: "cs_current",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_current",
        payment_status: "paid",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: {
        amount_cents: 3900,
        payment_status: "paid",
        status: "paid",
        stripe_payment_intent_id: "pi_current",
      },
      table: "intakes",
    })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: intakeId },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
  })

  it("marks async succeeded checkout sessions paid only when the session is still current", async () => {
    const { intakeId, supabase, updates } = createPaymentSuccessSupabaseMock()

    await handleAsyncPaymentSucceeded({
      event: makeEvent("checkout.session.async_payment_succeeded", {
        amount_total: 3900,
        customer: "cus_test",
        id: "cs_current",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_current",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: {
        amount_cents: 3900,
        payment_status: "paid",
        status: "paid",
        stripe_payment_intent_id: "pi_current",
      },
      table: "intakes",
    })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: intakeId },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
  })

  // Regression: refunds were computed from intakes.amount_cents (the list price),
  // but referral credits apply as a Stripe coupon and the Express fee adds a line
  // item, so the true charge (session.amount_total) differs. Storing the list
  // price made manual refunds exceed the charge for coupon customers ("Refund
  // amount > charge amount") and under-refund Express customers by $9.95. The
  // paid transition must reconcile amount_cents to the real amount charged.
  it("reconciles amount_cents to the true Stripe amount_total on the completed paid transition", async () => {
    const { intakeId, supabase, updates } = createPaymentSuccessSupabaseMock()

    // $19.95 med cert with a $5.00 referral credit -> customer charged $14.95.
    await handleCheckoutSessionCompleted({
      event: makeEvent("checkout.session.completed", {
        amount_total: 1495,
        customer: "cus_test",
        id: "cs_current",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_current",
        payment_status: "paid",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: { amount_cents: 1495, payment_status: "paid", status: "paid" },
      table: "intakes",
    })
  })

  it("reconciles amount_cents to the true Stripe amount_total on the async paid transition", async () => {
    const { intakeId, supabase, updates } = createPaymentSuccessSupabaseMock()

    // Express add-on: base $19.95 + $9.95 priority fee -> customer charged $29.90.
    await handleAsyncPaymentSucceeded({
      event: makeEvent("checkout.session.async_payment_succeeded", {
        amount_total: 2990,
        customer: "cus_test",
        id: "cs_current",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_current",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: { amount_cents: 2990, payment_status: "paid", status: "paid" },
      table: "intakes",
    })
  })
})
