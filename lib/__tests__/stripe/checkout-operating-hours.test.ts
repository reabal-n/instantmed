import * as Sentry from "@sentry/nextjs"
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
  stripeSessionExpire: vi.fn(),
  stripeSessionRetrieve: vi.fn(),
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
  getOptionalStripePriceEnv: vi.fn((key: string) => process.env[key]?.trim() || null),
  getPriceIdForRequest: mocks.getPriceIdForRequest,
  normalizeStripePriceId: vi.fn((priceId?: string | null) => priceId?.trim() || undefined),
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

vi.mock("@/lib/validation/med-cert-schema", () => ({
  validateMedCertPayload: mocks.validateMedCertPayload,
}))

vi.mock("@/lib/validation/repeat-script-schema", () => ({
  validateRepeatScriptPayload: vi.fn(() => ({ valid: true })),
}))

import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"

interface DuplicateGuestIntake {
  category: string
  checkout_error:
    | "safety_blocked_high_stakes"
    | "safety_missing_required_information"
  guest_email: string
  id: string
  is_priority: boolean
  payment_id: string
  payment_status: string
  status: string
  stripe_price_id: string
  subtype: string
}

function createGuestCheckoutSupabaseMock({
  duplicateIntake,
}: {
  duplicateIntake?: DuplicateGuestIntake
} = {}) {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = []
  const deletes: string[] = []

  const makeBuilder = (table: string) => {
    let operation: "select" | "insert" | "update" | "delete" | null = null
    let selectCount = 0
    const builder = {
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      is: vi.fn(() => builder),
      not: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(async () => ({ data: [], error: null })),
      select: vi.fn(() => {
        selectCount += 1
        if (!operation) operation = "select"
        return builder
      }),
      insert: vi.fn((payload: Record<string, unknown>) => {
        operation = "insert"
        inserts.push({ table, payload })
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
        if (table === "intakes" && operation === "insert" && duplicateIntake) {
          return { data: null, error: { code: "23505", message: "duplicate" } }
        }
        if (table === "intakes" && operation === "insert") return { data: { id: "intake-1" }, error: null }
        return { data: null, error: null }
      }),
      maybeSingle: vi.fn(async () => ({
        data: table === "intakes" && operation === "select" ? duplicateIntake || null : null,
        error: null,
      })),
      then: (resolve: (value: { data?: unknown; error: null }) => void) => {
        if (table === "profiles" && operation === "select" && selectCount > 1) {
          return Promise.resolve({ data: [], error: null }).then(resolve)
        }
        if (table === "intake_answers" && operation === "insert") {
          return Promise.resolve({ error: null }).then(resolve)
        }
        if (table === "intakes" && operation === "update") {
          return Promise.resolve({ data: [{ id: "intake-1" }], error: null }).then(resolve)
        }
        return Promise.resolve({ data: null, error: null }).then(resolve)
      },
    }
    return builder
  }

  return {
    deletes,
    inserts,
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
      metadata: { intake_id: "intake-1" },
      url: "https://checkout.stripe.test/pay/cs_test",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_test" })
    mocks.stripeSessionRetrieve.mockImplementation(async (sessionId: string) => ({
      id: sessionId,
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: `https://checkout.stripe.test/pay/${sessionId}`,
    }))
    mocks.validateMedCertPayload.mockReturnValue({ valid: true })
    mocks.validateSafetyFieldsPresent.mockReturnValue({ valid: true, missingFields: [] })
  })

  it("does not block checkout when business hours are closed", async () => {
    const result = await createIntakeAndCheckoutAction({
      answers: {},
      category: "consult",
      idempotencyKey: "test-idempotency-key",
      subtype: "ed",
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

  it("blocks authenticated checkout when no date of birth is available", async () => {
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      user: { id: "user-1", email: "patient@example.com" },
      profile: {
        id: "patient-1",
        date_of_birth: null,
        full_name: "Patient Example",
        stripe_customer_id: null,
      },
    })

    const result = await createIntakeAndCheckoutAction({
      answers: {
        terms_agreed: true,
        accuracy_confirmed: true,
      },
      category: "medical_certificate",
      idempotencyKey: "test-idempotency-key",
      subtype: "work",
      type: "med-cert",
    })

    expect(result).toEqual({
      success: false,
      error: "Date of birth is required to confirm you are 18 or older before payment.",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it("blocks guest checkout when date of birth is missing", async () => {
    const result = await createGuestCheckoutAction({
      answers: {
        terms_agreed: true,
        accuracy_confirmed: true,
      },
      category: "medical_certificate",
      guestEmail: "patient@example.test",
      guestName: "Test Patient",
      subtype: "work",
      type: "med-cert",
    })

    expect(result).toEqual({
      success: false,
      error: "Date of birth is required to confirm you are 18 or older before payment.",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
  })

  it.each([
    ["safety_blocked_high_stakes", "open"],
    ["safety_blocked_high_stakes", "paid"],
    ["safety_blocked_high_stakes", "processing"],
    ["safety_missing_required_information", "open"],
    ["safety_missing_required_information", "paid"],
    ["safety_missing_required_information", "processing"],
  ] as const)(
    "reconciles a duplicate guest checkout under %s when its exact-current Session is %s",
    async (checkoutError, sessionState) => {
      const duplicateIntake: DuplicateGuestIntake = {
        category: "medical_certificate",
        checkout_error: checkoutError,
        guest_email: "patient@example.test",
        id: "intake-existing",
        is_priority: false,
        payment_id: "cs_current",
        payment_status: sessionState === "paid" ? "paid" : "pending",
        status: sessionState === "paid" ? "paid" : "checkout_failed",
        stripe_price_id: "price_med_cert",
        subtype: "work",
      }
      const { supabase } = createGuestCheckoutSupabaseMock({ duplicateIntake })
      mocks.createServiceRoleClient.mockReturnValue(supabase)
      mocks.stripeSessionRetrieve.mockResolvedValue({
        id: "cs_current",
        metadata: { intake_id: "intake-existing" },
        payment_status: "unpaid",
        status: sessionState === "processing" ? "complete" : "open",
        url:
          sessionState === "open"
            ? "https://checkout.stripe.test/pay/cs_current"
            : null,
      })

      const result = await createGuestCheckoutAction({
        answers: {
          accuracy_confirmed: true,
          terms_agreed: true,
        },
        category: "medical_certificate",
        guestDateOfBirth: "1985-04-01",
        guestEmail: "patient@example.test",
        guestName: "Test Patient",
        subtype: "work",
        type: "med-cert",
      })

      if (sessionState === "open") {
        expect(result).toEqual({
          error:
            "This payment cannot be resumed safely right now. If you completed payment, contact support before trying again.",
          success: false,
        })
      } else {
        expect(result).toEqual({
          checkoutUrl:
            "http://localhost:3000/auth/complete-account?intake_id=intake-existing&session_id=cs_current",
          intakeId: "intake-existing",
          success: true,
        })
      }

      if (sessionState === "paid") {
        expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
      } else {
        expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_current")
      }
      expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
      expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    },
  )

  it("blocks authenticated prescribing checkout without valid Medicare details", async () => {
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      user: { id: "user-1", email: "patient@example.com" },
      profile: {
        id: "patient-1",
        date_of_birth: "1990-01-01",
        full_name: "Patient Example",
        stripe_customer_id: null,
      },
    })

    const result = await createIntakeAndCheckoutAction({
      answers: {
        agreedToTerms: true,
        confirmedAccuracy: true,
        addressLine1: "12 Manual Entry Road",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
        sex: "M",
      },
      category: "consult",
      idempotencyKey: "test-idempotency-key",
      subtype: "ed",
      type: "consult",
    })

    expect(result).toEqual({
      success: false,
      error: "Medicare number or IHI is required for prescription requests.",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("blocks guest prescribing checkout without valid Medicare details", async () => {
    const { inserts, supabase } = createGuestCheckoutSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const result = await createGuestCheckoutAction({
      answers: {
        agreedToTerms: true,
        confirmedAccuracy: true,
        medicareNumber: "0000000000",
        medicareIrn: "1",
        addressLine1: "12 Manual Entry Road",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
        sex: "M",
      },
      category: "consult",
      guestDateOfBirth: "1990-01-01",
      guestEmail: "patient@example.com",
      guestName: "Patient Example",
      guestPhone: "0412345678",
      subtype: "ed",
      type: "consult",
    })

    expect(result).toEqual({
      success: false,
      error: "Enter a valid Medicare number or provide a valid IHI.",
    })
    expect(inserts).toEqual([])
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
      subtype: "ed",
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

  it("returns a Priority review-specific error when the priority fee Stripe price is invalid", async () => {
    const { supabase, updates } = createGuestCheckoutSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionCreate.mockRejectedValue(new Error("No such price: price_priority"))

    const previousPriorityPrice = process.env.STRIPE_PRICE_PRIORITY_FEE
    process.env.STRIPE_PRICE_PRIORITY_FEE = "price_priority"

    try {
      const result = await createGuestCheckoutAction({
        answers: {
          terms_agreed: true,
          accuracy_confirmed: true,
          is_priority: true,
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
        error: "Priority review is temporarily unavailable. Please try again without it or contact support.",
      })
      expect(updates).toContainEqual({
        table: "intakes",
        payload: expect.objectContaining({
          checkout_error: "No such price: price_priority",
          status: "checkout_failed",
        }),
      })
    } finally {
      if (previousPriorityPrice === undefined) {
        delete process.env.STRIPE_PRICE_PRIORITY_FEE
      } else {
        process.env.STRIPE_PRICE_PRIORITY_FEE = previousPriorityPrice
      }
    }
  })

  it("persists a recoverable guest intake when the Priority price env is missing", async () => {
    const { deletes, inserts, supabase, updates } = createGuestCheckoutSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const previousPriorityPrice = process.env.STRIPE_PRICE_PRIORITY_FEE
    delete process.env.STRIPE_PRICE_PRIORITY_FEE

    try {
      const result = await createGuestCheckoutAction({
        answers: {
          terms_agreed: true,
          accuracy_confirmed: true,
          is_priority: true,
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
        error: "Priority review is temporarily unavailable. Please try again without it or contact support.",
      })
      expect(inserts).toContainEqual({
        table: "intakes",
        payload: expect.objectContaining({ is_priority: true }),
      })
      expect(inserts).toContainEqual({
        table: "intake_answers",
        payload: expect.objectContaining({ intake_id: "intake-1" }),
      })
      expect(deletes).not.toContain("intakes")
      expect(updates).toContainEqual({
        table: "intakes",
        payload: expect.objectContaining({
          checkout_error: "Missing STRIPE_PRICE_PRIORITY_FEE environment variable",
          status: "checkout_failed",
        }),
      })
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Missing STRIPE_PRICE_PRIORITY_FEE environment variable",
        }),
        expect.objectContaining({
          level: "fatal",
          tags: expect.objectContaining({
            checkout_error: "missing_price_env",
            price_role: "priority_fee",
          }),
        }),
      )
      expect(mocks.stripeSessionCreate).not.toHaveBeenCalled()
    } finally {
      if (previousPriorityPrice === undefined) {
        delete process.env.STRIPE_PRICE_PRIORITY_FEE
      } else {
        process.env.STRIPE_PRICE_PRIORITY_FEE = previousPriorityPrice
      }
    }
  })

  it("charges and persists Priority review for guest checkout", async () => {
    const { inserts, supabase } = createGuestCheckoutSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const previousPriorityPrice = process.env.STRIPE_PRICE_PRIORITY_FEE
    process.env.STRIPE_PRICE_PRIORITY_FEE = "price_priority\n"

    try {
      const result = await createGuestCheckoutAction({
        answers: {
          terms_agreed: true,
          accuracy_confirmed: true,
          is_priority: true,
        },
        category: "medical_certificate",
        guestDateOfBirth: "1985-04-01",
        guestEmail: "patient@example.test",
        guestName: "Test Patient",
        subtype: "work",
        type: "med-cert",
      })

      expect(result).toEqual({
        success: true,
        checkoutUrl: "https://checkout.stripe.test/pay/cs_test",
        intakeId: "intake-1",
      })
      expect(inserts).toContainEqual({
        table: "intakes",
        payload: expect.objectContaining({
          is_priority: true,
        }),
      })
      expect(mocks.stripeSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: "price_med_cert", quantity: 1 },
            { price: "price_priority", quantity: 1 },
          ],
          metadata: expect.objectContaining({
            is_priority: "true",
          }),
          payment_intent_data: expect.objectContaining({
            metadata: expect.objectContaining({
              is_priority: "true",
            }),
          }),
        }),
        { idempotencyKey: "guest-checkout-intake-1" },
      )
    } finally {
      if (previousPriorityPrice === undefined) {
        delete process.env.STRIPE_PRICE_PRIORITY_FEE
      } else {
        process.env.STRIPE_PRICE_PRIORITY_FEE = previousPriorityPrice
      }
    }
  })
})
