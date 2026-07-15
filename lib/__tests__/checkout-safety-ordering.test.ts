import { beforeEach, describe, expect, it, type Mock,vi } from "vitest"

// ---------------------------------------------------------------------------
// CLAUDE.md invariant (checkout safety enforcement):
//   "Authenticated, guest, and retry-payment checkout paths must call
//    validateSafetyFieldsPresent() BEFORE checkSafetyForServer()."
//
// A missing safety-critical answer must short-circuit to REQUEST_MORE_INFO and
// must NOT reach the safety-rules engine (and, for retry, must not reach Stripe
// — no payment is taken on an incomplete intake). This contract pins the order
// for all three paths:
//   - authenticated + guest share runClinicalValidation()
//   - retry-payment inlines the same two calls in retryPaymentForIntakeAction()
//
// We wrap the two real safety functions in spies so we can both assert their
// invocation order and force the "fields missing" branch deterministically.
// ---------------------------------------------------------------------------

vi.mock("@/lib/safety/evaluate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/safety/evaluate")>()
  return {
    ...actual,
    validateSafetyFieldsPresent: vi.fn(actual.validateSafetyFieldsPresent),
    checkSafetyForServer: vi.fn(actual.checkSafetyForServer),
  }
})
vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: vi.fn(async () => ({ blocked: false })),
  SERVICE_DISABLED_ERRORS: { MEDICATION_BLOCKED: "MEDICATION_BLOCKED" },
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackSafetyBlock: vi.fn(),
  trackSafetyOutcome: vi.fn(),
}))
vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: vi.fn(async () => {}),
}))
vi.mock("@/lib/validation/repeat-script-schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validation/repeat-script-schema")>()
  return {
    ...actual,
    validateRepeatScriptPayload: vi.fn(actual.validateRepeatScriptPayload),
  }
})
// retry-payment.ts collaborators (only reached after the safety gate; mocked so
// the module loads and the post-safety path is inert for these tests).
vi.mock("@/lib/auth/helpers", () => ({
  getAuthenticatedUserWithProfile: vi.fn(),
}))
vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: vi.fn(async () => ({ success: true })),
}))
vi.mock("@/lib/data/intake-answers", () => ({
  getIntakeAnswersForPaymentSafety: vi.fn(),
}))
vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
}))
vi.mock("@/lib/stripe/checkout/missing-safety-payment-hold", () => ({
  holdCheckoutForMissingSafetyInformation: vi.fn(async () => "held"),
}))

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { getIntakeAnswersForPaymentSafety } from "@/lib/data/intake-answers"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { checkSafetyForServer, validateSafetyFieldsPresent } from "@/lib/safety/evaluate"
import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"
import { holdCheckoutForMissingSafetyInformation } from "@/lib/stripe/checkout/missing-safety-payment-hold"
import { retryPaymentForIntakeAction } from "@/lib/stripe/checkout/retry-payment"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

import { mockSupabaseSingle, resetAllMocks } from "./setup"

const mock = (fn: unknown) => fn as Mock

/** A med-cert payload that passes validateMedCertPayload and is NOT high-stakes,
 *  so execution reaches the field-presence -> safety-rules ordering under test. */
function medCertInput() {
  return {
    category: "medical_certificate",
    subtype: "1_day",
    type: "med_cert",
    serviceSlug: "med-certs",
    idempotencyKey: "idem-key-1234567890",
    answers: {
      certificate_type: "work",
      duration: "1",
      symptoms_description: "head cold, sore throat and fatigue, need one day off",
      symptom_duration: "today",
      start_date: new Date().toISOString().slice(0, 10),
      telehealth_consent_given: true,
      accuracy_confirmed: true,
      terms_agreed: true,
    },
  } as never
}

function repeatScriptInput(sideEffectAnswers: Record<string, unknown>) {
  return {
    category: "prescription",
    subtype: "repeat",
    type: "repeat_rx",
    idempotencyKey: "idem-key-1234567890",
    answers: {
      pbs_code: "MANUAL",
      medication_name: "Rosuvastatin",
      medication_display: "Rosuvastatin",
      medication_strength: "10 mg",
      medication_form: "tablet",
      prescribed_before: true,
      doseChanged: false,
      dose_changed: false,
      last_prescribed: "6_to_12_months",
      current_dose: "10 mg nightly",
      emergency_symptoms: [],
      ...sideEffectAnswers,
    },
  } as never
}

beforeEach(() => {
  resetAllMocks()
  mock(validateSafetyFieldsPresent).mockClear()
  mock(checkSafetyForServer).mockClear()
  mock(validateRepeatScriptPayload).mockClear()
  mock(recordSafetyEvaluationForOperators).mockClear()
})

describe("shared checkout path (authenticated + guest via runClinicalValidation)", () => {
  it("validates field presence BEFORE evaluating the safety rules", async () => {
    // Force fields-present so execution proceeds into the safety engine,
    // letting us observe the relative call order of the two gates.
    mock(validateSafetyFieldsPresent).mockReturnValueOnce({ valid: true, missingFields: [] })

    await runClinicalValidation(medCertInput())

    expect(validateSafetyFieldsPresent).toHaveBeenCalledTimes(1)
    expect(checkSafetyForServer).toHaveBeenCalledTimes(1)
    expect(mock(validateSafetyFieldsPresent).mock.invocationCallOrder[0]).toBeLessThan(
      mock(checkSafetyForServer).mock.invocationCallOrder[0],
    )
  })

  it("short-circuits on missing fields and never runs the safety engine", async () => {
    mock(validateSafetyFieldsPresent).mockReturnValueOnce({
      valid: false,
      missingFields: ["symptom_duration"],
    })

    const result = await runClinicalValidation(medCertInput())

    expect(result.ok).toBe(false)
    expect("error" in result ? result.error : "").toMatch(/missing/i)
    expect(checkSafetyForServer).not.toHaveBeenCalled()
  })

  it.each([
    ["a missing yes/no answer", {}],
    ["a true answer with blank details", { hasSideEffects: true, sideEffects: "   " }],
  ])("uses canonical repeat completeness for %s before auth/guest safety evaluation", async (
    _case,
    sideEffectAnswers,
  ) => {
    const result = await runClinicalValidation(repeatScriptInput(sideEffectAnswers))

    expect(result.ok).toBe(false)
    expect("error" in result ? result.error : "").toMatch(/required medical information is missing/i)
    expect(validateRepeatScriptPayload).not.toHaveBeenCalled()
    expect(validateSafetyFieldsPresent).toHaveBeenCalledWith(
      "common-scripts",
      expect.objectContaining(sideEffectAnswers),
    )
    expect(recordSafetyEvaluationForOperators).toHaveBeenCalledWith({
      answers: expect.objectContaining(sideEffectAnswers),
      context: "checkout",
      result: {
        isAllowed: false,
        outcome: "REQUEST_MORE_INFO",
        riskTier: "high",
        blockReason: "Required medical information is missing.",
        requiresCall: false,
        triggeredRuleIds: ["missing_safety_fields"],
      },
      serviceSlug: "common-scripts",
    })
    expect(checkSafetyForServer).not.toHaveBeenCalled()
  })
})

describe("retry-payment path (retryPaymentForIntakeAction)", () => {
  const retryableIntake = {
    id: "intake-1",
    status: "pending_payment",
    payment_status: "unpaid",
    category: "medical_certificate",
    subtype: "1_day",
    payment_id: null,
    amount_cents: 2495,
    service: { id: "svc", slug: "med-certs", name: "Medical Certificate", type: "med_certs", price_cents: 2495 },
    answers: [{ answers: { certificate_type: "work", duration: "1" } }],
  }

  beforeEach(() => {
    mock(getAuthenticatedUserWithProfile).mockResolvedValue({
      user: { id: "user-1", email: "jane@example.com" },
      profile: { id: "pat-1", stripe_customer_id: null },
    })
    mock(getIntakeAnswersForPaymentSafety).mockResolvedValue({
      certificate_type: "work",
      duration: "1",
    })
    mockSupabaseSingle.mockResolvedValue({ data: retryableIntake, error: null })
  })

  it("short-circuits on missing fields and never runs the safety engine or takes payment", async () => {
    mock(validateSafetyFieldsPresent).mockReturnValueOnce({
      valid: false,
      missingFields: ["symptom_duration"],
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/missing/i)
    expect(result.paymentRecoveryReason).toBe("more_information_required")
    // The safety engine must not run, and we must not have reached Stripe.
    expect(validateSafetyFieldsPresent).toHaveBeenCalledTimes(1)
    expect(holdCheckoutForMissingSafetyInformation).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeId: "intake-1",
        missingFields: ["symptom_duration"],
        patientId: "pat-1",
        source: "retry_payment",
      }),
    )
    expect(checkSafetyForServer).not.toHaveBeenCalled()
  })

  it("projects a known persisted hold when exact-Session invalidation remains unresolved", async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: {
        ...retryableIntake,
        checkout_error: "safety_missing_required_information",
      },
      error: null,
    })
    mock(holdCheckoutForMissingSafetyInformation).mockResolvedValueOnce(
      "held_invalidation_unresolved",
    )

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result.success).toBe(false)
    expect(result.paymentRecoveryReason).toBe("more_information_required")
    expect(getIntakeAnswersForPaymentSafety).not.toHaveBeenCalled()
    expect(checkSafetyForServer).not.toHaveBeenCalled()
    expect(revalidatePatient).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "pat-1",
    })
    expect(revalidateStaff).toHaveBeenCalledWith({
      intakeId: "intake-1",
      patientId: "pat-1",
    })
  })

  it.each(["state_changed", "unresolved", "payment_in_flight"] as const)(
    "does not project a held recovery reason for %s reconciliation",
    async (holdResult) => {
    mockSupabaseSingle.mockResolvedValue({
      data: {
        ...retryableIntake,
        checkout_error: "safety_missing_required_information",
      },
      error: null,
    })
    mock(holdCheckoutForMissingSafetyInformation).mockResolvedValueOnce(holdResult)

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result.success).toBe(false)
    expect(result.paymentRecoveryReason).toBeUndefined()
    expect(getIntakeAnswersForPaymentSafety).not.toHaveBeenCalled()
    expect(checkSafetyForServer).not.toHaveBeenCalled()
    },
  )

  it("runs field presence BEFORE the safety engine on a complete intake", async () => {
    mock(validateSafetyFieldsPresent).mockReturnValueOnce({ valid: true, missingFields: [] })
    // Block at the safety engine so the action returns before Stripe/cookies.
    mock(checkSafetyForServer).mockReturnValueOnce({
      isAllowed: false,
      outcome: "DECLINE",
      riskTier: "high",
      blockReason: "blocked for test",
      requiresCall: false,
      triggeredRuleIds: [],
    })

    const result = await retryPaymentForIntakeAction("intake-1")

    expect(result.success).toBe(false)
    expect(validateSafetyFieldsPresent).toHaveBeenCalledTimes(1)
    expect(checkSafetyForServer).toHaveBeenCalledTimes(1)
    expect(mock(validateSafetyFieldsPresent).mock.invocationCallOrder[0]).toBeLessThan(
      mock(checkSafetyForServer).mock.invocationCallOrder[0],
    )
  })
})
