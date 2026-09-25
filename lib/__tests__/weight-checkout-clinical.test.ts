import { describe, expect, it, vi } from "vitest"

// Exercise the shared guest/authenticated checkout clinical path with the real
// canonical mapper, completeness checks and safety rules. Only external I/O is stubbed.
vi.mock("@/lib/feature-flags", () => ({
  isMedicationBlocked: vi.fn(async () => ({ blocked: false })),
  SERVICE_DISABLED_ERRORS: { MEDICATION_BLOCKED: "MEDICATION_BLOCKED" },
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackSafetyBlock: vi.fn(), trackSafetyOutcome: vi.fn(),
}))
vi.mock("@/lib/safety/audit-log", () => ({
  recordSafetyEvaluationForOperators: vi.fn(async () => {}),
}))

import { runClinicalValidation } from "@/lib/stripe/checkout/clinical-validation"
import type { CreateCheckoutInput } from "@/lib/stripe/checkout/types"

function weightInput(overrides: Record<string, unknown> = {}): CreateCheckoutInput {
  return {
    category: "consult", subtype: "weight_loss", type: "weight_loss", idempotencyKey: "weight-checkout-fixture",
    answers: {
      consultSubtype: "weight_loss", patient_dob: "1985-01-01", emergency_symptoms: [],
      weightKg: "100", heightCm: "175", targetWeight: "85", previousAttempts: "diet_exercise",
      weight_pregnancy_status: "no", weight_men2_thyroid_cancer: false,
      weight_pancreatitis: false, eatingDisorderHistory: "no", wlAdverseReactions: "no",
      weightLossGoals: "Improve my health and mobility over time.",
      ...overrides,
    },
  }
}

describe("weight assessment shared checkout clinical boundary", () => {
  it("allows a complete eligible assessment using the canonical catalog slug", async () => {
    expect(await runClinicalValidation(weightInput())).toMatchObject({
      ok: true, data: { serviceSlugForSafety: "weight-management", safetyCheck: { isAllowed: true } },
    })
  })

  it("allows the intermediate BMI band with an explicit qualifying-condition answer", async () => {
    expect(await runClinicalValidation(weightInput({ weightKg: "85", wlHasWeightComorbidity: true })))
      .toMatchObject({ ok: true })
  })

  it.each(["weight_men2_thyroid_cancer", "weight_pancreatitis"])("allows assessment but preserves doctor-review flag for %s", async (field) => {
    const result = await runClinicalValidation(weightInput({ [field]: true, weightLossMedPreference: "daily_oral" }))
    expect(result).toMatchObject({ ok: true, data: { safetyCheck: { isAllowed: true, riskTier: "high", triggeredRuleIds: [field] }, intakeFlags: [{ code: "weight_medicine_review", severity: "attention" }] } })
  })

  it.each([
    { weight_pregnancy_status: "yes" },
    { weightKg: "65" },
    { weightKg: "85", wlHasWeightComorbidity: false },
    { weightKg: "85", wlHasWeightComorbidity: undefined },
    { weightKg: "85", wlHasWeightComorbidity: null },
    { weightKg: "85", wlHasWeightComorbidity: "true" },
    { weight_pancreatitis: undefined },
    { weightKg: "not a number" },
    { heightCm: "0" },
    { weightKg: "301" },
    { weight_men2_thyroid_cancer: "false" },
    { weight_pregnancy_status: "unknown" },
    { eatingDisorderHistory: "unknown" },
  ])("blocks ineligible or incomplete assessment before payment: %j", async (answers) => {
    expect(await runClinicalValidation(weightInput(answers))).toMatchObject({ ok: false })
  })
})
