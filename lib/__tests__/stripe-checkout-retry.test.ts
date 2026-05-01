import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
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
  stripeSessionCreate: vi.fn(),
  stripeSessionExpire: vi.fn(),
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
  stripe: {
    checkout: {
      sessions: {
        create: mocks.stripeSessionCreate,
        expire: mocks.stripeSessionExpire,
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

interface UpdateRecord {
  filters: Array<{
    column: string
    method: "eq" | "in"
    value: unknown
  }>
  payload: Record<string, unknown> | null
}

function createRetrySupabaseMock() {
  const updateRecord: UpdateRecord = {
    filters: [],
    payload: null,
  }

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
  }

  const selectChain = {
    eq: vi.fn(() => selectChain),
    single: vi.fn(async () => ({ data: intake, error: null })),
  }

  const updateResult = { error: null }
  const updateChain = {
    eq: vi.fn((column: string, value: unknown) => {
      updateRecord.filters.push({ column, method: "eq", value })
      return updateChain
    }),
    in: vi.fn((column: string, value: unknown) => {
      updateRecord.filters.push({ column, method: "in", value })
      return updateChain
    }),
    then: (resolve: (value: typeof updateResult) => void) => Promise.resolve(updateResult).then(resolve),
  }

  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn((payload: Record<string, unknown>) => {
        updateRecord.payload = payload
        return updateChain
      }),
    })),
  }

  return { supabase, updateRecord }
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
    mocks.validateSafetyFieldsPresent.mockReturnValue({ missingFields: [], valid: true })
    mocks.checkSafetyForServer.mockReturnValue({ isAllowed: true })
  })

  it("resets failed checkout retries to the new pending Stripe session", async () => {
    const { supabase, updateRecord } = createRetrySupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await retryPaymentForIntakeAction("intake-1")

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
        metadata: expect.objectContaining({
          intake_id: "intake-1",
          is_retry: "true",
        }),
      }),
      { idempotencyKey: "retry_intake-1_cs_previous" },
    )
  })
})
