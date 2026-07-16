import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  checkHighStakesUseCase: vi.fn(),
  checkSafetyForServer: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
  cookies: vi.fn(),
  createReferralCouponIfEligible: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getAppUrl: vi.fn(),
  getAuthenticatedUserWithProfile: vi.fn(),
  getIntakeAnswersForPaymentSafety: vi.fn(),
  getOptionalStripePriceEnv: vi.fn(),
  getPriceIdForRequest: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
  recordSafetyEvaluationForOperators: vi.fn(),
  stripeSessionCreate: vi.fn(),
  stripeSessionExpire: vi.fn(),
  stripeSessionRetrieve: vi.fn(),
  stripePriceRetrieve: vi.fn(),
  validateSafetyFieldsPresent: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  trackIntakeFunnelStep: vi.fn(),
  trackOperationalBlock: vi.fn(),
  trackSafetyBlock: vi.fn(),
  trackSafetyOutcome: vi.fn(),
}))

vi.mock("@/lib/audit/compliance-audit", () => ({
  logAccuracyAttestationGiven: vi.fn(),
  logRequestCreated: vi.fn(),
  logTelehealthConsentGiven: vi.fn(),
  logTermsConsentGiven: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getAuthenticatedUserWithProfile: mocks.getAuthenticatedUserWithProfile,
}))

vi.mock("@/lib/clinical/intake-validation", () => ({
  checkHighStakesAnswers: mocks.checkHighStakesUseCase,
  checkHighStakesUseCase: mocks.checkHighStakesUseCase,
  isControlledSubstance: vi.fn(() => false),
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: mocks.getAppUrl,
}))

vi.mock("@/lib/config/kill-switches", () => ({
  checkCheckoutBlocked: vi.fn(() => ({ blocked: false })),
}))

vi.mock("@/lib/operational-controls/config", () => ({
  isAtCapacity: vi.fn(() => false),
}))

vi.mock("@/lib/constants", () => ({
  CONTACT_EMAIL: "support@example.test",
  TELEHEALTH_CONSENT_VERSION: "test",
  TERMS_VERSION: "test",
}))

vi.mock("@/lib/data/profiles", () => ({
  updateProfile: vi.fn(),
}))

vi.mock("@/lib/data/intake-answers", () => ({
  getIntakeAnswersForPaymentSafety: mocks.getIntakeAnswersForPaymentSafety,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidatePatient: mocks.revalidatePatient,
  revalidateStaff: mocks.revalidateStaff,
}))

vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: vi.fn(() => false),
  isServiceDisabled: vi.fn(() => false),
  SERVICE_DISABLED_ERRORS: {},
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

vi.mock("@/lib/safety/evaluate", () => ({
  checkSafetyForServer: mocks.checkSafetyForServer,
  validateSafetyFieldsPresent: mocks.validateSafetyFieldsPresent,
}))

vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: mocks.recordSafetyEvaluationForOperators,
}))

vi.mock("@/lib/security/fraud-detector", () => ({
  runFraudChecks: vi.fn(),
  saveFraudFlags: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/validation/med-cert-schema", () => ({
  validateMedCertPayload: vi.fn(),
}))

vi.mock("@/lib/validation/repeat-script-schema", () => ({
  validateRepeatScriptPayload: vi.fn(),
}))

vi.mock("@/lib/stripe/client", () => ({
  getAmountCentsForRequest: vi.fn(() => 1995),
  getOptionalStripePriceEnv: mocks.getOptionalStripePriceEnv,
  getPriceIdForRequest: mocks.getPriceIdForRequest,
  normalizeStripePriceId: vi.fn((priceId: string | null | undefined) => priceId?.trim() || undefined),
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

vi.mock("@/lib/stripe/prescribing-profile-fields", () => ({
  buildPrescribingProfileUpdates: vi.fn(() => ({})),
}))

vi.mock("@/lib/stripe/referral-coupon", () => ({
  createReferralCouponIfEligible: mocks.createReferralCouponIfEligible,
}))

import { retryPaymentForIntakeAction } from "@/lib/stripe/checkout"

const successPageSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/success/page.tsx"),
  "utf8",
)
const successClientSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/success/success-client.tsx"),
  "utf8",
)
const retryPaymentSource = readFileSync(
  join(process.cwd(), "lib/stripe/checkout/retry-payment.ts"),
  "utf8",
)

interface UpdateRecord {
  filters: Array<{
    column?: string
    method: "eq" | "in" | "is" | "neq" | "not" | "or"
    operator?: string
    value: unknown
  }>
  payload: Record<string, unknown> | null
}

type RetryIntake = {
  answers: Array<{ answers: Record<string, unknown> }>
  category: string | null
  checkout_error: string | null
  is_priority: boolean | null
  payment_id: string | null
  payment_status: string | null
  service: { id: string; name: string; price_cents: number; slug: string; type: string } | null
  status: string | null
  stripe_price_id: string | null
  subtype: string | null
}

interface RetrySupabaseOptions {
  events?: string[]
  refetchedIntakes?: Array<Partial<RetryIntake>>
  updateResults?: Array<{
    data: Array<Partial<RetryIntake> & { id: string }> | null
    error: { message: string } | null
  }>
}

function createRetrySupabaseMock(
  intakeOverrides: Partial<RetryIntake> = {},
  options: RetrySupabaseOptions = {},
) {
  const updateRecords: UpdateRecord[] = []

  const intake = {
    id: "intake-1",
    amount_cents: 1995,
    answers: [{ answers: { symptom: "test" } }],
    category: "medical_certificate",
    checkout_error: null,
    is_priority: false,
    payment_id: "cs_previous",
    payment_status: "failed",
    service: { id: "svc-1", name: "Medical certificate", price_cents: 1995, slug: "med-cert-sick", type: "medical_certificate" },
    stripe_price_id: "price_med_cert",
    status: "checkout_failed",
    subtype: "work",
    ...intakeOverrides,
  }

  const selectResults = [
    intake,
    ...(options.refetchedIntakes || []).map((overrides) => ({ ...intake, ...overrides })),
  ]
  let selectIndex = 0

  const selectChain = {
    eq: vi.fn(() => selectChain),
    maybeSingle: vi.fn(async () => ({
      data: selectResults[Math.min(selectIndex++, selectResults.length - 1)],
      error: null,
    })),
    single: vi.fn(async () => ({
      data: selectResults[Math.min(selectIndex++, selectResults.length - 1)],
      error: null,
    })),
  }

  const defaultUpdateResult = {
    data: [{ id: intake.id, payment_id: intake.payment_id }],
    error: null,
  }
  const updateResults = [...(options.updateResults || [])]

  function createUpdateChain(updateRecord: UpdateRecord) {
    const updateChain = {
      eq: vi.fn((column: string, value: unknown) => {
        updateRecord.filters.push({ column, method: "eq", value })
        return updateChain
      }),
      in: vi.fn((column: string, value: unknown) => {
        updateRecord.filters.push({ column, method: "in", value })
        return updateChain
      }),
      is: vi.fn((column: string, value: unknown) => {
        updateRecord.filters.push({ column, method: "is", value })
        return updateChain
      }),
      neq: vi.fn((column: string, value: unknown) => {
        updateRecord.filters.push({ column, method: "neq", value })
        return updateChain
      }),
      not: vi.fn((column: string, operator: string, value: unknown) => {
        updateRecord.filters.push({ column, method: "not", operator, value })
        return updateChain
      }),
      or: vi.fn((value: string) => {
        updateRecord.filters.push({ method: "or", value })
        return updateChain
      }),
      select: vi.fn(async () => {
        options.events?.push("update-select")
        return updateResults.shift() || defaultUpdateResult
      }),
      then: (resolve: (value: { error: null }) => void) => Promise.resolve({ error: null }).then(resolve),
    }
    return updateChain
  }

  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn((payload: Record<string, unknown>) => {
        const updateRecord: UpdateRecord = { filters: [], payload }
        updateRecords.push(updateRecord)
        return createUpdateChain(updateRecord)
      }),
    })),
  }

  return { supabase, updateRecords }
}

describe("retryPaymentForIntakeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => null) })
    mocks.createReferralCouponIfEligible.mockResolvedValue(null)
    mocks.getAppUrl.mockReturnValue("https://instantmed.example")
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      profile: { id: "patient-1", stripe_customer_id: null },
      user: { email: "patient@example.test", id: "user-1" },
    })
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValue({ symptom: "test" })
    mocks.getOptionalStripePriceEnv.mockReturnValue("price_priority")
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
      id: "cs_retry",
      metadata: { intake_id: "intake-1" },
      url: "https://checkout.stripe.test/pay/cs_retry",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_previous" })
    mocks.stripeSessionRetrieve.mockImplementation(async (sessionId: string) => ({
      id: sessionId,
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: `https://checkout.stripe.test/pay/${sessionId}`,
    }))
    mocks.checkHighStakesUseCase.mockReturnValue({ isHighStakes: false })
    mocks.validateSafetyFieldsPresent.mockReturnValue({ missingFields: [], valid: true })
    mocks.checkSafetyForServer.mockReturnValue({ isAllowed: true })
  })

  it("resets failed checkout retries to the new pending Stripe session", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")
    const [updateRecord] = updateRecords

    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.test/pay/cs_retry",
      intakeId: "intake-1",
      success: true,
    })
    expect(updateRecord.payload).toMatchObject({
      checkout_error: null,
      payment_id: "cs_retry",
      payment_status: "pending",
      status: "pending_payment",
    })
    expect(updateRecord.filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "patient_id", method: "eq", value: "patient-1" },
      { column: "payment_id", method: "eq", value: "cs_previous" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
      { column: "checkout_error", method: "is", value: null },
    ]))
    expect(updateRecord.filters).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "or" }),
    ]))
    expect(mocks.stripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://instantmed.example/patient/intakes/success?intake_id=intake-1&session_id={CHECKOUT_SESSION_ID}&payment_retry=1",
        metadata: expect.objectContaining({
          intake_id: "intake-1",
          is_retry: "true",
        }),
      }),
      { idempotencyKey: "authenticated-retry-v2_intake-1_cs_previous" },
    )
  })

  it("attaches through a separate non-locking error guard when checkout_error is non-null", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock(
      { checkout_error: "Payment failed" },
      {
        updateResults: [
          { data: [], error: null },
          { data: [{ id: "intake-1", payment_id: "cs_retry" }], error: null },
        ],
      },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")
    const attachUpdates = updateRecords.filter(
      (record) => record.payload?.payment_id === "cs_retry",
    )

    expect(result).toMatchObject({ success: true })
    expect(attachUpdates).toHaveLength(2)
    expect(attachUpdates[0].filters).toEqual(expect.arrayContaining([
      { column: "checkout_error", method: "is", value: null },
    ]))
    expect(attachUpdates[1].filters).toEqual(expect.arrayContaining([
      {
        column: "checkout_error",
        method: "not",
        operator: "in",
        value:
          "(safety_blocked_high_stakes,safety_missing_required_information)",
      },
    ]))
    expect(attachUpdates.flatMap((record) => record.filters)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ method: "or" })]),
    )
    expect(mocks.getOptionalStripePriceEnv).not.toHaveBeenCalled()
    expect(mocks.stripePriceRetrieve).not.toHaveBeenCalled()
  })

  it("fails a Priority retry with exact patient copy before referral, replacement, expiry, or create when config is missing", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({ is_priority: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getOptionalStripePriceEnv.mockReturnValue(null)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error:
        "Priority review is temporarily unavailable. Your request was not changed and no new checkout was opened. Please try again later or contact support.",
      success: false,
    })
    expect(mocks.createReferralCouponIfEligible).not.toHaveBeenCalled()
    expect(mocks.stripePriceRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
  })

  it("fails an unusable Priority retry before referral or any replacement mutation", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({ is_priority: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripePriceRetrieve.mockResolvedValueOnce({
      active: false,
      currency: "aud",
      id: "price_priority",
      recurring: null,
      type: "one_time",
      unit_amount: 995,
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error:
        "Priority review is temporarily unavailable. Your request was not changed and no new checkout was opened. Please try again later or contact support.",
      success: false,
    })
    expect(mocks.createReferralCouponIfEligible).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
  })

  it("preflights a valid Priority Price before replacement and creates exactly base plus Priority line items", async () => {
    const events: string[] = []
    const { supabase } = createRetrySupabaseMock(
      {
        is_priority: true,
        payment_status: "pending",
        status: "pending_payment",
      },
      { events },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
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
    mocks.createReferralCouponIfEligible.mockImplementationOnce(async () => {
      events.push("referral")
      return null
    })
    mocks.stripeSessionExpire.mockImplementationOnce(async () => {
      events.push("expire")
      return { id: "cs_previous" }
    })
    mocks.stripeSessionCreate.mockImplementationOnce(async () => {
      events.push("create")
      return {
        id: "cs_retry",
        metadata: { intake_id: "intake-1" },
        url: "https://checkout.stripe.test/pay/cs_retry",
      }
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toMatchObject({ success: true })
    expect(events.indexOf("priority-preflight")).toBeLessThan(events.indexOf("referral"))
    expect(events.indexOf("priority-preflight")).toBeLessThan(events.indexOf("update-select"))
    expect(events.indexOf("priority-preflight")).toBeLessThan(events.indexOf("expire"))
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

  it("claims a pending intake before expiring its current Session", async () => {
    const events: string[] = []
    const { supabase, updateRecords } = createRetrySupabaseMock(
      {
        checkout_error: null,
        payment_status: "pending",
        status: "pending_payment",
      },
      {
        events,
        updateResults: [
          { data: [{ id: "intake-1" }], error: null },
          { data: [{ id: "intake-1" }], error: null },
        ],
      },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionExpire.mockImplementationOnce(async () => {
      events.push("stripe-expire")
      return { id: "cs_previous" }
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toMatchObject({ success: true })
    expect(events).toEqual(["update-select", "stripe-expire", "update-select"])
    expect(updateRecords[0]).toMatchObject({
      payload: {
        checkout_error: "payment_session_replacement_in_progress",
      },
    })
    expect(updateRecords[0].filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "patient_id", method: "eq", value: "patient-1" },
      { column: "payment_id", method: "eq", value: "cs_previous" },
      { column: "payment_status", method: "eq", value: "pending" },
      { column: "status", method: "eq", value: "pending_payment" },
    ]))
  })

  it("fails closed before touching Stripe when encrypted answers cannot be read", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValue(null)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
  })

  it("uses the encrypted-first answer reader instead of a plaintext relation projection", () => {
    expect(retryPaymentSource).toContain("getIntakeAnswersForPaymentSafety(intake.id)")
    expect(retryPaymentSource).not.toContain("answers:intake_answers(answers)")
  })

  it("does not create a second retry session when the stored session is complete or processing", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      payment_status: "pending",
      status: "pending_payment",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "complete",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/refresh.*completed payment.*support/i),
      success: false,
    })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "payment_session_replacement_in_progress",
    })
    expect(updateRecords).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ payload: expect.objectContaining({ payment_id: "cs_retry" }) }),
    ]))
  })

  it("resumes a durable replacement marker after an interrupted attempt", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      checkout_error: "payment_session_replacement_in_progress",
      payment_status: "pending",
      status: "pending_payment",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve
      .mockResolvedValueOnce({
        id: "cs_previous",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "expired",
      })
      .mockResolvedValueOnce({
        id: "cs_retry",
        metadata: { intake_id: "intake-1" },
        payment_status: "unpaid",
        status: "open",
        url: "https://checkout.stripe.test/pay/cs_retry",
      })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toMatchObject({
      checkoutUrl: "https://checkout.stripe.test/pay/cs_retry",
      success: true,
    })
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: null,
      payment_id: "cs_retry",
    })
  })

  it("rebuilds a persisted async-payment failure even when Stripe remains complete and unpaid", async () => {
    const { supabase } = createRetrySupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "complete",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.test/pay/cs_retry",
      intakeId: "intake-1",
      success: true,
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).toHaveBeenCalledOnce()
  })

  it("reuses the same idempotent retry session when a parallel request already attached it", async () => {
    const { supabase } = createRetrySupabaseMock({}, {
      refetchedIntakes: [{ payment_id: "cs_retry" }],
      updateResults: [
        { data: [], error: null },
        { data: [], error: null },
      ],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.test/pay/cs_retry",
      intakeId: "intake-1",
      success: true,
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_retry")
  })

  it("invalidates the new retry session when the exact attach write errors", async () => {
    const { supabase } = createRetrySupabaseMock({}, {
      updateResults: [{ data: null, error: { message: "database unavailable" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_retry")
  })

  it("reuses the retry session when an attach error committed before the response failed", async () => {
    const { supabase } = createRetrySupabaseMock({}, {
      refetchedIntakes: [{ payment_id: "cs_retry" }],
      updateResults: [{ data: null, error: { message: "response lost after commit" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.test/pay/cs_retry",
      intakeId: "intake-1",
      success: true,
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalledWith("cs_retry")
  })

  it("invalidates the new retry session when another payment id wins the attach CAS", async () => {
    const { supabase } = createRetrySupabaseMock({}, {
      refetchedIntakes: [{ payment_id: "cs_other" }],
      updateResults: [
        { data: [], error: null },
        { data: [], error: null },
      ],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_retry")
  })

  it.each([
    ["expired", "unpaid"],
    ["complete", "unpaid"],
  ])("withholds a deterministic %s retry-session replay", async (
    replayStatus,
    replayPaymentStatus,
  ) => {
    const { supabase, updateRecords } = createRetrySupabaseMock()
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
        id: "cs_retry",
        metadata: { intake_id: "intake-1" },
        payment_status: replayPaymentStatus,
        status: replayStatus,
        url: replayStatus === "complete" ? "https://checkout.stripe.test/pay/cs_retry" : null,
      })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(updateRecords).toHaveLength(0)
  })

  it("withholds a same-id retry session when the high-stakes lock wins after attach", async () => {
    const { supabase } = createRetrySupabaseMock({}, {
      refetchedIntakes: [{
        checkout_error: "safety_blocked_high_stakes",
        payment_id: "cs_retry",
      }],
      updateResults: [
        { data: [], error: null },
        { data: [], error: null },
      ],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_retry")
  })

  it.each([
    ["a missing side-effect answer", {}],
    ["a reported side effect with blank details", { hasSideEffects: true, sideEffects: "   " }],
  ])("fails canonical repeat retry before safety or Stripe for %s", async (
    _case,
    sideEffectAnswers,
  ) => {
    const authoritativeAnswers = {
      emergency_symptoms: [],
      dose_changed: false,
      ...sideEffectAnswers,
    }
    const { supabase, updateRecords } = createRetrySupabaseMock({
      answers: [{ answers: authoritativeAnswers }],
      category: "prescription",
      service: {
        id: "svc-repeat",
        name: "Repeat prescription",
        price_cents: 2995,
        slug: "common-scripts",
        type: "repeat_rx",
      },
      stripe_price_id: "price_repeat",
      subtype: "repeat",
    })
    const actualSafety = await vi.importActual<typeof import("@/lib/safety/evaluate")>(
      "@/lib/safety/evaluate",
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce(authoritativeAnswers)
    mocks.validateSafetyFieldsPresent.mockImplementationOnce(
      actualSafety.validateSafetyFieldsPresent,
    )

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toMatchObject({
      error: expect.stringMatching(/required medical information is missing/i),
      paymentRecoveryReason: "more_information_required",
      success: false,
    })
    expect(mocks.validateSafetyFieldsPresent).toHaveBeenCalledWith(
      "common-scripts",
      authoritativeAnswers,
    )
    expect(mocks.checkSafetyForServer).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "safety_missing_required_information",
      live_consult_reason: "Required medical information is missing.",
      requires_live_consult: false,
      status: "checkout_failed",
      triage_reasons: ["missing_safety_fields"],
      triage_result: "request_more_info",
    })
    expect(updateRecords[0].payload).not.toHaveProperty("payment_id")
    expect(updateRecords[0].payload).not.toHaveProperty("payment_status")
    expect(updateRecords[0].payload).not.toHaveProperty("cancelled_at")
    expect(updateRecords[0].payload).not.toHaveProperty("declined_at")
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "patient-1",
    })
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "patient-1",
    })
  })

  it("retries exact-current invalidation for an existing missing-information marker before reading answers", async () => {
    const { supabase } = createRetrySupabaseMock({
      checkout_error: "safety_missing_required_information",
      payment_status: "pending",
      status: "checkout_failed",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    let result: Awaited<ReturnType<typeof retryPaymentForIntakeAction>> | undefined
    await mocks.getIntakeAnswersForPaymentSafety.withImplementation(
      async () => null,
      async () => {
        result = await retryPaymentForIntakeAction("intake-1")
      },
    )

    expect(result).toEqual({
      error:
        "Required medical information is missing. Please start a new request before trying payment again.",
      paymentRecoveryReason: "more_information_required",
      success: false,
    })
    expect(mocks.getIntakeAnswersForPaymentSafety).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "patient-1",
    })
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "patient-1",
    })
  })

  it("projects a persisted missing-information hold when exact-Session invalidation is unresolved", async () => {
    const { supabase } = createRetrySupabaseMock({
      checkout_error: "safety_missing_required_information",
      payment_status: "pending",
      status: "checkout_failed",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockRejectedValueOnce(new Error("Stripe unavailable"))

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toMatchObject({
      paymentRecoveryReason: "more_information_required",
      success: false,
    })
    expect(result.checkoutUrl).toBeUndefined()
    expect(mocks.getIntakeAnswersForPaymentSafety).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "patient-1",
    })
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "patient-1",
    })
  })

  it("blocks retry payment for a stored high-stakes medical-certificate request", async () => {
    const events: string[] = []
    const { supabase, updateRecords } = createRetrySupabaseMock(
      { answers: [{ answers: { symptomDetails: "Migraine and need to defer my exam tomorrow" } }] },
      { events },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getIntakeAnswersForPaymentSafety.mockResolvedValueOnce({
      symptomDetails: "Migraine and need to defer my exam tomorrow",
    })
    mocks.stripeSessionExpire.mockImplementationOnce(async () => {
      events.push("expire")
      return { id: "cs_previous" }
    })
    mocks.checkHighStakesUseCase.mockReturnValueOnce({
      isHighStakes: true,
      matched: "defer",
      reason: "Exam deferrals require an in-person assessment.",
    })

    const result = await retryPaymentForIntakeAction("intake-1")
    const [lockRecord, cancellationRecord] = updateRecords

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.recordSafetyEvaluationForOperators).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "retry_payment",
        requestId: "intake-1",
        result: expect.objectContaining({
          outcome: "DECLINE",
          triggeredRuleIds: ["high_stakes_use_case"],
        }),
      }),
    )
    expect(lockRecord.payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
      live_consult_reason: null,
      requires_live_consult: false,
      triage_reasons: ["high_stakes_use_case"],
      triage_result: "decline",
    })
    expect(lockRecord.payload).not.toHaveProperty("status")
    expect(lockRecord.filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "patient_id", method: "eq", value: "patient-1" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
    expect(cancellationRecord.payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
      status: "cancelled",
    })
    expect(cancellationRecord.filters).toEqual(expect.arrayContaining([
      { column: "checkout_error", method: "eq", value: "safety_blocked_high_stakes" },
      { column: "payment_id", method: "eq", value: "cs_previous" },
    ]))
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(events).toEqual(["update-select", "expire", "update-select"])
    expect(mocks.revalidatePatient).toHaveBeenCalledWith({ intakeId: "intake-1" })
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({ intakeId: "intake-1" })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("does not classify a category-less non-med-cert legacy row as a medical certificate", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      answers: [{ answers: { notes: "Need to defer my exam" } }],
      category: null,
      service: null,
      stripe_price_id: null,
      subtype: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })
    mocks.getPriceIdForRequest.mockReturnValue(undefined)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: "Unable to determine pricing. Please contact support.",
      success: false,
    })
    expect(mocks.checkHighStakesUseCase).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(0)
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("locks but leaves retryable state intact when the previous session remains open", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      answers: [{ answers: { symptomDetails: "Need to defer my exam" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })
    mocks.stripeSessionExpire.mockRejectedValueOnce(new Error("Stripe unavailable"))
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "open",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
    })
    expect(updateRecords[0].payload).not.toHaveProperty("status")
    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/could not invalidate/i),
      expect.objectContaining({ sessionId: "cs_previous" }),
      expect.any(Error),
    )
  })

  it("preserves webhook recovery when the captured session is complete or processing", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      answers: [{ answers: { symptomDetails: "Need to defer my exam" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "complete",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/refresh.*completed payment.*support/i),
      success: false,
    })
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].payload).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
    })
    expect(updateRecords[0].payload).not.toHaveProperty("status")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("atomically captures and closes the current session without a finite CAS retry loop", async () => {
    const events: string[] = []
    const { supabase, updateRecords } = createRetrySupabaseMock(
      { answers: [{ answers: { symptomDetails: "Need to defer my exam" } }] },
      {
        events,
        updateResults: [
          {
            data: [{
              checkout_error: "safety_blocked_high_stakes",
              id: "intake-1",
              payment_id: "cs_newer",
              payment_status: "pending",
              status: "pending_payment",
            }],
            error: null,
          },
          { data: [{ id: "intake-1" }], error: null },
        ],
      },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })
    mocks.stripeSessionExpire.mockImplementation(async (sessionId: string) => {
      events.push(`expire:${sessionId}`)
      return { id: sessionId }
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.stripeSessionExpire.mock.calls.map(([sessionId]) => sessionId)).toEqual([
      "cs_newer",
    ])
    expect(updateRecords).toHaveLength(2)
    expect(updateRecords[1].filters).toContainEqual({
      column: "payment_id",
      method: "eq",
      value: "cs_newer",
    })
    expect(events).toEqual([
      "update-select",
      "expire:cs_newer",
      "update-select",
    ])
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("does not invalidate any session when the atomic safety lock cannot be confirmed", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock(
      { answers: [{ answers: { symptomDetails: "Need to defer my exam" } }] },
      { updateResults: [{ data: null, error: { message: "database unavailable" } }] },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(updateRecords).toHaveLength(1)
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("cancels a high-stakes retry with no stored session using a null payment-id guard", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      answers: [{ answers: { symptomDetails: "Need to defer my exam" } }],
      payment_id: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/no new payment session/i),
      success: false,
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(updateRecords).toHaveLength(2)
    expect(updateRecords[1].filters).toContainEqual({
      column: "payment_id",
      method: "is",
      value: null,
    })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("hands retry-payment return state into the success screen copy", () => {
    expect(successPageSource).toContain("payment_retry")
    expect(successPageSource).toContain("paymentRetry={paymentRetry}")
    expect(successClientSource).toContain("paymentRetry")
    expect(successClientSource).toContain("Payment retry confirmed")
    expect(successClientSource).toContain("No need to fill the form out again")
  })

  it("logs a lightweight retry-return audit event from the success page", () => {
    expect(successPageSource).toContain("logPaymentRetryReturn")
    expect(successPageSource).toContain("payment_retry_return")
    expect(successPageSource).toContain('action: "payment_completed"')
    expect(successPageSource).toContain("retry_landing")
    expect(successPageSource).toContain("paymentRetry")
  })

  it("fails retry checkout before Stripe when legacy pricing cannot be resolved", async () => {
    const { supabase } = createRetrySupabaseMock({
      category: null,
      service: null,
      stripe_price_id: null,
      subtype: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getPriceIdForRequest.mockReturnValue(undefined)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: "Unable to determine pricing. Please contact support.",
      success: false,
    })
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Unable to determine retry checkout price",
      expect.objectContaining({ intakeId: "intake-1" }),
    )
  })
})
