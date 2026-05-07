import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  auth: vi.fn(),
  captureException: vi.fn(),
  createServiceRoleClient: vi.fn(),
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
  auth: mocks.auth,
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
  profile?: Record<string, unknown>
} = {}) {
  const updates: Record<string, unknown>[] = []
  const profile = overrides.profile ?? { id: "profile-1" }
  const intake = overrides.intake ?? {
    id: "intake-1",
    amount_cents: 1995,
    payment_id: "cs_stored",
    payment_status: "pending",
    status: "pending_payment",
  }

  const profileSelect = {
    eq: vi.fn(() => profileSelect),
    single: vi.fn(async () => ({ data: profile, error: null })),
  }
  const intakeSelect = {
    eq: vi.fn(() => intakeSelect),
    single: vi.fn(async () => ({ data: intake, error: null })),
  }
  const intakeUpdate = {
    eq: vi.fn(() => intakeUpdate),
    in: vi.fn(() => intakeUpdate),
    then: (resolve: (value: { error: null }) => void) => Promise.resolve({ error: null }).then(resolve),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => profileSelect),
        }
      }

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
    mocks.auth.mockResolvedValue({ userId: "auth-user-1" })
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
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: "pi_paid",
      stripe_customer_id: "cus_test",
    })
    expect(intakeUpdate.in).toHaveBeenCalledWith("payment_status", ["pending", "unpaid", "failed"])
    expect(mocks.startPostPaymentReviewWork).toHaveBeenCalledWith(expect.objectContaining({
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
    expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
  })
})
