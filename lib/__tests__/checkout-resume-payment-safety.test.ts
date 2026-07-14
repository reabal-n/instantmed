import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getAppUrl: vi.fn(),
  getIntakeAnswersForPaymentSafety: vi.fn(),
  getOptionalStripePriceEnv: vi.fn(),
  getPriceIdForRequest: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  recordSafetyEvaluationForOperators: vi.fn(),
  stripeSessionCreate: vi.fn(),
  stripeSessionExpire: vi.fn(),
  stripeSessionRetrieve: vi.fn(),
  stripePriceRetrieve: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: mocks.getAppUrl,
}))

vi.mock("@/lib/data/intake-answers", () => ({
  getIntakeAnswersForPaymentSafety: mocks.getIntakeAnswersForPaymentSafety,
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
    prices: {
      retrieve: mocks.stripePriceRetrieve,
    },
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { resolveGuestCheckoutResume } from "@/lib/stripe/checkout/guest-resume"

interface QueryFilter {
  column?: string
  method: "eq" | "in" | "is" | "or"
  value: unknown
}

interface UpdateRecord {
  filters: QueryFilter[]
  payload: Record<string, unknown>
}

type ResumeIntake = {
  category: string | null
  checkout_error: string | null
  guest_email: string | null
  id: string
  is_priority: boolean | null
  patient_id: string | null
  payment_id: string | null
  payment_status: string | null
  service: { slug: string; type: string } | null
  status: string | null
  stripe_price_id: string | null
  subtype: string | null
}

interface ResumeSupabaseOptions {
  events?: string[]
  refetchedIntakes?: Array<Partial<ResumeIntake>>
  updateResults?: Array<{
    data: Array<Partial<ResumeIntake>> | null
    error: { message: string } | null
  }>
}

function createResumeSupabaseMock(
  intakeOverrides: Partial<ResumeIntake> = {},
  options: ResumeSupabaseOptions = {},
) {
  const intake: ResumeIntake = {
    category: "medical_certificate",
    checkout_error: null,
    guest_email: "patient@example.test",
    id: "intake-1",
    is_priority: false,
    patient_id: "patient-1",
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
          or: vi.fn((value: string) => {
            record.filters.push({ method: "or", value })
            return updateChain
          }),
          select: vi.fn(async () => {
            options.events?.push("update-select")
            const isReplacementBookkeeping = Object.keys(payload).every((key) =>
              key === "checkout_error" || key === "updated_at"
            )
            return (!isReplacementBookkeeping ? options.updateResults?.shift() : undefined) || {
              data: [{
                ...intake,
                checkout_error: payload.checkout_error ?? intake.checkout_error,
                payment_id: payload.payment_id ?? intake.payment_id,
                payment_status: payload.payment_status ?? intake.payment_status,
                status: payload.status ?? intake.status,
              }],
              error: null,
            }
          }),
        }
        return updateChain
      }),
    })),
  }

  return { intake, supabase, updateRecords }
}

describe("signed guest checkout resume payment safety", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAppUrl.mockReturnValue("https://instantmed.example")
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValue({ symptomDetails: "A cold since yesterday" })
    mocks.getOptionalStripePriceEnv.mockReturnValue(null)
    mocks.getPriceIdForRequest.mockReturnValue("price_med_cert")
    mocks.stripePriceRetrieve.mockResolvedValue({
      active: true,
      currency: "aud",
      id: "price_priority",
      recurring: null,
      type: "one_time",
      unit_amount: 995,
    })
    mocks.stripeSessionCreate.mockResolvedValue({
      id: "cs_resumed",
      metadata: { intake_id: "intake-1" },
      url: "https://checkout.stripe.test/pay/cs_resumed",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_previous" })
    mocks.stripeSessionRetrieve.mockImplementation(async (sessionId: string) => ({
      id: sessionId,
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: `https://checkout.stripe.test/pay/${sessionId}`,
    }))
  })

  it("loads encrypted-first answers and atomically locks a high-stakes payment before closing it", async () => {
    const events: string[] = []
    const { supabase, updateRecords } = createResumeSupabaseMock({}, { events })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({
      symptomDetails: "Migraine and need to defer my exam tomorrow",
    })
    mocks.stripeSessionExpire.mockImplementationOnce(async () => {
      events.push("expire")
      return { id: "cs_previous" }
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=safety_blocked")
    expect(mocks.getIntakeAnswersForPaymentSafety).toHaveBeenCalledWith("intake-1")
    expect(mocks.recordSafetyEvaluationForOperators).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: expect.objectContaining({ symptomDetails: expect.stringContaining("defer") }),
        context: "guest_resume",
        requestId: "intake-1",
      }),
    )
    expect(updateRecords).toHaveLength(2)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
      triage_reasons: ["high_stakes_use_case"],
      triage_result: "decline",
    })
    expect(updateRecords[0].payload).not.toHaveProperty("status")
    expect(updateRecords[1].payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
      status: "cancelled",
    })
    expect(updateRecords[1].filters).toEqual(expect.arrayContaining([
      { column: "payment_id", method: "eq", value: "cs_previous" },
      { column: "checkout_error", method: "eq", value: "safety_blocked_high_stakes" },
    ]))
    expect(events).toEqual(["update-select", "expire", "update-select"])
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("uses the service relation to classify a legacy med-cert row with no category", async () => {
    const { supabase } = createResumeSupabaseMock({ category: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({ symptomDetails: "Need to defer an exam" })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=safety_blocked")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("routes a captured high-stakes session with payment in flight to account completion", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock({}, {
      refetchedIntakes: [{ checkout_error: "safety_blocked_high_stakes" }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({ symptomDetails: "Need to defer an exam" })
    mocks.stripeSessionExpire.mockRejectedValueOnce(new Error("Session already complete"))
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "complete",
        url: "https://checkout.stripe.test/pay/cs_previous",
      })
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "complete",
        url: "https://checkout.stripe.test/pay/cs_previous",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe(
      "/auth/complete-account?intake_id=intake-1&session_id=cs_previous",
    )
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
    })
    expect(updateRecords[0].payload).not.toHaveProperty("status")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("routes unresolved high-stakes invalidation to honest payment recovery", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({ symptomDetails: "Need to defer an exam" })
    mocks.stripeSessionExpire.mockRejectedValueOnce(new Error("Stripe unavailable"))

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
    })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("refetches a changed high-stakes row and routes a concurrent paid transition safely", async () => {
    const { supabase } = createResumeSupabaseMock({}, {
      refetchedIntakes: [
        { payment_status: "paid", status: "paid" },
        { payment_status: "paid", status: "paid" },
      ],
      updateResults: [{ data: [], error: null }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({ symptomDetails: "Need to defer an exam" })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe(
      "/auth/complete-account?intake_id=intake-1&session_id=cs_previous",
    )
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("returns the existing open Checkout Session for a safe persisted request", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("https://checkout.stripe.test/pay/cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
  })

  it("allows a metadata-less legacy Session only when it is the exact stored id", async () => {
    const { supabase } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: {},
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("https://checkout.stripe.test/pay/cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("fails closed before returning a live session when encrypted answers cannot be read", async () => {
    const { supabase } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce(null)

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("routes a safe completed Checkout Session to account completion without rebuilding", async () => {
    const { supabase } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "complete",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe(
      "/auth/complete-account?intake_id=intake-1&session_id=cs_previous",
    )
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("rebuilds an expired session only when the deterministic session replay is open", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("https://checkout.stripe.test/pay/cs_resumed")
    expect(mocks.stripeSessionCreate).toHaveBeenCalledTimes(1)
    const attachRecord = updateRecords.find((record) => record.payload.payment_id === "cs_resumed")
    expect(attachRecord?.filters).toEqual(expect.arrayContaining([
      { column: "payment_id", method: "eq", value: "cs_previous" },
      {
        method: "or",
        value: "checkout_error.is.null,checkout_error.neq.safety_blocked_high_stakes",
      },
    ]))
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_resumed")
    expect(mocks.stripePriceRetrieve).not.toHaveBeenCalled()
  })

  it("leaves a signed Priority resume unresolved with no replacement write or Session when preflight fails", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock({ is_priority: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getOptionalStripePriceEnv.mockReturnValue(null)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "expired",
      url: null,
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(updateRecords).toHaveLength(0)
    expect(mocks.stripePriceRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("preflights signed Priority resume before replacement and creates exactly base plus Priority line items", async () => {
    const events: string[] = []
    const { supabase } = createResumeSupabaseMock({ is_priority: true }, { events })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getOptionalStripePriceEnv.mockReturnValue("price_priority")
    mocks.stripePriceRetrieve.mockImplementationOnce(async () => {
      events.push("priority-preflight")
      return {
        active: true,
        currency: "aud",
        id: "price_priority",
        recurring: null,
        type: "one_time",
        unit_amount: 995,
      }
    })
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })
    mocks.stripeSessionCreate.mockImplementationOnce(async () => {
      events.push("create")
      return {
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        url: "https://checkout.stripe.test/pay/cs_resumed",
      }
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("https://checkout.stripe.test/pay/cs_resumed")
    expect(mocks.stripePriceRetrieve).toHaveBeenCalledWith("price_priority")
    expect(events[0]).toBe("priority-preflight")
    expect(events.indexOf("priority-preflight")).toBeLessThan(events.indexOf("update-select"))
    expect(events.indexOf("priority-preflight")).toBeLessThan(events.indexOf("create"))
    expect(mocks.stripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: "price_med_cert", quantity: 1 },
          { price: "price_priority", quantity: 1 },
        ],
      }),
      expect.any(Object),
    )
  })

  it.each([
    ["expired", "unpaid"],
    ["complete", "unpaid"],
  ])("withholds a deterministic %s session replay instead of attaching it", async (
    replayStatus,
    replayPaymentStatus,
  ) => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: replayPaymentStatus,
        status: replayStatus,
        url: replayStatus === "complete" ? "https://checkout.stripe.test/pay/cs_resumed" : null,
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(updateRecords).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({ payment_id: "cs_resumed" }),
      }),
    ]))
  })

  it("reuses a rebuilt session when an attach error committed before the response failed", async () => {
    const { supabase } = createResumeSupabaseMock({}, {
      refetchedIntakes: [{ payment_id: "cs_resumed" }],
      updateResults: [{ data: null, error: { message: "response lost after commit" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("https://checkout.stripe.test/pay/cs_resumed")
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_resumed")
  })

  it("withholds a same-id session when the high-stakes lock wins after attach", async () => {
    const { supabase } = createResumeSupabaseMock({}, {
      refetchedIntakes: [{
        checkout_error: "safety_blocked_high_stakes",
        payment_id: "cs_resumed",
      }],
      updateResults: [{ data: [], error: null }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_resumed")
  })

  it("invalidates only a confirmed orphan after the exact attach loses", async () => {
    const { supabase } = createResumeSupabaseMock({}, {
      refetchedIntakes: [{ payment_id: "cs_other" }],
      updateResults: [{ data: [], error: null }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_resumed")
  })

  it("routes an already-paid intake directly to account completion", async () => {
    const { supabase } = createResumeSupabaseMock({ payment_status: "paid", status: "paid" })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe(
      "/auth/complete-account?intake_id=intake-1&session_id=cs_previous",
    )
    expect(mocks.getIntakeAnswersForPaymentSafety).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
  })

  it("withholds a stored Stripe URL when metadata points at another intake", async () => {
    const { supabase } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: { intake_id: "other-intake" },
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("does not expire a high-stakes Session owned by another intake", async () => {
    const { supabase } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({
      symptomDetails: "Need to defer an exam",
    })
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: { intake_id: "other-intake" },
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_previous",
    })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("withholds a new Session that has no intake metadata", async () => {
    const { supabase, updateRecords } = createResumeSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "expired",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: {},
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=payment_state_unresolved")
    expect(updateRecords).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({ payment_id: "cs_resumed" }),
      }),
    ]))
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_resumed")
  })

  it("rebuilds a complete unpaid session after its async failure is persisted", async () => {
    const { supabase } = createResumeSupabaseMock({
      payment_status: "failed",
      status: "checkout_failed",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "complete",
        url: null,
      })
      .mockResolvedValueOnce({
        id: "cs_resumed",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_resumed",
      })

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("https://checkout.stripe.test/pay/cs_resumed")
    expect(mocks.stripeSessionCreate).toHaveBeenCalledTimes(1)
  })

  it("keeps a previously safety-locked cancellation on the non-PHI blocked route", async () => {
    const { supabase } = createResumeSupabaseMock({
      checkout_error: "safety_blocked_high_stakes",
      status: "cancelled",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const destination = await resolveGuestCheckoutResume("intake-1")

    expect(destination).toBe("/checkout/cancelled?reason=safety_blocked")
    expect(mocks.getIntakeAnswersForPaymentSafety).not.toHaveBeenCalled()
  })
})
