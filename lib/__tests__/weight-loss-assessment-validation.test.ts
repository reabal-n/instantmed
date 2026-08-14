import { describe, expect, it } from "vitest"

import { validateWeightLossAssessmentStep } from "@/lib/request/validation"

const validAnswers = {
  weightKg: "95",
  heightCm: "175",
  targetWeight: "80",
  previousAttempts: "diet_exercise",
  eatingDisorderHistory: "no",
  weight_pregnancy_status: "no",
  weight_men2_thyroid_cancer: false,
  weight_pancreatitis: false,
  wlAdverseReactions: "no",
  weightLossGoals: "Improve my health and mobility over time.",
}

describe("weight-loss assessment validation", () => {
  it("accepts a complete screen with explicit negative contraindication answers", () => {
    expect(validateWeightLossAssessmentStep(validAnswers)).toEqual({
      isValid: true,
      errors: {},
    })
  })

  it.each([
    ["weight_pregnancy_status", "weight_pregnancy_status"],
    ["weight_men2_thyroid_cancer", "weight_men2_thyroid_cancer"],
    ["weight_pancreatitis", "weight_pancreatitis"],
    ["eatingDisorderHistory", "eatingDisorderHistory"],
  ] as const)("fails closed when %s is unanswered", (answerKey, errorKey) => {
    const answers: Record<string, unknown> = { ...validAnswers }
    delete answers[answerKey]

    const result = validateWeightLossAssessmentStep(answers)

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveProperty(errorKey)
  })

  it.each([
    ["weightKg", "29", "weightKg"],
    ["weightKg", "301", "weightKg"],
    ["heightCm", "99", "heightCm"],
    ["heightCm", "251", "heightCm"],
  ] as const)("rejects out-of-range %s=%s before progression", (answerKey, value, errorKey) => {
    const result = validateWeightLossAssessmentStep({
      ...validAnswers,
      [answerKey]: value,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveProperty(errorKey)
  })

  it("requires meaningful detail after a reported adverse reaction", () => {
    const result = validateWeightLossAssessmentStep({
      ...validAnswers,
      wlAdverseReactions: "yes",
      wlAdverseReactionsDetails: "         ",
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveProperty("wlAdverseReactionsDetails")
  })

  it("counts trimmed goal text, matching the checkout gate", () => {
    const result = validateWeightLossAssessmentStep({
      ...validAnswers,
      weightLossGoals: "                    ",
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveProperty("weightLossGoals")
  })
})
