import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  completeConfirmedPaymentWork: vi.fn(),
  generateDraftsForIntake: vi.fn(),
  getPostHogClient: vi.fn(() => ({
    alias: vi.fn(),
    capture: vi.fn(),
  })),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  notifyPaymentReceived: vi.fn(),
  sendPaidRequestTelegramNotification: vi.fn(),
  startPostPaymentReviewWork: vi.fn(),
  trackIntakeFunnelStep: vi.fn(),
}))

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server")
  return {
    ...actual,
    after: vi.fn((task: () => unknown) => task),
  }
})

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: mocks.addBreadcrumb,
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/app/actions/generate-drafts", () => ({
  generateDraftsForIntake: mocks.generateDraftsForIntake,
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  getPostHogClient: mocks.getPostHogClient,
  trackIntakeFunnelStep: mocks.trackIntakeFunnelStep,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/email/components/templates/request-received", () => ({
  RequestReceivedEmail: () => null,
  requestReceivedSubject: () => "Request received",
}))

vi.mock("@/lib/notifications/paid-request-telegram", () => ({
  sendPaidRequestTelegramNotification: mocks.sendPaidRequestTelegramNotification,
}))

vi.mock("@/lib/notifications/service", () => ({
  notifyPaymentReceived: mocks.notifyPaymentReceived,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/stripe/post-payment", () => ({
  startPostPaymentReviewWork: mocks.startPostPaymentReviewWork,
}))

vi.mock("@/lib/stripe/confirmed-payment-finalization", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/stripe/confirmed-payment-finalization")
  >("@/lib/stripe/confirmed-payment-finalization")

  return {
    ...actual,
    completeConfirmedPaymentWork: mocks.completeConfirmedPaymentWork,
  }
})

import { handleAsyncPaymentSucceeded } from "@/app/api/stripe/webhook/handlers/checkout-session-async-payment-succeeded"
import { handleCheckoutSessionCompleted } from "@/app/api/stripe/webhook/handlers/checkout-session-completed"

type IntakeState = {
  checkout_error?: string | null
  id: string
  payment_id?: string | null
  payment_status: string
  status: string
  triage_reason?: string | null
  triage_result?: string | null
}

function makeEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    type,
    data: { object },
  } as unknown as Stripe.Event
}

function createSupabaseMock(intake: IntakeState) {
  const updates: Array<{ filters: Array<{ column: string; method: string; value: unknown }>; payload: Record<string, unknown> }> = []
  const deadLetters: Array<Record<string, unknown>> = []
  const updateResults: Array<{ data: Array<{ id: string; status: string }> | { id: string; status: string } | null; error: { code?: string; message: string } | null }> = []

  function makeUpdateChain(payload: Record<string, unknown>) {
    const record = { filters: [] as Array<{ column: string; method: string; value: unknown }>, payload }
    updates.push(record)

    const result = updateResults.shift() ?? {
      data: {
        id: intake.id,
        payment_id: intake.payment_id,
        payment_status: "paid",
        status: "paid",
      },
      error: null,
    }
    const chain = {
      eq: vi.fn((column: string, value: unknown) => {
        record.filters.push({ column, method: "eq", value })
        return chain
      }),
      in: vi.fn((column: string, value: unknown) => {
        record.filters.push({ column, method: "in", value })
        return chain
      }),
      neq: vi.fn((column: string, value: unknown) => {
        record.filters.push({ column, method: "neq", value })
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

  function makeIntakeSelectChain(selected?: string) {
    const chain = {
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({
        data:
          selected?.includes("payment_status") || selected?.includes("payment_id")
            ? intake
            : null,
        error: null,
      })),
      single: vi.fn(async () => ({ data: intake, error: null })),
    }
    return chain
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn((selected?: string) => makeIntakeSelectChain(selected)),
          update: vi.fn((payload: Record<string, unknown>) => makeUpdateChain(payload)),
        }
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(async () => ({ error: null })),
            })),
          })),
        }
      }

      if (table === "stripe_webhook_events") {
        return {
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        }
      }

      if (table === "stripe_webhook_dead_letter") {
        return {
          insert: vi.fn(async (payload: Record<string, unknown>) => {
            deadLetters.push(payload)
            return { error: null }
          }),
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              is: vi.fn(async () => ({ count: 0, error: null })),
            })),
          })),
        }
      }

      return {
        from: vi.fn(),
        insert: vi.fn(async () => ({ data: null, error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
        upsert: vi.fn(async () => ({ error: null })),
      }
    }),
    rpc: vi.fn(async () => ({ data: true, error: null })),
  }

  return { deadLetters, supabase, updates, updateResults }
}

describe("Stripe paid-state webhook guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateDraftsForIntake.mockResolvedValue({ success: true })
    mocks.completeConfirmedPaymentWork.mockResolvedValue(undefined)
    mocks.startPostPaymentReviewWork.mockResolvedValue(undefined)
  })

  it("does not resurrect a cancelled intake from checkout.session.completed", async () => {
    const intakeId = "11111111-1111-4111-8111-111111111111"
    const { supabase, updates } = createSupabaseMock({
      id: intakeId,
      payment_id: "cs_current",
      payment_status: "pending",
      status: "cancelled",
    })

    await handleCheckoutSessionCompleted({
      event: makeEvent("checkout.session.completed", {
        amount_total: 1995,
        customer: "cus_test",
        id: "cs_current",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_paid",
        payment_status: "paid",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates).not.toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        payment_status: "paid",
        status: "paid",
      }),
    }))
    expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
  })

  it.each([
    ["checkout.session.completed", "safety_blocked_high_stakes"],
    ["checkout.session.completed", "safety_missing_required_information"],
    ["checkout.session.async_payment_succeeded", "safety_blocked_high_stakes"],
    ["checkout.session.async_payment_succeeded", "safety_missing_required_information"],
  ])("settles exact-current %s from %s without overwriting triage", async (eventType, marker) => {
    const intakeId = "55555555-5555-4555-8555-555555555555"
    const { supabase, updates } = createSupabaseMock({
      checkout_error: marker,
      id: intakeId,
      payment_id: "cs_current",
      payment_status: "failed",
      status: "checkout_failed",
      triage_reason: "Persist this clinical context",
      triage_result: "request_more_info",
    })
    const session = {
      amount_total: 1995,
      customer: "cus_test",
      id: "cs_current",
      metadata: {
        category: "medical_certificate",
        intake_id: intakeId,
        patient_id: "patient-1",
        service_slug: "med-cert-sick",
      },
      payment_intent: "pi_paid",
      payment_status: "paid",
    }

    if (eventType === "checkout.session.completed") {
      await handleCheckoutSessionCompleted({
        event: makeEvent(eventType, session),
        startTime: Date.now(),
        supabase: supabase as never,
      })
    } else {
      await handleAsyncPaymentSucceeded({
        event: makeEvent(eventType, session),
        startTime: Date.now(),
        supabase: supabase as never,
      })
    }

    const paidUpdate = updates.find(({ payload }) => payload.payment_status === "paid")
    expect(paidUpdate).toBeDefined()
    expect(paidUpdate?.payload).toMatchObject({
      checkout_error: null,
      payment_status: "paid",
      status: "paid",
    })
    expect(paidUpdate?.payload).not.toHaveProperty("triage_result")
    expect(paidUpdate?.payload).not.toHaveProperty("triage_reason")
    expect(paidUpdate?.filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: intakeId },
      { column: "payment_id", method: "eq", value: "cs_current" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
  })

  it.each([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ])("heals idempotent completion work when Stripe redelivers claimed %s", async (eventType) => {
    const intakeId = "66666666-6666-4666-8666-666666666666"
    const { supabase } = createSupabaseMock({
      id: intakeId,
      payment_id: "cs_current",
      payment_status: "paid",
      status: "paid",
    })
    supabase.rpc.mockResolvedValueOnce({ data: false, error: null })
    const session = {
      amount_total: 2995,
      customer: "cus_test",
      id: "cs_current",
      metadata: {
        category: "medical_certificate",
        intake_id: intakeId,
        patient_id: "patient-1",
        service_slug: "med-cert-sick",
      },
      payment_intent: "pi_paid",
      payment_status: "paid",
    }

    if (eventType === "checkout.session.completed") {
      await handleCheckoutSessionCompleted({
        event: makeEvent(eventType, session),
        startTime: Date.now(),
        supabase: supabase as never,
      })
    } else {
      await handleAsyncPaymentSucceeded({
        event: makeEvent(eventType, session),
        startTime: Date.now(),
        supabase: supabase as never,
      })
    }

    expect(mocks.completeConfirmedPaymentWork).toHaveBeenCalledWith(
      expect.objectContaining({
        finalizationKind: "already_paid",
        intakeId,
        session,
      }),
    )
  })

  it("sends stale completed checkout sessions to the webhook DLQ", async () => {
    const intakeId = "33333333-3333-4333-8333-333333333333"
    const { deadLetters, supabase, updates } = createSupabaseMock({
      id: intakeId,
      payment_id: "cs_newer",
      payment_status: "pending",
      status: "pending_payment",
    })

    const response = await handleCheckoutSessionCompleted({
      event: makeEvent("checkout.session.completed", {
        amount_total: 1995,
        customer: "cus_test",
        id: "cs_old",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_old",
        payment_status: "paid",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    await expect((response as Response).json()).resolves.toMatchObject({
      dlq: true,
      reason: "stale_checkout_session",
      skipped: true,
    })
    expect(updates).not.toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        payment_status: "paid",
        status: "paid",
      }),
    }))
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "STALE_PAYMENT_SUCCESS",
      intake_id: intakeId,
      session_id: "cs_old",
    }))
  })

  it("does not treat a zero-row force update as concurrent success unless the intake is paid", async () => {
    const intakeId = "44444444-4444-4444-8444-444444444444"
    const { deadLetters, supabase, updateResults } = createSupabaseMock({
      id: intakeId,
      payment_id: "cs_current",
      payment_status: "pending",
      status: "pending_payment",
    })
    updateResults.push({ data: null, error: null })

    const response = await handleCheckoutSessionCompleted({
      event: makeEvent("checkout.session.completed", {
        amount_total: 1995,
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

    await expect((response as Response).json()).resolves.toMatchObject({
      dlq: true,
      reason: "zero_row_payment_update",
      skipped: true,
    })
    expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "ZERO_ROW_PAYMENT_UPDATE",
      intake_id: intakeId,
      session_id: "cs_current",
    }))
  })

  it("does not mark async payment succeeded when the checkout session is stale", async () => {
    const intakeId = "22222222-2222-4222-8222-222222222222"
    const { deadLetters, supabase, updates } = createSupabaseMock({
      id: intakeId,
      payment_id: "cs_newer",
      payment_status: "pending",
      status: "pending_payment",
    })

    await handleAsyncPaymentSucceeded({
      event: makeEvent("checkout.session.async_payment_succeeded", {
        amount_total: 1995,
        customer: "cus_test",
        id: "cs_old",
        metadata: {
          category: "medical_certificate",
          intake_id: intakeId,
          patient_id: "patient-1",
          service_slug: "med-cert-sick",
        },
        payment_intent: "pi_old",
        payment_status: "paid",
      }),
      startTime: Date.now(),
      supabase: supabase as never,
    })

    expect(updates).not.toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        payment_status: "paid",
        status: "paid",
      }),
    }))
    expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
    expect(deadLetters).toContainEqual(expect.objectContaining({
      error_code: "stale_async_payment_success",
      intake_id: intakeId,
      session_id: "cs_old",
    }))
  })
})
