import { describe, expect,it } from "vitest"

import {
  edGoalsStepSchema,
  validateEdGoalsStep,
  validateEdHealthStep,
  validateEdPreferencesStep,
} from "@/lib/request/validation"

// ============================================================================
// ED OPENING STEP (duration + single severity item)
// ============================================================================

describe("edGoalsStepSchema", () => {
  const valid = { edDuration: "3_to_12_months", edErectionFrequency: 3 }

  it("passes with duration and a severity rating", () => {
    const result = edGoalsStepSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("fails when edDuration is missing", () => {
    const result = validateEdGoalsStep({ edErectionFrequency: 3 })
    expect(result.isValid).toBe(false)
    expect(result.errors.edDuration).toBeDefined()
  })

  it("fails when the severity rating is missing", () => {
    const result = validateEdGoalsStep({ edDuration: "3_to_12_months" })
    expect(result.isValid).toBe(false)
    expect(result.errors.edErectionFrequency).toBeDefined()
  })

  it("rejects severity ratings outside 1-5", () => {
    expect(validateEdGoalsStep({ ...valid, edErectionFrequency: 0 }).isValid).toBe(false)
    expect(validateEdGoalsStep({ ...valid, edErectionFrequency: 6 }).isValid).toBe(false)
  })

  it("accepts boundary severity ratings 1 and 5", () => {
    expect(validateEdGoalsStep({ ...valid, edErectionFrequency: 1 }).isValid).toBe(true)
    expect(validateEdGoalsStep({ ...valid, edErectionFrequency: 5 }).isValid).toBe(true)
  })

  // The goal chips were dropped on 2026-07-19 — no doctor surface used them.
  // A draft saved before that still carries one and must not be rejected.
  it("no longer requires edGoal but still accepts a stored one", () => {
    expect(validateEdGoalsStep(valid).isValid).toBe(true)
    expect(validateEdGoalsStep({ ...valid, edGoal: "improve_erections" }).isValid).toBe(true)
  })

  it("does not duplicate the checkout DOB age gate on the first clinical step", () => {
    const result = validateEdGoalsStep(valid)
    expect(result.isValid).toBe(true)
    expect(result.errors.edAgeConfirmed).toBeUndefined()
  })
})

// ============================================================================
// LEGACY IIEF-5 DRAFTS (step retired 2026-07-19)
// ============================================================================

/**
 * `unified-checkout` runs these step validators server-side, so a draft saved
 * before the IIEF-5 step was retired would be blocked at checkout on a question
 * the patient was never shown unless the stored assessment satisfies step 1.
 */
describe("edGoalsStepSchema — pre-2026-07-19 drafts", () => {
  it("accepts a stored IIEF-5 draft that has no edErectionFrequency", () => {
    const result = validateEdGoalsStep({
      edGoal: "improve_erections",
      edDuration: "3_to_12_months",
      iief1: 3,
      iiefTotal: 15,
    })
    expect(result.isValid).toBe(true)
  })

  it("accepts a stored draft carrying only the IIEF total", () => {
    const result = validateEdGoalsStep({ edDuration: "3_to_12_months", iiefTotal: 15 })
    expect(result.isValid).toBe(true)
  })

  it("still requires duration even on a legacy draft", () => {
    const result = validateEdGoalsStep({ iiefTotal: 15 })
    expect(result.isValid).toBe(false)
    expect(result.errors.edDuration).toBeDefined()
  })

  it("rejects an out-of-range stored IIEF total rather than trusting it blindly", () => {
    const result = validateEdGoalsStep({ edDuration: "3_to_12_months", iiefTotal: 99 })
    expect(result.isValid).toBe(false)
  })
})

// ============================================================================
// ED HEALTH STEP
// ============================================================================

describe("edHealthStepSchema", () => {
  const validMinimum = {
    edNitrates: false,
    edAlphaBlockers: false,
    edRecentHeartEvent: false,
    edSevereHeart: false,
    takes_medications: "no",
    has_allergies: "no",
    has_conditions: "no",
  }

  it("passes when the consolidated health screen is complete", () => {
    const result = validateEdHealthStep(validMinimum)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it("requires the full consolidated health screen before continuing", () => {
    const result = validateEdHealthStep({
      edNitrates: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.edAlphaBlockers).toBeDefined()
    expect(result.errors.takes_medications).toBeDefined()
    expect(result.errors.has_allergies).toBeDefined()
    expect(result.errors.has_conditions).toBeDefined()
  })

  it("no longer owns previous ED treatment — that moved to the treatment step", () => {
    const result = validateEdHealthStep(validMinimum)
    expect(result.isValid).toBe(true)
    expect(result.errors.previousEdMeds).toBeUndefined()
    expect(result.errors.edPreviousTreatment).toBeUndefined()
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

  it("passes when alpha blocker use is reported without GP clearance", () => {
    const result = validateEdHealthStep({
      ...validMinimum,
      edAlphaBlockers: true,
    })

    expect(result.isValid).toBe(true)
    expect(result.errors.edGpCleared).toBeUndefined()
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
    })
    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// ED PREFERENCES STEP
// ============================================================================

describe("edPreferencesStepSchema", () => {
  const validMinimum = { edPreference: "prn", previousEdMeds: false }

  it("passes with 'daily'", () => {
    const result = validateEdPreferencesStep({ ...validMinimum, edPreference: "daily" })
    expect(result.isValid).toBe(true)
  })

  it("passes with 'prn'", () => {
    const result = validateEdPreferencesStep(validMinimum)
    expect(result.isValid).toBe(true)
  })

  // The card was removed from the UI on 2026-07-19, but historical intakes and
  // in-flight drafts still carry the value and must keep validating.
  it("still accepts the retired 'doctor_decides' value from stored drafts", () => {
    const result = validateEdPreferencesStep({ ...validMinimum, edPreference: "doctor_decides" })
    expect(result.isValid).toBe(true)
  })

  it("fails when missing", () => {
    const result = validateEdPreferencesStep({})
    expect(result.isValid).toBe(false)
    expect(result.errors.edPreference).toBeDefined()
  })

  it("fails when empty string", () => {
    const result = validateEdPreferencesStep({ ...validMinimum, edPreference: "" })
    expect(result.isValid).toBe(false)
    expect(result.errors.edPreference).toBeDefined()
  })

  it("requires the previous-treatment question that moved off the health screen", () => {
    const result = validateEdPreferencesStep({ edPreference: "prn" })
    expect(result.isValid).toBe(false)
    expect(result.errors.previousEdMeds).toBeDefined()
  })

  it("requires the free-text detail when previous treatment is reported", () => {
    const result = validateEdPreferencesStep({ edPreference: "prn", previousEdMeds: true })
    expect(result.isValid).toBe(false)
    expect(result.errors.edPreviousTreatment).toBeDefined()
  })

  it("passes when previous treatment is described in the patient's own words", () => {
    const result = validateEdPreferencesStep({
      edPreference: "prn",
      previousEdMeds: true,
      edPreviousTreatment: "50mg, worked but wore off too fast",
      edAdditionalInfo: "Would prefer the longer-lasting one",
    })
    expect(result.isValid).toBe(true)
  })

  it("does not require the retired effectiveness chip", () => {
    const result = validateEdPreferencesStep({
      edPreference: "prn",
      previousEdMeds: true,
      edPreviousTreatment: "Tried one tablet, no effect",
    })
    expect(result.isValid).toBe(true)
    expect(result.errors.edPreviousEffectiveness).toBeUndefined()
  })
})
