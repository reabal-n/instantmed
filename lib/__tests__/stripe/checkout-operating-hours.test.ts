import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  checkCheckoutBlocked: vi.fn(),
  checkSafetyForServer: vi.fn(),
  getAuthenticatedUserWithProfile: vi.fn(),
  isAtCapacity: vi.fn(),
  isMedicationBlocked: vi.fn(),
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

vi.mock("@/lib/operational-controls/config", () => ({
  isAtCapacity: mocks.isAtCapacity,
}))

vi.mock("@/lib/data/profiles", () => ({
  decryptProfilePhi: vi.fn((profile) => profile),
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
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"

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

    expect(mocks.trackOperationalBlock).not.toHaveBeenCalledWith(
      expect.objectContaining({ blockType: "business_hours" }),
    )
    expect(result).toEqual({
      success: false,
      error: "You must be logged in to submit a request. Please sign in and try again.",
    })
  })

  it("blocks authenticated consult checkout when blocked medication terms appear in consult details", async () => {
    mocks.isMedicationBlocked.mockImplementation(async (value: unknown) => ({
      blocked: typeof value === "string" && value.includes("blocked-test-med"),
      matchedTerm: "blocked-test-med",
    }))

    const result = await createIntakeAndCheckoutAction({
      answers: {
        consult_details: "Patient is requesting blocked-test-med for a new concern.",
      },
      category: "consult",
      idempotencyKey: "test-idempotency-key",
      subtype: "general",
      type: "consult",
    })

    expect(mocks.isMedicationBlocked).toHaveBeenCalledWith("Patient is requesting blocked-test-med for a new concern.")
    expect(result).toEqual({
      success: false,
      error: "This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular doctor. [MEDICATION_BLOCKED]",
    })
  })

  it("blocks guest checkout when the daily capacity limit is reached", async () => {
    mocks.isAtCapacity.mockResolvedValue(true)

    const result = await createGuestCheckoutAction({
      answers: {},
      category: "medical_certificate",
      guestEmail: "patient@example.test",
      guestName: "Test Patient",
      subtype: "work",
      type: "med-cert",
    })

    expect(mocks.trackOperationalBlock).toHaveBeenCalledWith({
      blockType: "capacity_limit",
      metadata: { checkout_type: "guest" },
      source: "checkout",
    })
    expect(result).toEqual({
      success: false,
      error: "We're experiencing high demand today. Please try again tomorrow.",
    })
  })
})
