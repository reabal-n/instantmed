import { after } from "next/server"
import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  addToDeadLetterQueue: vi.fn(),
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
  runGoogleAdsConversionAdjustment: vi.fn(),
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

vi.mock("@/lib/analytics/google-ads-conversion-adjustments", () => ({
  runGoogleAdsConversionAdjustment: mocks.runGoogleAdsConversionAdjustment,
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

vi.mock("@/app/api/stripe/webhook/handlers/utils", async () => {
  const actual = await vi.importActual<typeof import("@/app/api/stripe/webhook/handlers/utils")>(
    "@/app/api/stripe/webhook/handlers/utils",
  )
  return {
    ...actual,
    addToDeadLetterQueue: mocks.addToDeadLetterQueue,
  }
})

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
    column?: string
    method: "eq" | "in" | "is" | "neq" | "not" | "or"
    operator?: string
    value: unknown
  }>
  payload: Record<string, unknown>
  table: string
}

interface UpdateResult {
  data: Record<string, unknown> | Array<Record<string, unknown>> | null
  error: { code?: string; message: string } | null
}

type UpdateResultFactory = (record: UpdateRecord) => UpdateResult | Promise<UpdateResult>

interface SelectRecord {
  filters: UpdateRecord["filters"]
  selected?: string
  table: string
}

type SelectResult = {
  data: Record<string, unknown> | null
  error: { code?: string; message: string } | null
}

type SelectResultFactory = (record: SelectRecord) => SelectResult | Promise<SelectResult>

function createUpdateChain(
  record: UpdateRecord,
  result: UpdateResult | UpdateResultFactory = { data: { id: "intake-1" }, error: null },
) {
  const resolveResult = () => Promise.resolve(
    typeof result === "function" ? result(record) : result,
  )
  const chain = {
    eq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "eq", value })
      return chain
    }),
    in: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "in", value })
      return chain
    }),
    is: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "is", value })
      return chain
    }),
    neq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "neq", value })
      return chain
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      record.filters.push({ column, method: "not", operator, value })
      return chain
    }),
    or: vi.fn((value: string) => {
      record.filters.push({ method: "or", value })
      return chain
    }),
    select: vi.fn(() => {
      const selectResult = {
        maybeSingle: vi.fn(resolveResult),
        single: vi.fn(resolveResult),
        then: (resolve: (value: UpdateResult) => void) => resolveResult().then(resolve),
      }

      return selectResult
    }),
    then: (resolve: (value: UpdateResult) => void) => resolveResult().then(resolve),
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

function createSelectChain(
  record: SelectRecord,
  resultFactory: SelectResultFactory,
) {
  const resolve = () => Promise.resolve(resultFactory(record))
  const chain = {
    eq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "eq", value })
      return chain
    }),
    in: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "in", value })
      return chain
    }),
    is: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "is", value })
      return chain
    }),
    neq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, method: "neq", value })
      return chain
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      record.filters.push({ column, method: "not", operator, value })
      return chain
    }),
    maybeSingle: vi.fn(resolve),
    or: vi.fn((value: string) => {
      record.filters.push({ method: "or", value })
      return chain
    }),
    single: vi.fn(resolve),
    then: (resolvePromise: (value: SelectResult) => void) => resolve().then(resolvePromise),
  }
  return chain
}

function createWebhookSupabaseMock(
  updateResult: UpdateResult | UpdateResultFactory | Array<UpdateResult | UpdateResultFactory> = {
    data: { id: "intake-1" },
    error: null,
  },
  claimResult = { data: true, error: null },
  selectResult: SelectResult | SelectResultFactory = {
    data: {
      category: "medical_certificate",
      patient: { email: null, full_name: null },
    },
    error: null,
  },
) {
  const updates: UpdateRecord[] = []
  const selects: SelectRecord[] = []
  const updateResults = Array.isArray(updateResult) ? [...updateResult] : null
  const selectResultFactory: SelectResultFactory = typeof selectResult === "function"
    ? selectResult
    : () => selectResult

  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn((selected?: string) => {
        const record: SelectRecord = { filters: [], selected, table }
        selects.push(record)
        return createSelectChain(record, selectResultFactory)
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        const record: UpdateRecord = { filters: [], payload, table }
        updates.push(record)
        return createUpdateChain(
          record,
          updateResults?.shift() ?? (Array.isArray(updateResult)
            ? { data: null, error: null }
            : updateResult),
        )
      }),
    })),
    rpc: vi.fn(async () => claimResult),
  }

  return { selects, supabase, updates }
}

function makeEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: "evt_test",
    type,
    data: { object },
  } as unknown as Stripe.Event
}

async function runAfterCallbacks() {
  for (const [callback] of mocks.after.mock.calls) {
    await callback()
  }
}

describe("Stripe webhook payment state transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listCheckoutSessions.mockResolvedValue({ data: [{ id: "cs_current" }] })
    mocks.sendSessionExpiredEmail.mockResolvedValue({ success: true, emailId: "email-1" })
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
      { column: "checkout_error", method: "is", value: null },
    ]))
    expect(updates[0].filters).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "or" }),
    ]))
  })

  it("expires a current session through a separate non-replacement error guard", async () => {
    const { supabase, updates } = createWebhookSupabaseMock([
      { data: null, error: null },
      { data: { id: "intake-1" }, error: null },
    ])

    await handleCheckoutSessionExpired({
      event: makeEvent("checkout.session.expired", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates).toHaveLength(2)
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { column: "checkout_error", method: "is", value: null },
    ]))
    expect(updates[1].filters).toEqual(expect.arrayContaining([
      {
        column: "checkout_error",
        method: "not",
        operator: "in",
        value:
          "(payment_session_replacement_in_progress,safety_blocked_high_stakes,safety_missing_required_information)",
      },
    ]))
    expect(updates.flatMap((record) => record.filters)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ method: "or" })]),
    )
  })

  it.each([
    "payment_session_replacement_in_progress",
    "safety_blocked_high_stakes",
    "safety_missing_required_information",
  ])("does not expire or email a pending row carrying %s", async (marker) => {
    let expiryApplied = false
    const { supabase } = createWebhookSupabaseMock(
      ({ filters }) => {
        const excludedByNullGuard = filters.some(
          (entry) =>
            entry.column === "checkout_error" &&
            entry.method === "is" &&
            entry.value === null,
        )
        const excludedByProtectedSet = filters.some(
          (entry) =>
            entry.column === "checkout_error" &&
            entry.method === "not" &&
            entry.operator === "in" &&
            typeof entry.value === "string" &&
            entry.value.includes(marker),
        )
        const queryMatches = !excludedByNullGuard && !excludedByProtectedSet
        expiryApplied ||= queryMatches
        return queryMatches
          ? { data: { id: "intake-1" }, error: null }
          : { data: null, error: null }
      },
      { data: true, error: null },
      {
        data: {
          category: "medical_certificate",
          patient: { email: "patient@example.test", full_name: "Patient" },
        },
        error: null,
      },
    )

    await handleCheckoutSessionExpired({
      event: makeEvent("checkout.session.expired", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(expiryApplied).toBe(false)
    expect(mocks.sendSessionExpiredEmail).not.toHaveBeenCalled()
  })

  it("leaves a held checkout_failed row untouched and sends no expiry email", async () => {
    let expiryApplied = false
    const heldStatus = "checkout_failed"
    const { supabase } = createWebhookSupabaseMock(
      ({ filters }) => {
        const statusFilter = filters.find(
          (entry) => entry.method === "eq" && entry.column === "status",
        )
        const matchesHeldRow = statusFilter?.value === heldStatus
        expiryApplied = matchesHeldRow
        return matchesHeldRow
          ? { data: { id: "intake-1" }, error: null }
          : { data: null, error: null }
      },
      { data: true, error: null },
      {
        data: {
          category: "medical_certificate",
          patient: { email: "patient@example.test", full_name: "Patient" },
        },
        error: null,
      },
    )

    await handleCheckoutSessionExpired({
      event: makeEvent("checkout.session.expired", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(expiryApplied).toBe(false)
    expect(mocks.sendSessionExpiredEmail).not.toHaveBeenCalled()
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

  it("keeps the expiry transition successful while surfacing an email delivery failure", async () => {
    mocks.sendSessionExpiredEmail.mockResolvedValue({
      success: false,
      error: "Provider failed",
    })
    const { supabase, updates } = createWebhookSupabaseMock(
      { data: { id: "intake-1" }, error: null },
      { data: true, error: null },
      {
        data: {
          category: "prescription",
          patient: { email: "test@instantmed.com.au", full_name: "Test Patient" },
          subtype: null,
        },
        error: null,
      },
    )

    await handleCheckoutSessionExpired({
      event: makeEvent("checkout.session.expired", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0]).toMatchObject({
      payload: { payment_status: "expired", status: "expired" },
    })
    expect(mocks.sendSessionExpiredEmail).toHaveBeenCalledWith(expect.objectContaining({
      intakeId: "intake-1",
      serviceName: "prescription",
      startUrl: expect.stringContaining("service=repeat-script"),
    }))
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Failed to send session expired email",
      { error: "Provider failed", intakeId: "intake-1" },
    )
    expect(mocks.logger.info).not.toHaveBeenCalledWith(
      "Session expired email sent",
      { intakeId: "intake-1" },
    )
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

  it.each([
    "safety_blocked_high_stakes",
    "safety_missing_required_information",
  ])("records a sync failure without replacing the %s lock", async (marker) => {
    const { supabase, updates } = createWebhookSupabaseMock([
      { data: null, error: null },
      { data: { checkout_error: marker, id: "intake-1" }, error: null },
    ])

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { code: "card_declined", decline_code: "generic_decline", message: "Sensitive bank detail" },
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates).toHaveLength(2)
    expect(updates[1]).toMatchObject({
      payload: {
        payment_status: "failed",
        status: "checkout_failed",
      },
      table: "intakes",
    })
    expect(updates[1].payload).not.toHaveProperty("checkout_error")
    expect(updates[1].payload).not.toHaveProperty("triage_reason")
    expect(updates[1].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "checkout_error", method: "in", value: [
        "safety_blocked_high_stakes",
        "safety_missing_required_information",
      ] },
    ]))
    expect(mocks.trackBusinessMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        decline_code: "generic_decline",
        failure_code: "card_declined",
        intake_id: "intake-1",
        payment_intent_id: "pi_failed",
      }),
      metric: "payment_failed",
    }))
    expect(JSON.stringify(mocks.trackBusinessMetric.mock.calls)).not.toContain("Sensitive bank detail")
    expect(after).not.toHaveBeenCalled()
  })

  it("catches a safety lock that appears between the ordinary and fallback sync updates", async () => {
    const marker = "safety_missing_required_information"
    const { supabase, updates } = createWebhookSupabaseMock([
      { data: null, error: null },
      { data: { checkout_error: marker, id: "intake-1" }, error: null },
    ])

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates[0].filters).toContainEqual(expect.objectContaining({
      method: "or",
      value: expect.stringContaining("checkout_error.is.null"),
    }))
    expect(updates[1].filters).toContainEqual({
      column: "checkout_error",
      method: "in",
      value: ["safety_blocked_high_stakes", "safety_missing_required_information"],
    })
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it("re-reads exact current failure eligibility before an ordinary sync recovery email", async () => {
    mocks.sendPaymentFailedEmail.mockResolvedValue({ success: true })
    const { selects, supabase, updates } = createWebhookSupabaseMock(
      [
        { data: { checkout_error: "Payment failed", id: "intake-1" }, error: null },
        { data: { id: "intake-1" }, error: null },
      ],
      { data: true, error: null },
      {
        data: {
          abandoned_email_sent_at: null,
          category: "medical_certificate",
          checkout_error: "Payment failed",
          guest_email: "patient@example.test",
          id: "intake-1",
          payment_id: "cs_current",
          payment_status: "failed",
          status: "checkout_failed",
          patient: null,
        },
        error: null,
      },
    )

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { code: "card_declined", decline_code: "generic_decline", message: "Card declined" },
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
    await runAfterCallbacks()

    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledTimes(1)
    expect(selects).toHaveLength(1)
    expect(selects[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "eq", value: "checkout_failed" },
      { column: "payment_status", method: "eq", value: "failed" },
      { column: "abandoned_email_sent_at", method: "is", value: null },
      { method: "or", value: "checkout_error.is.null,and(checkout_error.neq.safety_blocked_high_stakes,checkout_error.neq.safety_missing_required_information)" },
    ]))
    expect(updates[1].filters).toEqual(expect.arrayContaining([
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "abandoned_email_sent_at", method: "is", value: null },
    ]))
  })

  it("suppresses a scheduled sync recovery email when a hold wins before the read", async () => {
    const { supabase } = createWebhookSupabaseMock(
      { data: { checkout_error: "Payment failed", id: "intake-1" }, error: null },
      { data: true, error: null },
      { data: null, error: null },
    )

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { message: "Card declined" },
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(after).toHaveBeenCalledTimes(1)
    await runAfterCallbacks()
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it("fails closed when the scheduled sync recovery eligibility read errors", async () => {
    const { supabase } = createWebhookSupabaseMock(
      { data: { checkout_error: "Payment failed", id: "intake-1" }, error: null },
      { data: true, error: null },
      { data: null, error: { code: "57014", message: "database detail" } },
    )

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    await runAfterCallbacks()
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Failed to verify payment failure recovery eligibility",
      expect.objectContaining({ checkoutSessionId: "cs_current", intakeId: "intake-1" }),
    )
    expect(mocks.addToDeadLetterQueue).toHaveBeenCalledWith(
      supabase,
      "evt_test",
      "payment_intent.payment_failed",
      "cs_current",
      "intake-1",
      "Failed to verify exact-current payment failure email eligibility",
      "DB_READ_FAILED",
    )
  })

  it("keeps raw Stripe failure detail out of sync logs and analytics", async () => {
    const rawDetail = "Card 4242 belonging to Jane Doe was declined"
    const { supabase } = createWebhookSupabaseMock()

    await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        last_payment_error: { code: "card_declined", decline_code: "generic_decline", message: rawDetail },
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    const emittedLogs = JSON.stringify([
      ...mocks.logger.debug.mock.calls,
      ...mocks.logger.error.mock.calls,
      ...mocks.logger.info.mock.calls,
      ...mocks.logger.warn.mock.calls,
    ])
    expect(emittedLogs).not.toContain(rawDetail)
    expect(JSON.stringify(mocks.trackBusinessMetric.mock.calls)).not.toContain(rawDetail)
  })

  it.each([
    {
      expectedStage: "ordinary",
      updateResults: [
        { data: null, error: { code: "57014", message: "database detail" } },
      ],
    },
    {
      expectedStage: "locked_fallback",
      updateResults: [
        { data: null, error: null },
        { data: null, error: { code: "57014", message: "database detail" } },
      ],
    },
  ])("DLQs a sync $expectedStage database failure before returning 500", async ({
    expectedStage,
    updateResults,
  }) => {
    const { supabase } = createWebhookSupabaseMock(updateResults)

    const response = await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBe(500)
    expect(mocks.addToDeadLetterQueue).toHaveBeenCalledWith(
      supabase,
      "evt_test",
      "payment_intent.payment_failed",
      "cs_current",
      "intake-1",
      `Exact-current payment failure update failed at ${expectedStage}`,
      "DB_UPDATE_FAILED",
      { stage: expectedStage },
    )
    expect(mocks.trackBusinessMetric).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
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

  it("leaves a failed-payment event unclaimed when lookup fails so the next delivery can process it", async () => {
    const providerException = "provider-cardholder-detail-do-not-log"
    mocks.listCheckoutSessions
      .mockRejectedValueOnce(new Error(providerException))
      .mockResolvedValueOnce({ data: [{ id: "cs_current" }] })
    const { supabase, updates } = createWebhookSupabaseMock()
    const event = makeEvent("payment_intent.payment_failed", {
      id: "pi_failed",
      last_payment_error: { message: "Card declined" },
      metadata: { intake_id: "intake-1", patient_id: "patient-1" },
    })

    const firstResponse = await handlePaymentIntentFailed({
      event,
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((firstResponse as Response).status).toBe(500)
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
    expect(mocks.trackBusinessMetric).not.toHaveBeenCalled()
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    expect(JSON.stringify([
      ...mocks.logger.debug.mock.calls,
      ...mocks.logger.error.mock.calls,
      ...mocks.logger.info.mock.calls,
      ...mocks.logger.warn.mock.calls,
    ])).not.toContain(providerException)
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Payment failure Checkout Session resolution unavailable",
      expect.objectContaining({
        eventId: "evt_test",
        paymentIntentId: "pi_failed",
        resolution: "lookup_failed",
      }),
    )

    await handlePaymentIntentFailed({
      event,
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(updates[0]).toMatchObject({
      payload: {
        payment_status: "failed",
        status: "checkout_failed",
      },
    })
    expect(mocks.trackBusinessMetric).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
  })

  it("keeps an empty Checkout Session lookup unclaimed and retryable", async () => {
    mocks.listCheckoutSessions.mockResolvedValue({ data: [] })
    const { supabase, updates } = createWebhookSupabaseMock()

    const response = await handlePaymentIntentFailed({
      event: makeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        metadata: { intake_id: "intake-1", patient_id: "patient-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect((response as Response).status).toBeGreaterThanOrEqual(500)
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
    expect(mocks.trackBusinessMetric).not.toHaveBeenCalled()
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Payment failure Checkout Session resolution unavailable",
      expect.objectContaining({
        eventId: "evt_test",
        paymentIntentId: "pi_failed",
        resolution: "session_not_found",
      }),
    )
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

  it("schedules a Google Ads retained-value adjustment after a Stripe refund", async () => {
    const { supabase } = createWebhookSupabaseMock({
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
              created: Math.floor(Date.parse("2026-04-14T12:37:28.000Z") / 1000),
              id: "re_partial",
              status: "succeeded",
            },
          ],
        },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    for (const [callback] of mocks.after.mock.calls) {
      await callback()
    }

    expect(mocks.runGoogleAdsConversionAdjustment).toHaveBeenCalledWith({
      adjustmentDateTime: new Date("2026-04-14T12:37:28.000Z"),
      amountCents: 4995,
      intakeId: "intake-1",
      paymentStatus: "partially_refunded",
      refundAmountCents: 1995,
      requestPath: "/api/stripe/webhook",
      source: "stripe_charge_refunded",
      supabase,
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
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
  })

  it.each([
    "safety_blocked_high_stakes",
    "safety_missing_required_information",
  ])("records an async failure without replacing the %s lock", async (marker) => {
    const { supabase, updates } = createWebhookSupabaseMock([
      { data: null, error: null },
      { data: { checkout_error: marker, id: "intake-1" }, error: null },
    ])

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates).toHaveLength(2)
    expect(updates[1].payload).toMatchObject({
      payment_status: "failed",
      status: "checkout_failed",
    })
    expect(updates[1].payload).not.toHaveProperty("checkout_error")
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it("suppresses an async failure email when a hold wins before the immediate read", async () => {
    const { supabase } = createWebhookSupabaseMock(
      { data: { checkout_error: "Asynchronous payment failed", id: "intake-1" }, error: null },
      { data: true, error: null },
      { data: null, error: null },
    )

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it("sends an ordinary async failure email only after an exact-current read", async () => {
    mocks.sendPaymentFailedEmail.mockResolvedValue({ success: true })
    const { selects, supabase, updates } = createWebhookSupabaseMock(
      [
        { data: { checkout_error: "Asynchronous payment failed", id: "intake-1" }, error: null },
        { data: { id: "intake-1" }, error: null },
      ],
      { data: true, error: null },
      {
        data: {
          abandoned_email_sent_at: null,
          category: "medical_certificate",
          checkout_error: "Asynchronous payment failed",
          guest_email: "patient@example.test",
          id: "intake-1",
          payment_id: "cs_current",
          payment_status: "failed",
          status: "checkout_failed",
          patient: null,
        },
        error: null,
      },
    )

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledTimes(1)
    expect(selects[0].filters).toEqual(expect.arrayContaining([
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "abandoned_email_sent_at", method: "is", value: null },
      { method: "or", value: "checkout_error.is.null,and(checkout_error.neq.safety_blocked_high_stakes,checkout_error.neq.safety_missing_required_information)" },
    ]))
    expect(updates[1].filters).toEqual(expect.arrayContaining([
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "abandoned_email_sent_at", method: "is", value: null },
    ]))
  })

  it.each([
    ["payment_intent.payment_failed", "Sent payment failure notification"],
    ["checkout.session.async_payment_failed", "Payment failed email sent"],
  ])("does not emit a clean sent log when the guarded nudge mark loses for %s", async (
    eventType,
    cleanLogMessage,
  ) => {
    mocks.sendPaymentFailedEmail.mockResolvedValue({ success: true })
    const { supabase } = createWebhookSupabaseMock(
      [
        { data: { checkout_error: "Payment failed", id: "intake-1" }, error: null },
        { data: null, error: null },
      ],
      { data: true, error: null },
      {
        data: {
          abandoned_email_sent_at: null,
          category: "medical_certificate",
          checkout_error: "Payment failed",
          guest_email: "patient@example.test",
          id: "intake-1",
          payment_id: "cs_current",
          payment_status: "failed",
          status: "checkout_failed",
          patient: null,
        },
        error: null,
      },
    )

    if (eventType === "payment_intent.payment_failed") {
      await handlePaymentIntentFailed({
        event: makeEvent(eventType, {
          id: "pi_failed",
          metadata: { intake_id: "intake-1" },
        }),
        startTime: Date.now(),
        supabase: supabase as never,
      })
      await runAfterCallbacks()
    } else {
      await handleAsyncPaymentFailed({
        event: makeEvent(eventType, {
          id: "cs_current",
          metadata: { intake_id: "intake-1" },
        }),
        startTime: Date.now(),
        supabase: supabase as never,
      })
    }

    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledOnce()
    expect(mocks.logger.info.mock.calls.some(([message]) => message === cleanLogMessage)).toBe(false)
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("nudge state changed before marking"),
      expect.objectContaining({ intakeId: "intake-1" }),
    )
  })

  it("fails closed and DLQs when the async recovery eligibility read errors", async () => {
    const { supabase } = createWebhookSupabaseMock(
      { data: { checkout_error: "Asynchronous payment failed", id: "intake-1" }, error: null },
      { data: true, error: null },
      { data: null, error: { code: "57014", message: "database detail" } },
    )

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
    expect(mocks.addToDeadLetterQueue).toHaveBeenCalledWith(
      supabase,
      "evt_test",
      "checkout.session.async_payment_failed",
      "cs_current",
      "intake-1",
      "Failed to verify exact-current async payment failure email eligibility",
      "DB_READ_FAILED",
    )
  })

  it.each([
    {
      expectedStage: "ordinary",
      updateResults: [
        { data: null, error: { code: "57014", message: "database detail" } },
      ],
    },
    {
      expectedStage: "locked_fallback",
      updateResults: [
        { data: null, error: null },
        { data: null, error: { code: "57014", message: "database detail" } },
      ],
    },
  ])("DLQs an async $expectedStage database failure", async ({
    expectedStage,
    updateResults,
  }) => {
    const { supabase } = createWebhookSupabaseMock(updateResults)

    await handleAsyncPaymentFailed({
      event: makeEvent("checkout.session.async_payment_failed", {
        id: "cs_current",
        metadata: { intake_id: "intake-1" },
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(mocks.addToDeadLetterQueue).toHaveBeenCalledWith(
      supabase,
      "evt_test",
      "checkout.session.async_payment_failed",
      "cs_current",
      "intake-1",
      `Exact-current async payment failure update failed at ${expectedStage}`,
      "DB_UPDATE_FAILED",
      { stage: expectedStage },
    )
    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled()
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

    expect(supabase.from).toHaveBeenCalledTimes(2)
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
  // but referral credits apply as a Stripe coupon and the Priority fee adds a line
  // item, so the true charge (session.amount_total) differs. Storing the list
  // price made manual refunds exceed the charge for coupon customers ("Refund
  // amount > charge amount") and under-refund Priority customers by $9.95. The
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

    // Priority add-on: base price + $9.95 priority fee -> customer charged $29.90.
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
