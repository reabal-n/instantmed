import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  checkCheckoutBlocked: vi.fn(),
  checkSafetyForServer: vi.fn(),
  getAuthenticatedUserWithProfile: vi.fn(),
  isAtCapacity: vi.fn(),
  isMedicationBlocked: vi.fn(),
  isOutsideBusinessHours: vi.fn(),
  isServiceDisabled: vi.fn(),
  trackOperationalBlock: vi.fn(),
  validateSafetyFieldsPresent: vi.fn(),
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  trackIntakeFunnelStep: vi.fn(),
  trackOperationalBlock: mocks.trackOperationalBlock,
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

vi.mock("@/lib/config/env", () => ({
  getAppUrl: () => "http://localhost:3000",
}))

vi.mock("@/lib/config/kill-switches", () => ({
  checkCheckoutBlocked: mocks.checkCheckoutBlocked,
}))

vi.mock("@/lib/config/operational-config", () => ({
  isAtCapacity: mocks.isAtCapacity,
  isOutsideBusinessHours: mocks.isOutsideBusinessHours,
}))

vi.mock("@/lib/data/profiles", () => ({
  updateProfile: vi.fn(),
}))

vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: mocks.isMedicationBlocked,
  isServiceDisabled: mocks.isServiceDisabled,
  SERVICE_DISABLED_ERRORS: {
    CONSULTS_DISABLED: "CONSULTS_DISABLED",
    MED_CERT_DISABLED: "MED_CERT_DISABLED",
    MEDICATION_BLOCKED: "MEDICATION_BLOCKED",
    REPEAT_SCRIPTS_DISABLED: "REPEAT_SCRIPTS_DISABLED",
  },
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: vi.fn(async () => ({ success: true })),
}))

vi.mock("@/lib/safety/evaluate", () => ({
  checkSafetyForServer: mocks.checkSafetyForServer,
  validateSafetyFieldsPresent: mocks.validateSafetyFieldsPresent,
}))

vi.mock("@/lib/security/fraud-detector", () => ({
  runFraudChecks: vi.fn(),
  saveFraudFlags: vi.fn(),
}))

import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"

describe("checkout operating hours", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkCheckoutBlocked.mockReturnValue({ blocked: false })
    mocks.checkSafetyForServer.mockReturnValue({
      blockReason: null,
      isAllowed: true,
      outcome: "ALLOW",
      riskTier: "low",
      triggeredRuleIds: [],
    })
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue(null)
    mocks.isAtCapacity.mockResolvedValue(false)
    mocks.isMedicationBlocked.mockResolvedValue({ blocked: false })
    mocks.isOutsideBusinessHours.mockResolvedValue({ closed: true, nextOpen: "8am" })
    mocks.isServiceDisabled.mockResolvedValue(false)
    mocks.validateSafetyFieldsPresent.mockReturnValue({ valid: true, missingFields: [] })
  })

  it("does not block checkout when business hours are closed", async () => {
    const result = await createIntakeAndCheckoutAction({
      answers: {},
      category: "consult",
      idempotencyKey: "test-idempotency-key",
      subtype: "general",
      type: "consult",
    })

    expect(mocks.isOutsideBusinessHours).not.toHaveBeenCalled()
    expect(mocks.trackOperationalBlock).not.toHaveBeenCalledWith(
      expect.objectContaining({ blockType: "business_hours" }),
    )
    expect(result).toEqual({
      success: false,
      error: "You must be logged in to submit a request. Please sign in and try again.",
    })
  })
})
