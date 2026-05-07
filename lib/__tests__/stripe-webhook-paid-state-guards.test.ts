import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
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

vi.mock("@/lib/email/template-sender", () => ({
  sendGuestCompleteAccountEmail: vi.fn(),
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

import { handleAsyncPaymentSucceeded } from "@/app/api/stripe/webhook/handlers/checkout-session-async-payment-succeeded"
import { handleCheckoutSessionCompleted } from "@/app/api/stripe/webhook/handlers/checkout-session-completed"

type IntakeState = {
  id: string
  payment_id?: string | null
  payment_status: string
  status: string
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

  function makeUpdateChain(payload: Record<string, unknown>) {
    const record = { filters: [] as Array<{ column: string; method: string; value: unknown }>, payload }
    updates.push(record)

    const result = { data: [{ id: intake.id, status: "paid" }], error: null }
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
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: intake.id, status: "paid" }, error: null })),
      })),
      then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
    }
    return chain
  }

  function makeIntakeSelectChain() {
    const chain = {
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => ({ data: intake, error: null })),
    }
    return chain
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn(() => makeIntakeSelectChain()),
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
          insert: vi.fn(async () => ({ error: null })),
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

  return { supabase, updates }
}

describe("Stripe paid-state webhook guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateDraftsForIntake.mockResolvedValue({ success: true })
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

  it("does not mark async payment succeeded when the checkout session is stale", async () => {
    const intakeId = "22222222-2222-4222-8222-222222222222"
    const { supabase, updates } = createSupabaseMock({
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
})
