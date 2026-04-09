import { describe, it, expect } from "vitest"
import {
  edGoalsStepSchema,
  edAssessmentStepSchema,
  edHealthStepSchema,
  edPreferencesStepSchema,
  validateEdGoalsStep,
  validateEdAssessmentStep,
  validateEdHealthStep,
  validateEdPreferencesStep,
} from "@/lib/request/validation"

// ============================================================================
// ED GOALS STEP
// ============================================================================

describe("edGoalsStepSchema", () => {
  it("passes with valid data", () => {
    const result = edGoalsStepSchema.safeParse({
      edGoal: "improve_erections",
      edDuration: "6_months_to_1_year",
      edAgeConfirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it("fails when edGoal is missing", () => {
    const result = validateEdGoalsStep({
      edDuration: "6_months_to_1_year",
      edAgeConfirmed: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edGoal).toBeDefined()
  })

  it("fails when edDuration is missing", () => {
    const result = validateEdGoalsStep({
      edGoal: "improve_erections",
      edAgeConfirmed: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edDuration).toBeDefined()
  })

  it("fails when age not confirmed (false)", () => {
    const result = validateEdGoalsStep({
      edGoal: "improve_erections",
      edDuration: "less_than_6_months",
      edAgeConfirmed: false,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edAgeConfirmed).toBeDefined()
  })

  it("fails when edGoal is empty string", () => {
    const result = validateEdGoalsStep({
      edGoal: "",
      edDuration: "less_than_6_months",
      edAgeConfirmed: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edGoal).toBeDefined()
  })
})

// ============================================================================
// ED ASSESSMENT STEP (IIEF-5)
// ============================================================================

describe("edAssessmentStepSchema", () => {
  const validScores = { iief1: 3, iief2: 4, iief3: 2, iief4: 5, iief5: 1 }

  it("passes with all 5 scores (1-5 each)", () => {
    const result = edAssessmentStepSchema.safeParse(validScores)
    expect(result.success).toBe(true)
  })

  it("fails when any score is missing", () => {
    const { iief3: _, ...missingOne } = validScores
    const result = validateEdAssessmentStep(missingOne)
    expect(result.isValid).toBe(false)
    expect(result.errors.iief3).toBeDefined()
  })

  it("fails when score < 1", () => {
    const result = validateEdAssessmentStep({ ...validScores, iief1: 0 })
    expect(result.isValid).toBe(false)
    expect(result.errors.iief1).toBeDefined()
  })

  it("fails when score > 5", () => {
    const result = validateEdAssessmentStep({ ...validScores, iief2: 6 })
    expect(result.isValid).toBe(false)
    expect(result.errors.iief2).toBeDefined()
  })

  it("accepts boundary values 1 and 5", () => {
    const result = edAssessmentStepSchema.safeParse({
      iief1: 1, iief2: 5, iief3: 1, iief4: 5, iief5: 1,
    })
    expect(result.success).toBe(true)
  })

  it("fails when all scores missing", () => {
    const result = validateEdAssessmentStep({})
    expect(result.isValid).toBe(false)
    expect(Object.keys(result.errors).length).toBe(5)
  })
})

// ============================================================================
// ED HEALTH STEP
// ============================================================================

describe("edHealthStepSchema", () => {
  const validMinimum = {
    edNitrates: false,
    edRecentHeartEvent: false,
    edSevereHeart: false,
  }

  it("passes with minimum required fields", () => {
    const result = validateEdHealthStep(validMinimum)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it("fails (hard block) when nitrates is true", () => {
    const result = validateEdHealthStep({ ...validMinimum, edNitrates: true })
    expect(result.isValid).toBe(false)
    expect(result.errors.edNitrates).toContain("nitrates")
  })

  it("fails when recentHeartEvent true without GP clearance", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      edRecentHeartEvent: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edGpCleared).toBeDefined()
  })

  it("passes when recentHeartEvent true WITH GP clearance", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      edRecentHeartEvent: true,
      edGpCleared: true,
    })
    expect(result.isValid).toBe(true)
  })

  it("fails when severeHeart true without GP clearance", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      edSevereHeart: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edGpCleared).toBeDefined()
  })

  it("passes when severeHeart true WITH GP clearance", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      edSevereHeart: true,
      edGpCleared: true,
    })
    expect(result.isValid).toBe(true)
  })

  it("requires allergy details when has_allergies is 'yes'", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      has_allergies: "yes",
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.known_allergies).toBeDefined()
  })

  it("passes when has_allergies 'yes' with details", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      has_allergies: "yes",
      known_allergies: "Penicillin",
    })
    expect(result.isValid).toBe(true)
  })

  it("requires medication details when takes_medications is 'yes'", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      takes_medications: "yes",
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.current_medications).toBeDefined()
  })

  it("passes when takes_medications 'yes' with details", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      takes_medications: "yes",
      current_medications: "Metformin 500mg",
    })
    expect(result.isValid).toBe(true)
  })

  it("requires condition details when has_conditions is 'yes'", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      has_conditions: "yes",
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.existing_conditions).toBeDefined()
  })

  it("passes when has_conditions 'yes' with details", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      has_conditions: "yes",
      existing_conditions: "Type 2 diabetes",
    })
    expect(result.isValid).toBe(true)
  })

  it("passes with all optional fields populated", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      edHypertension: true,
      edDiabetes: false,
      edBpMedication: true,
      has_allergies: "no",
      has_conditions: "no",
      takes_medications: "no",
      previousEdMeds: true,
      edPreviousTreatment: "Sildenafil",
      edPreviousEffectiveness: "effective",
    })
    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// ED PREFERENCES STEP
// ============================================================================

describe("edPreferencesStepSchema", () => {
  it("passes with 'daily'", () => {
    const result = validateEdPreferencesStep({ edPreference: "daily" })
    expect(result.isValid).toBe(true)
  })

  it("passes with 'doctor_decides'", () => {
    const result = validateEdPreferencesStep({ edPreference: "doctor_decides" })
    expect(result.isValid).toBe(true)
  })

  it("passes with 'prn'", () => {
    const result = validateEdPreferencesStep({ edPreference: "prn" })
    expect(result.isValid).toBe(true)
  })

  it("fails when missing", () => {
    const result = validateEdPreferencesStep({})
    expect(result.isValid).toBe(false)
    expect(result.errors.edPreference).toBeDefined()
  })

  it("fails when empty string", () => {
    const result = validateEdPreferencesStep({ edPreference: "" })
    expect(result.isValid).toBe(false)
    expect(result.errors.edPreference).toBeDefined()
  })
})
