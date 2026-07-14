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

interface UpdateRecord {
  filters: Array<{
    column: string
    method: "eq" | "in" | "is"
    value: unknown
  }>
  payload: Record<string, unknown> | null
}

type RetryIntake = {
  answers: Array<{ answers: Record<string, unknown> }>
  category: string | null
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
    data: Array<{ id: string; payment_id?: string | null }> | null
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
    mocks.getPriceIdForRequest.mockReturnValue("price_med_cert")
    mocks.stripeSessionCreate.mockResolvedValue({
      id: "cs_retry",
      url: "https://checkout.stripe.test/pay/cs_retry",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_previous" })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "expired",
    })
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
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
    expect(mocks.stripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://instantmed.example/patient/intakes/success?intake_id=intake-1&session_id={CHECKOUT_SESSION_ID}&payment_retry=1",
        metadata: expect.objectContaining({
          intake_id: "intake-1",
          is_retry: "true",
        }),
      }),
      { idempotencyKey: "retry_intake-1_cs_previous" },
    )
  })

  it("grandfathers payment retry for a canonical-only legacy repeat request", async () => {
    const { supabase } = createRetrySupabaseMock({
      answers: [{ answers: { dose_changed: false } }],
      category: "prescription",
      service: {
        id: "svc-repeat",
        name: "Repeat prescription",
        price_cents: 2995,
        slug: "repeat-script",
        type: "repeat_rx",
      },
      stripe_price_id: "price_repeat",
      subtype: "repeat",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.getPriceIdForRequest.mockReturnValue("price_repeat")

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toMatchObject({
      checkoutUrl: "https://checkout.stripe.test/pay/cs_retry",
      intakeId: "intake-1",
      success: true,
    })
    expect(mocks.validateSafetyFieldsPresent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dose_changed: false }),
    )
    expect(mocks.checkSafetyForServer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dose_changed: false }),
    )
    expect(mocks.stripeSessionCreate).toHaveBeenCalled()
  })

  it("blocks retry payment for a stored high-stakes medical-certificate request", async () => {
    const events: string[] = []
    const { supabase, updateRecords } = createRetrySupabaseMock(
      { answers: [{ answers: { symptomDetails: "Migraine and need to defer my exam tomorrow" } }] },
      { events },
    )
    mocks.createServiceRoleClient.mockReturnValue(supabase)
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
    const [updateRecord] = updateRecords

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
    expect(updateRecord.payload).toMatchObject({
      checkout_error: null,
      live_consult_reason: null,
      requires_live_consult: false,
      status: "cancelled",
      triage_reasons: ["high_stakes_use_case"],
      triage_result: "decline",
    })
    expect(updateRecord.filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "payment_id", method: "eq", value: "cs_previous" },
      { column: "status", method: "in", value: ["pending_payment", "checkout_failed"] },
      { column: "payment_status", method: "in", value: ["pending", "unpaid", "failed"] },
    ]))
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(events).toEqual(["expire", "update-select"])
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
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("does not cancel when the previous Checkout Session remains open after expiry fails", async () => {
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
    expect(updateRecords).toHaveLength(0)
    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/could not invalidate/i),
      expect.objectContaining({ sessionId: "cs_previous" }),
      expect.any(Error),
    )
  })

  it("does not cancel a completed or processing Checkout Session", async () => {
    const { supabase, updateRecords } = createRetrySupabaseMock({
      answers: [{ answers: { symptomDetails: "Need to defer my exam" } }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.checkHighStakesUseCase.mockReturnValue({
      isHighStakes: true,
      reason: "Exam deferrals require an in-person assessment.",
    })
    mocks.stripeSessionExpire.mockRejectedValueOnce(new Error("Session already complete"))
    mocks.stripeSessionRetrieve.mockResolvedValueOnce({
      id: "cs_previous",
      payment_status: "unpaid",
      status: "complete",
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result).toEqual({
      error: expect.stringMatching(/refresh.*completed payment.*support/i),
      success: false,
    })
    expect(updateRecords).toHaveLength(0)
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("expires a concurrently attached session before retrying the guarded cancellation", async () => {
    const events: string[] = []
    const { supabase, updateRecords } = createRetrySupabaseMock(
      { answers: [{ answers: { symptomDetails: "Need to defer my exam" } }] },
      {
        events,
        refetchedIntakes: [{ payment_id: "cs_newer" }],
        updateResults: [
          { data: [], error: null },
          { data: [{ id: "intake-1", payment_id: "cs_newer" }], error: null },
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
      "cs_previous",
      "cs_newer",
    ])
    expect(updateRecords).toHaveLength(2)
    expect(updateRecords[1].filters).toContainEqual({
      column: "payment_id",
      method: "eq",
      value: "cs_newer",
    })
    expect(events).toEqual([
      "expire:cs_previous",
      "update-select",
      "expire:cs_newer",
      "update-select",
    ])
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("leaves an expired high-stakes intake retryable when the cancellation write fails", async () => {
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
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/failed to cancel/i),
      expect.objectContaining({ intakeId: "intake-1" }),
      expect.objectContaining({ message: "database unavailable" }),
    )
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
    expect(updateRecords).toHaveLength(1)
    expect(updateRecords[0].filters).toContainEqual({
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
