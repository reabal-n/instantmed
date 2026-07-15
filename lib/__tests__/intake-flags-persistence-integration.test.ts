import { describe, expect, it, vi } from "vitest"

/**
 * Persistence-shape proof for the soften-to-flag model.
 *
 * Closes the gap the operator flagged on A3 boundary 1: the medication-step E2E
 * proves the patient *advances*, but not that the submitted intake actually
 * carries the flag into the row. `applySafetyTriage` (authed) and the guest
 * inline update both write `risk_flags: clinicalResult.data.intakeFlags`
 * VERBATIM, so proving `runClinicalValidation` emits the flag for a softened
 * payload proves what gets persisted.
 *
 * The safety engine + blocklist are mocked to deterministic-allow so this test
 * isolates the emitter→result wiring (the real validateRepeatScriptPayload still
 * runs, so the softening itself is exercised, not stubbed).
 */

vi.mock("@/lib/safety/evaluate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/safety/evaluate")>()
  return {
    ...actual,
    validateSafetyFieldsPresent: vi.fn(() => ({ valid: true, missingFields: [] })),
    checkSafetyForServer: vi.fn(() => ({
      isAllowed: true,
      outcome: "ALLOW" as const,
      riskTier: "low" as const,
      requiresCall: false,
      triggeredRuleIds: [] as string[],
      blockReason: undefined,
    })),
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

import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"

function missingStrengthRepeatInput() {
  return {
    category: "prescription",
    subtype: "repeat",
    serviceSlug: "repeat-script",
    answers: {
      medications: [{ name: "Atorvastatin", form: "tablet", pbsCode: "1234" }], // no strength
      prescribed_before: true,
      doseChanged: false,
      dose_changed: false,
      hasSideEffects: false,
      last_prescribed: "6_to_12_months",
      current_dose: "20 mg nightly",
    },
  } as never
}

describe("intake flags persistence shape (what risk_flags receives)", () => {
  it("a missing-strength repeat is allowed and carries a medication_strength_missing attention flag", async () => {
    const result = await runClinicalValidation(missingStrengthRepeatInput())

    expect(result.ok).toBe(true)
    const flags = result.ok ? result.data.intakeFlags : []
    const flag = flags.find((f) => f.code === "medication_strength_missing")
    expect(flag, "the flag persisted to risk_flags").toBeDefined()
    expect(flag?.severity).toBe("attention")
  })

  it("a name-only repeat (no strength, no form) carries BOTH strength and form attention flags", async () => {
    const input = {
      category: "prescription",
      subtype: "repeat",
      serviceSlug: "repeat-script",
      answers: {
        medications: [{ name: "Atorvastatin", pbsCode: "1234" }], // no strength, no form
        prescribed_before: true,
        doseChanged: false,
        dose_changed: false,
        hasSideEffects: false,
        last_prescribed: "6_to_12_months",
        current_dose: "20 mg nightly",
      },
    } as never

    const result = await runClinicalValidation(input)

    expect(result.ok).toBe(true)
    const flags = result.ok ? result.data.intakeFlags : []
    const codes = flags.map((f) => f.code)
    expect(codes).toContain("medication_strength_missing")
    expect(codes).toContain("medication_form_missing")
    expect(flags.every((f) => f.severity === "attention")).toBe(true)
  })

  it("an unknown medicine WITH a useful description carries medication_needs_identification + the description", async () => {
    const input = {
      category: "prescription",
      subtype: "repeat",
      serviceSlug: "repeat-script",
      answers: {
        medications: [
          {
            name: "Unknown - doctor will confirm",
            pbsCode: "UNKNOWN",
            description: "small white blood pressure tablet, prescribed by Dr Smith",
          },
        ],
        prescribed_before: true,
        doseChanged: false,
        dose_changed: false,
        hasSideEffects: false,
        last_prescribed: "6_to_12_months",
        current_dose: "one daily",
      },
    } as never

    const result = await runClinicalValidation(input)

    expect(result.ok).toBe(true)
    const flags = result.ok ? result.data.intakeFlags : []
    const flag = flags.find((f) => f.code === "medication_needs_identification")
    expect(flag, "the identification flag persisted to risk_flags").toBeDefined()
    expect(flag?.severity).toBe("attention")
    expect(flag?.detail).toBe("small white blood pressure tablet, prescribed by Dr Smith")
  })
})
