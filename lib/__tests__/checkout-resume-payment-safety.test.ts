import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getAppUrl: vi.fn(),
  getOptionalStripePriceEnv: vi.fn(),
  getPriceIdForRequest: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  recordSafetyEvaluationForOperators: vi.fn(),
  redirect: vi.fn(),
  stripeSessionCreate: vi.fn(),
  stripeSessionExpire: vi.fn(),
  stripeSessionRetrieve: vi.fn(),
  verifyCheckoutResumeToken: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: mocks.getAppUrl,
}))

vi.mock("@/lib/crypto/checkout-resume-token", () => ({
  verifyCheckoutResumeToken: mocks.verifyCheckoutResumeToken,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: mocks.recordSafetyEvaluationForOperators,
}))

vi.mock("@/lib/stripe/checkout-recovery-link", () => ({
  buildGuestCheckoutCancelUrl: ({ intakeId }: { intakeId: string }) =>
    `https://instantmed.example/checkout/cancelled?intake_id=${intakeId}`,
}))

vi.mock("@/lib/stripe/client", () => ({
  getOptionalStripePriceEnv: mocks.getOptionalStripePriceEnv,
  getPriceIdForRequest: mocks.getPriceIdForRequest,
  stripe: {
    checkout: {
      sessions: {
        create: mocks.stripeSessionCreate,
        expire: mocks.stripeSessionExpire,
        retrieve: mocks.stripeSessionRetrieve,
      },
    },
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import CheckoutResumePage from "@/app/resume/[token]/page"

interface UpdateRecord {
  filters: Array<{
    column: string
    method: "eq" | "in" | "is"
    value: unknown
  }>
  payload: Record<string, unknown>
}

type ResumeIntake = {
  answers: Array<{ answers: Record<string, unknown> }>
  category: string | null
  guest_email: string | null
  id: string
  is_priority: boolean | null
  payment_id: string | null
  payment_status: string | null
  service: { slug: string; type: string } | null
  status: string | null
  stripe_price_id: string | null
  subtype: string | null
}

function createResumeSupabaseMock(
  intakeOverrides: Partial<ResumeIntake> = {},
  options: {
    refetchedIntakes?: Array<Partial<ResumeIntake>>
    updateResults?: Array<{
      data: Array<{ id: string; payment_id?: string | null }> | null
      error: { message: string } | null
    }>
  } = {},
) {
  const intake: ResumeIntake = {
    answers: [{ answers: { symptomDetails: "Need to defer my exam" } }],
    category: "medical_certificate",
    guest_email: "patient@example.test",
    id: "intake-1",
    is_priority: false,
    payment_id: "cs_previous",
    payment_status: "pending",
    service: { slug: "med-cert-sick", type: "medical_certificate" },
    status: "pending_payment",
    stripe_price_id: "price_med_cert",
    subtype: "work",
    ...intakeOverrides,
  }
  const updateRecords: UpdateRecord[] = []
  const selectResults = [
    intake,
    ...(options.refetchedIntakes || []).map((overrides) => ({ ...intake, ...overrides })),
  ]
  let selectIndex = 0

  const nextSelectResult = () => ({
    data: selectResults[Math.min(selectIndex++, selectResults.length - 1)],
    error: null,
  })

  const selectChain = {
    eq: vi.fn(() => selectChain),
    maybeSingle: vi.fn(async () => nextSelectResult()),
    single: vi.fn(async () => nextSelectResult()),
  }

  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn((payload: Record<string, unknown>) => {
        const record: UpdateRecord = { filters: [], payload }
        updateRecords.push(record)
        const updateChain = {
          eq: vi.fn((column: string, value: unknown) => {
            record.filters.push({ column, method: "eq", value })
            return updateChain
          }),
          in: vi.fn((column: string, value: unknown) => {
            record.filters.push({ column, method: "in", value })
            return updateChain
          }),
          is: vi.fn((column: string, value: unknown) => {
            record.filters.push({ column, method: "is", value })
            return updateChain
          }),
          select: vi.fn(async () => options.updateResults?.shift() || {
            data: [{ id: intake.id, payment_id: intake.payment_id }],
            error: null,
          }),
        }
        return updateChain
      }),
    })),
  }

  return { intake, supabase, updateRecords }
}

async function expectPageRedirect(url: string) {
  await expect(CheckoutResumePage({ params: Promise.resolve({ token: "signed-token" }) }))
    .rejects.toMatchObject({ redirectUrl: url })
}

describe("signed guest checkout resume payment safety", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAppUrl.mockReturnValue("https://instantmed.example")
    mocks.getOptionalStripePriceEnv.mockReturnValue(null)
    mocks.getPriceIdForRequest.mockReturnValue("price_med_cert")
    mocks.redirect.mockImplementation((url: string) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { redirectUrl: url })
    })
    mocks.stripeSessionCreate.mockResolvedValue({
      id: "cs_resumed",
      url: "https://checkout.stripe.test/pay/cs_resumed",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_previous" })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })
    mocks.verifyCheckoutResumeToken.mockReturnValue({ intakeId: "intake-1" })
  })

  it("blocks a persisted high-stakes medical certificate before returning its live Stripe URL", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    await expectPageRedirect("/medical-certificate")

    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      status: "cancelled",
      triage_reasons: ["high_stakes_use_case"],
      triage_result: "decline",
    })
    expect(updateRecords[0].filters).toContainEqual({
      column: "payment_id",
      method: "eq",
      value: "cs_previous",
    })
    expect(mocks.recordSafetyEvaluationForOperators).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: expect.objectContaining({ symptomDetails: "Need to defer my exam" }),
        context: "retry_payment",
        requestId: "intake-1",
      }),
    )
  })

  it("uses the authoritative service relation when a legacy med-cert category is missing", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock({ category: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    await expectPageRedirect("/request")

    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(updateRecords[0]?.payload).toMatchObject({
      status: "cancelled",
      triage_reasons: ["high_stakes_use_case"],
    })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("does not cancel or rebuild when a high-stakes session completed before invalidation", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionExpire.mockRejectedValueOnce(new Error("Session already complete"))
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "complete",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })

    await expectPageRedirect("/medical-certificate")

    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_previous")
    expect(updateRecords).toHaveLength(0)
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("invalidates a concurrently reattached session before cancelling the high-stakes intake", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock({}, {
      refetchedIntakes: [{ payment_id: "cs_newer" }],
      updateResults: [
        { data: [], error: null },
        { data: [{ id: "intake-1", payment_id: "cs_newer" }], error: null },
      ],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionExpire.mockImplementation(async (sessionId: string) => ({ id: sessionId }))

    await expectPageRedirect("/medical-certificate")

    expect(mocks.stripeSessionExpire.mock.calls.map(([sessionId]) => sessionId)).toEqual([
      "cs_previous",
      "cs_newer",
    ])
    expect(updateRecords).toHaveLength(2)
    expect(updateRecords[1].filters).toContainEqual({
      column: "payment_id",
      method: "eq",
      value: "cs_newer",
    })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("returns the existing open Checkout Session for a safe persisted request", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock({
      answers: [{ answers: { symptomDetails: "A cold since yesterday" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    await expectPageRedirect("https://checkout.stripe.test/pay/cs_previous")

    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
  })

  it("routes a safe completed Checkout Session to account completion without rebuilding", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock({
      answers: [{ answers: { symptomDetails: "A cold since yesterday" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "complete",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })

    await expectPageRedirect(
      "/auth/complete-account?intake_id=intake-1&session_id=cs_previous",
    )

    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
  })

  it("rebuilds an expired safe session and attaches it under the exact previous payment id", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock(
      { answers: [{ answers: { symptomDetails: "A cold since yesterday" } }] },
      {
        updateResults: [{
          data: [{ id: "intake-1", payment_id: "cs_resumed" }],
          error: null,
        }],
      },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "expired",
      url: null,
    })

    await expectPageRedirect("https://checkout.stripe.test/pay/cs_resumed")

    expect(mocks.stripeSessionCreate).toHaveBeenCalledTimes(1)
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].filters).toContainEqual({
      column: "payment_id",
      method: "eq",
      value: "cs_previous",
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_resumed")
  })

  it("withholds and expires a rebuilt session when its exact payment-state attach loses", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock(
      { answers: [{ answers: { symptomDetails: "A cold since yesterday" } }] },
      { updateResults: [{ data: [], error: null }] },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "expired",
      url: null,
    })

    await expectPageRedirect("/medical-certificate")

    expect(mocks.stripeSessionCreate).toHaveBeenCalledTimes(1)
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_resumed")
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].filters).toContainEqual({
      column: "payment_id",
      method: "eq",
      value: "cs_previous",
    })
  })

  it("reuses the same idempotent session when a parallel resume already attached it", async () => {
    const { supabase } = createResumeSupabaseMock(
      { answers: [{ answers: { symptomDetails: "A cold since yesterday" } }] },
      {
        refetchedIntakes: [{ payment_id: "cs_resumed" }],
        updateResults: [{ data: [], error: null }],
      },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "expired",
      url: null,
    })

    await expectPageRedirect("https://checkout.stripe.test/pay/cs_resumed")

    expect(mocks.stripeSessionCreate).toHaveBeenCalledTimes(1)
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_resumed")
  })

  it("withholds and expires a rebuilt session when the attach write errors", async () => {
    const { supabase } = createResumeSupabaseMock(
      { answers: [{ answers: { symptomDetails: "A cold since yesterday" } }] },
      { updateResults: [{ data: null, error: { message: "database unavailable" } }] },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "expired",
      url: null,
    })

    await expectPageRedirect("/medical-certificate")

    expect(mocks.stripeSessionCreate).toHaveBeenCalledTimes(1)
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_resumed")
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/failed to update intake/i),
      expect.objectContaining({ intakeId: "intake-1" }),
      expect.objectContaining({ message: "database unavailable" }),
    )
  })
})
