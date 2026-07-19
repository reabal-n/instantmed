import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  captureException: vi.fn(),
  completeConfirmedPaymentWork: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getApiAuth: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  retrieveCheckoutSession: vi.fn(),
  startPostPaymentReviewWork: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: mocks.applyRateLimit,
}))

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: mocks.retrieveCheckoutSession,
      },
    },
  },
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

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}))

import { POST } from "@/app/api/stripe/verify-payment/route"

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/stripe/verify-payment", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function setupSupabase(overrides: {
  intake?: Record<string, unknown>
  updateResult?: { data: { id: string } | null; error: null }
} = {}) {
  const updates: Record<string, unknown>[] = []
  const intake = overrides.intake ?? {
    id: "intake-1",
    amount_cents: 1995,
    payment_id: "cs_stored",
    payment_status: "pending",
    status: "pending_payment",
  }
  const updateResult = overrides.updateResult ?? { data: { id: "intake-1" }, error: null }

  const intakeSelect = {
    eq: vi.fn(() => intakeSelect),
    maybeSingle: vi.fn(async () => ({ data: intake, error: null })),
    single: vi.fn(async () => ({ data: intake, error: null })),
  }
  const intakeUpdate = {
    eq: vi.fn(() => intakeUpdate),
    in: vi.fn(() => intakeUpdate),
    select: vi.fn(() => intakeUpdate),
    maybeSingle: vi.fn(async () => updateResult),
    then: (resolve: (value: typeof updateResult) => void) => Promise.resolve(updateResult).then(resolve),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          select: vi.fn(() => intakeSelect),
          update: vi.fn((payload: Record<string, unknown>) => {
            updates.push(payload)
            return intakeUpdate
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  mocks.createServiceRoleClient.mockReturnValue(supabase)
  return { intakeUpdate, updates }
}

describe("POST /api/stripe/verify-payment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.getApiAuth.mockResolvedValue({
      userId: "auth-user-1",
      profile: { id: "profile-1", role: "patient" },
    })
    mocks.completeConfirmedPaymentWork.mockResolvedValue(undefined)
    mocks.startPostPaymentReviewWork.mockResolvedValue(undefined)
  })

  it("rejects a paid Stripe session when metadata points at a different intake", async () => {
    const { updates } = setupSupabase()
    mocks.retrieveCheckoutSession.mockResolvedValue({
      id: "cs_other_paid",
      customer: "cus_test",
      metadata: { intake_id: "other-intake" },
      payment_intent: "pi_other",
      payment_status: "paid",
    })

    const response = await POST(makeRequest({
      intakeId: "intake-1",
      sessionId: "cs_other_paid",
    }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      error: "Payment session does not match this request",
      status: "pending_payment",
      success: false,
    })
    expect(updates).toHaveLength(0)
    expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
  })

  it("marks an owned intake paid when the paid Stripe session metadata matches", async () => {
    const { intakeUpdate, updates } = setupSupabase()
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2995,
      id: "cs_stored",
      customer: "cus_test",
      metadata: { intake_id: "intake-1" },
      payment_intent: "pi_paid",
      payment_status: "paid",
    })

    const response = await POST(makeRequest({
      intakeId: "intake-1",
      sessionId: "cs_stored",
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      fallback_applied: true,
      status: "paid",
      success: true,
    })
    expect(updates[0]).toMatchObject({
      amount_cents: 2995,
      checkout_error: null,
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: "pi_paid",
      stripe_customer_id: "cus_test",
    })
    expect(intakeUpdate.in).toHaveBeenCalledWith("payment_status", ["pending", "unpaid", "failed"])
    expect(mocks.completeConfirmedPaymentWork).toHaveBeenCalledWith(expect.objectContaining({
      finalizationKind: "settled",
      intakeId: "intake-1",
      supabase: expect.any(Object),
    }))
  })

  it("settles a paid retry session after a previous failed payment attempt", async () => {
    const { intakeUpdate, updates } = setupSupabase({
      intake: {
        id: "intake-1",
        amount_cents: 1995,
        payment_id: "cs_retry",
        payment_status: "failed",
        status: "checkout_failed",
      },
    })
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2995,
      id: "cs_retry",
      customer: "cus_test",
      metadata: { intake_id: "intake-1" },
      payment_intent: "pi_retry_paid",
      payment_status: "paid",
    })

    const response = await POST(makeRequest({
      intakeId: "intake-1",
      sessionId: "cs_retry",
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      fallback_applied: true,
      status: "paid",
      success: true,
    })
    expect(updates[0]).toMatchObject({
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: "pi_retry_paid",
    })
    expect(intakeUpdate.in).toHaveBeenCalledWith("payment_status", ["pending", "unpaid", "failed"])
  })

  it("does not report fallback success when the guarded paid update matches no rows", async () => {
    setupSupabase({
      updateResult: { data: null, error: null },
    })
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2995,
      id: "cs_stored",
      customer: "cus_test",
      metadata: { intake_id: "intake-1" },
      payment_intent: "pi_paid",
      payment_status: "paid",
    })

    const response = await POST(makeRequest({
      intakeId: "intake-1",
      sessionId: "cs_stored",
    }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      error: "Payment session is no longer current",
      status: "pending_payment",
      success: false,
    })
    expect(mocks.completeConfirmedPaymentWork).not.toHaveBeenCalled()
  })

  it("does not resurrect a cancelled intake during fallback verification", async () => {
    const { updates } = setupSupabase({
      intake: {
        id: "intake-1",
        amount_cents: 1995,
        payment_id: "cs_stored",
        payment_status: "pending",
        status: "cancelled",
      },
    })
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2995,
      id: "cs_stored",
      customer: "cus_test",
      metadata: { intake_id: "intake-1" },
      payment_intent: "pi_paid",
      payment_status: "paid",
    })

    const response = await POST(makeRequest({
      intakeId: "intake-1",
      sessionId: "cs_stored",
    }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      error: "This request is not awaiting payment",
      status: "cancelled",
      success: false,
    })
    expect(updates).toHaveLength(0)
    expect(mocks.completeConfirmedPaymentWork).not.toHaveBeenCalled()
  })
})
