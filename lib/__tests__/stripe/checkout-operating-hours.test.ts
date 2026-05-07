import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  checkCheckoutBlocked: vi.fn(),
  checkSafetyForServer: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getAuthenticatedUserWithProfile: vi.fn(),
  getPriceIdForRequest: vi.fn(),
  isAtCapacity: vi.fn(),
  isMedicationBlocked: vi.fn(),
  isServiceDisabled: vi.fn(),
  stripeSessionCreate: vi.fn(),
  trackOperationalBlock: vi.fn(),
  validateMedCertPayload: vi.fn(),
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

vi.mock("@/lib/stripe/client", () => ({
  getAmountCentsForRequest: vi.fn(() => 1995),
  getPriceIdForRequest: mocks.getPriceIdForRequest,
  stripe: {
    checkout: {
      sessions: {
        create: mocks.stripeSessionCreate,
      },
    },
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/validation/med-cert-schema", () => ({
  validateMedCertPayload: mocks.validateMedCertPayload,
}))

vi.mock("@/lib/validation/repeat-script-schema", () => ({
  validateRepeatScriptPayload: vi.fn(() => ({ valid: true })),
}))

import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"

function createGuestCheckoutSupabaseMock() {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = []
  const deletes: string[] = []

  const makeBuilder = (table: string) => {
    let operation: "select" | "insert" | "update" | "delete" | null = null
    let selectCount = 0
    const builder = {
      eq: vi.fn(() => builder),
      is: vi.fn(() => builder),
      not: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(async () => ({ data: [], error: null })),
      select: vi.fn(() => {
        selectCount += 1
        if (!operation) operation = "select"
        return builder
      }),
      insert: vi.fn(() => {
        operation = "insert"
        return builder
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        operation = "update"
        updates.push({ table, payload })
        return builder
      }),
      delete: vi.fn(() => {
        operation = "delete"
        deletes.push(table)
        return builder
      }),
      single: vi.fn(async () => {
        if (table === "profiles" && operation === "insert") return { data: { id: "guest-profile-1" }, error: null }
        if (table === "profiles") return { data: null, error: null }
        if (table === "services") return { data: { id: "service-1", price_cents: 1995 }, error: null }
        if (table === "intakes" && operation === "insert") return { data: { id: "intake-1" }, error: null }
        return { data: null, error: null }
      }),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      then: (resolve: (value: { data?: unknown; error: null }) => void) => {
        if (table === "profiles" && operation === "select" && selectCount > 1) {
          return Promise.resolve({ data: [], error: null }).then(resolve)
        }
        if (table === "intake_answers" && operation === "insert") {
          return Promise.resolve({ error: null }).then(resolve)
        }
        return Promise.resolve({ data: null, error: null }).then(resolve)
      },
    }
    return builder
  }

  return {
    deletes,
    supabase: { from: vi.fn((table: string) => makeBuilder(table)) },
    updates,
  }
}

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
    mocks.getPriceIdForRequest.mockReturnValue("price_med_cert")
    mocks.stripeSessionCreate.mockResolvedValue({
      id: "cs_test",
      url: "https://checkout.stripe.test/pay/cs_test",
    })
    mocks.validateMedCertPayload.mockReturnValue({ valid: true })
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

  it("preserves guest intakes as checkout_failed when Stripe session creation fails", async () => {
    const { deletes, supabase, updates } = createGuestCheckoutSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionCreate.mockRejectedValue(new Error("No such price: price_med_cert"))

    const result = await createGuestCheckoutAction({
      answers: {
        terms_agreed: true,
        accuracy_confirmed: true,
      },
      category: "medical_certificate",
      guestDateOfBirth: "1985-04-01",
      guestEmail: "patient@example.test",
      guestName: "Test Patient",
      subtype: "work",
      type: "med-cert",
    })

    expect(result).toEqual({
      success: false,
      error: "This service is temporarily unavailable. Please try again later.",
    })
    expect(deletes).not.toContain("intakes")
    expect(updates).toContainEqual({
      table: "intakes",
      payload: expect.objectContaining({
        checkout_error: "No such price: price_med_cert",
        status: "checkout_failed",
      }),
    })
  })
})
