import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const SESSION_ID = "cs_test_current"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  captureException: vi.fn(),
  completeConfirmedPaymentWork: vi.fn(),
  createServiceRoleClient: vi.fn(),
  finalizeConfirmedCheckoutPayment: vi.fn(),
  generateDraftsForIntake: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  retrieveCheckoutSession: vi.fn(),
  startPostPaymentReviewWork: vi.fn(),
}))

vi.mock("@/app/actions/generate-drafts", () => ({
  generateDraftsForIntake: mocks.generateDraftsForIntake,
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

  mocks.finalizeConfirmedCheckoutPayment.mockImplementation(
    actual.finalizeConfirmedCheckoutPayment,
  )

  return {
    ...actual,
    completeConfirmedPaymentWork: mocks.completeConfirmedPaymentWork,
    finalizeConfirmedCheckoutPayment: mocks.finalizeConfirmedCheckoutPayment,
  }
})

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}))

import { POST } from "@/app/api/stripe/reconcile-guest-payment/route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/stripe/reconcile-guest-payment", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function setupSupabase(overrides: {
  intake?: Record<string, unknown> | null
  updateResult?: { data: Record<string, unknown> | null; error: null }
} = {}) {
  const updates: Record<string, unknown>[] = []
  const intake = overrides.intake === undefined
    ? {
        id: INTAKE_ID,
        category: "medical_certificate",
        patient_id: "profile-1",
        payment_id: SESSION_ID,
        payment_status: "pending",
        status: "pending_payment",
      }
    : overrides.intake
  const updateResult = overrides.updateResult ?? {
    data: {
      ...intake,
      amount_cents: 2_495,
      payment_status: "paid",
      status: "paid",
    },
    error: null,
  }

  const intakeSelect = {
    eq: vi.fn(() => intakeSelect),
    maybeSingle: vi.fn(async () => ({ data: intake, error: null })),
  }
  const intakeUpdate = {
    eq: vi.fn(() => intakeUpdate),
    in: vi.fn(() => intakeUpdate),
    select: vi.fn(() => intakeUpdate),
    maybeSingle: vi.fn(async () => updateResult),
  }
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "intakes") throw new Error(`Unexpected table ${table}`)
      return {
        select: vi.fn(() => intakeSelect),
        update: vi.fn((payload: Record<string, unknown>) => {
          updates.push(payload)
          return intakeUpdate
        }),
      }
    }),
  }

  mocks.createServiceRoleClient.mockReturnValue(supabase)
  return { intakeUpdate, updates }
}

describe("POST /api/stripe/reconcile-guest-payment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.completeConfirmedPaymentWork.mockResolvedValue(undefined)
    mocks.startPostPaymentReviewWork.mockResolvedValue(undefined)
  })

  it("applies the sensitive rate limit before reading the payment capability", async () => {
    mocks.applyRateLimit.mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    )

    const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: SESSION_ID }))

    expect(response.status).toBe(429)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("rejects malformed identifiers before querying storage", async () => {
    const response = await POST(makeRequest({ intakeId: "not-an-id", sessionId: "nope" }))

    expect(response.status).toBe(400)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("rejects malformed JSON without reporting an internal failure", async () => {
    const request = new NextRequest("http://localhost/api/stripe/reconcile-guest-payment", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mocks.captureException).not.toHaveBeenCalled()
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it.each([null, [], { intakeId: {}, sessionId: [] }])(
    "rejects invalid JSON body %j without reporting an internal failure",
    async (body) => {
      const response = await POST(makeRequest(body))

      expect(response.status).toBe(400)
      expect(mocks.captureException).not.toHaveBeenCalled()
      expect(mocks.logger.error).not.toHaveBeenCalled()
      expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    },
  )

  it("does not retrieve Stripe when the supplied Session is not current", async () => {
    setupSupabase()

    const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: "cs_test_stale" }))

    expect(response.status).toBe(409)
    expect(mocks.retrieveCheckoutSession).not.toHaveBeenCalled()
  })

  it("settles the exact-current paid Session and starts common post-payment work", async () => {
    const { intakeUpdate, updates } = setupSupabase()
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2_495,
      customer: "cus_guest",
      id: SESSION_ID,
      metadata: { intake_id: INTAKE_ID },
      payment_intent: "pi_guest_paid",
      payment_status: "paid",
    })

    const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: SESSION_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ fallback_applied: true, status: "paid", success: true })
    expect(updates[0]).toMatchObject({
      amount_cents: 2_495,
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: "pi_guest_paid",
    })
    expect(intakeUpdate.eq).toHaveBeenCalledWith("payment_id", SESSION_ID)
    expect(mocks.completeConfirmedPaymentWork).toHaveBeenCalledWith(expect.objectContaining({
      finalizationKind: "settled",
      intakeId: INTAKE_ID,
      patientId: "profile-1",
      requestPath: "/api/stripe/reconcile-guest-payment",
    }))
  })

  it("rejects paid Stripe data whose metadata names another request", async () => {
    const { updates } = setupSupabase()
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2_495,
      id: SESSION_ID,
      metadata: { intake_id: "22222222-2222-4222-8222-222222222222" },
      payment_status: "paid",
    })

    const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: SESSION_ID }))

    expect(response.status).toBe(409)
    expect(updates).toHaveLength(0)
    expect(mocks.completeConfirmedPaymentWork).not.toHaveBeenCalled()
  })

  it("keeps an unpaid Session in processing without changing the request", async () => {
    const { updates } = setupSupabase()
    mocks.retrieveCheckoutSession.mockResolvedValue({
      amount_total: 2_495,
      id: SESSION_ID,
      metadata: { intake_id: INTAKE_ID },
      payment_status: "unpaid",
      status: "complete",
    })

    const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: SESSION_ID }))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ success: false, status: "processing" })
    expect(updates).toHaveLength(0)
  })

  it("accepts an exact request already settled by the webhook without racing completion work", async () => {
    setupSupabase({
      intake: {
        id: INTAKE_ID,
        category: "medical_certificate",
        patient_id: "profile-1",
        payment_id: SESSION_ID,
        payment_status: "paid",
        status: "paid",
      },
    })

    const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: SESSION_ID }))

    expect(response.status).toBe(200)
    expect(mocks.retrieveCheckoutSession).not.toHaveBeenCalled()
    expect(mocks.finalizeConfirmedCheckoutPayment).not.toHaveBeenCalled()
    expect(mocks.completeConfirmedPaymentWork).not.toHaveBeenCalled()
    expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
    expect(mocks.generateDraftsForIntake).not.toHaveBeenCalled()
  })

  it.each(["refunded", "partially_refunded", "disputed"])(
    "accepts an exact-current %s request without restarting payment or draft work",
    async (paymentStatus) => {
      setupSupabase({
        intake: {
          id: INTAKE_ID,
          category: "medical_certificate",
          patient_id: "profile-1",
          payment_id: SESSION_ID,
          payment_status: paymentStatus,
          status: paymentStatus === "refunded" ? "declined" : "in_review",
        },
      })

      const response = await POST(makeRequest({ intakeId: INTAKE_ID, sessionId: SESSION_ID }))

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        already_paid: true,
        status: "paid",
        success: true,
      })
      expect(mocks.retrieveCheckoutSession).not.toHaveBeenCalled()
      expect(mocks.finalizeConfirmedCheckoutPayment).not.toHaveBeenCalled()
      expect(mocks.completeConfirmedPaymentWork).not.toHaveBeenCalled()
      expect(mocks.startPostPaymentReviewWork).not.toHaveBeenCalled()
      expect(mocks.generateDraftsForIntake).not.toHaveBeenCalled()
    },
  )
})
