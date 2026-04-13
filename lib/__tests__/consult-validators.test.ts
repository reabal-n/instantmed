import { describe, expect,it } from "vitest"

import {
  validateConsultBySubtype,
  validateContraceptionConsult,
  validateEdConsult,
  validateGeneralConsult,
  validateHairLossConsult,
  validateMorningAfterConsult,
  validateUtiConsult,
  validateWeightLossConsult,
  validateWomensGeneralConsult,
} from "../clinical/consult-validators"

// ============================================================================
// GENERAL CONSULT
// ============================================================================

describe("validateGeneralConsult", () => {
  it("passes with all required fields", () => {
    const result = validateGeneralConsult({
      consultCategory: "skin",
      consultDetails: "I have a persistent rash on my forearm that has been there for two weeks.",
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails without consultCategory", () => {
    const result = validateGeneralConsult({
      consultDetails: "I have a persistent rash on my forearm.",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Consultation category is required")
  })

  it("fails with invalid consultCategory", () => {
    const result = validateGeneralConsult({
      consultCategory: "dermatology",
      consultDetails: "I have a persistent rash on my forearm.",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Consultation category has an invalid value")
  })

  it("fails when consultDetails is too short", () => {
    const result = validateGeneralConsult({
      consultCategory: "general",
      consultDetails: "Rash",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Consultation details must be at least 20 characters")
  })

  it("warns on urgent requests", () => {
    const result = validateGeneralConsult({
      consultCategory: "infection",
      consultDetails: "Sore throat with swollen glands for three days.",
      consultUrgency: "urgent",
    })
    expect(result.valid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain("emergency")
  })

  it("rejects invalid urgency value", () => {
    const result = validateGeneralConsult({
      consultCategory: "skin",
      consultDetails: "I have a persistent rash on my forearm.",
      consultUrgency: "asap",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Urgency level has an invalid value")
  })
})

// ============================================================================
// ED CONSULT
// ============================================================================

describe("validateEdConsult", () => {
  const validEd = {
    edAgeConfirmed: true,
    edOnset: "gradual",
    edFrequency: "sometimes",
    edMorningErections: "sometimes",
    edPreference: "prn",
  }

  it("passes with all required fields", () => {
    const result = validateEdConsult(validEd)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails without age confirmation", () => {
    const result = validateEdConsult({ ...validEd, edAgeConfirmed: false })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("Age confirmation")
  })

  it("fails without required fields", () => {
    const result = validateEdConsult({ edAgeConfirmed: true })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })

  it("blocks on nitrate use", () => {
    const result = validateEdConsult({ ...validEd, edNitrates: "yes" })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "nitrate_interaction" })
    )
  })

  it("blocks on unmanaged recent cardiac event", () => {
    const result = validateEdConsult({
      ...validEd,
      edRecentHeartEvent: "yes",
      edGpCleared: false,
    })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "recent_cardiac_event" })
    )
  })

  it("allows managed cardiac event with clinical note", () => {
    const result = validateEdConsult({
      ...validEd,
      edRecentHeartEvent: "yes",
      edGpCleared: true,
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "cardiac_history_managed" })
    )
  })

  it("flags sudden onset for clinical review", () => {
    const result = validateEdConsult({ ...validEd, edOnset: "sudden" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "sudden_onset" })
    )
  })

  it("flags absent morning erections", () => {
    const result = validateEdConsult({ ...validEd, edMorningErections: "rarely" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "absent_morning_erections" })
    )
  })
})

// ============================================================================
// HAIR LOSS CONSULT
// ============================================================================

describe("validateHairLossConsult", () => {
  const validHair = {
    hairPattern: "male_pattern",
    hairDuration: "1_to_2_years",
    hairFamilyHistory: "yes_father",
    hairMedicationPreference: "oral",
  }

  it("passes with all required fields", () => {
    const result = validateHairLossConsult(validHair)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails without required fields", () => {
    const result = validateHairLossConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(4)
  })

  it("flags patchy hair loss", () => {
    const result = validateHairLossConsult({ ...validHair, hairPattern: "patchy" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "patchy_hair_loss" })
    )
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("flags recent onset hair loss", () => {
    const result = validateHairLossConsult({ ...validHair, hairDuration: "less_than_6_months" })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "recent_onset" })
    )
  })

  it("flags active scalp folliculitis", () => {
    const result = validateHairLossConsult({ ...validHair, scalpFolliculitis: true })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "scalp_folliculitis" })
    )
    expect(result.warnings).toContainEqual(expect.stringContaining("scalp infections"))
  })

  it("flags scalp psoriasis", () => {
    const result = validateHairLossConsult({ ...validHair, scalpPsoriasis: true })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "scalp_psoriasis" })
    )
  })
})

// ============================================================================
// CONTRACEPTION CONSULT
// ============================================================================

describe("validateContraceptionConsult", () => {
  const validContraception = {
    contraceptionType: "continue",
    contraceptionCurrent: "pill",
    pregnancyStatus: "no",
  }

  it("passes with all required fields", () => {
    const result = validateContraceptionConsult(validContraception)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails without required fields", () => {
    const result = validateContraceptionConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(3)
  })

  it("flags pregnancy for phone consultation", () => {
    const result = validateContraceptionConsult({
      ...validContraception,
      pregnancyStatus: "yes",
    })
    expect(result.valid).toBe(true) // Not blocked, just flagged
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "requires_call", reason: "pregnancy_confirmed" })
    )
  })

  it("flags uncertain pregnancy status", () => {
    const result = validateContraceptionConsult({
      ...validContraception,
      pregnancyStatus: "not_sure",
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "pregnancy_uncertain" })
    )
  })
})

// ============================================================================
// UTI CONSULT
// ============================================================================

describe("validateUtiConsult", () => {
  const validUti = {
    utiSymptoms: ["burning", "frequency"],
    utiRedFlags: "no",
    utiPregnant: "no",
  }

  it("passes with valid symptoms", () => {
    const result = validateUtiConsult(validUti)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails without symptoms", () => {
    const result = validateUtiConsult({ utiRedFlags: "no", utiPregnant: "no" })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("At least one UTI symptom must be selected")
  })

  it("fails with empty symptom array", () => {
    const result = validateUtiConsult({ utiSymptoms: [], utiRedFlags: "no", utiPregnant: "no" })
    expect(result.valid).toBe(false)
  })

  it("blocks on red flag symptoms", () => {
    const result = validateUtiConsult({ ...validUti, utiRedFlags: "yes" })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "uti_red_flags" })
    )
  })

  it("blocks on pregnancy", () => {
    const result = validateUtiConsult({ ...validUti, utiPregnant: "yes" })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "uti_pregnancy" })
    )
  })

  it("blocks on uncertain pregnancy", () => {
    const result = validateUtiConsult({ ...validUti, utiPregnant: "not_sure" })
    expect(result.valid).toBe(false)
  })

  it("flags haematuria for clinical review", () => {
    const result = validateUtiConsult({
      ...validUti,
      utiSymptoms: ["burning", "blood"],
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "haematuria" })
    )
  })
})

// ============================================================================
// MORNING-AFTER PILL CONSULT
// ============================================================================

describe("validateMorningAfterConsult", () => {
  it("passes within safe window", () => {
    const result = validateMorningAfterConsult({ hoursSinceIntercourse: "under_24" })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("passes at 24-72 hours", () => {
    const result = validateMorningAfterConsult({ hoursSinceIntercourse: "24_to_72" })
    expect(result.valid).toBe(true)
  })

  it("warns at 72-120 hours about reduced efficacy", () => {
    const result = validateMorningAfterConsult({ hoursSinceIntercourse: "72_to_120" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "map_reduced_efficacy" })
    )
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("blocks after 120 hours", () => {
    const result = validateMorningAfterConsult({ hoursSinceIntercourse: "over_120" })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "map_window_exceeded" })
    )
  })

  it("fails without time selection", () => {
    const result = validateMorningAfterConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Time since intercourse is required")
  })
})

// ============================================================================
// WEIGHT LOSS CONSULT
// ============================================================================

describe("validateWeightLossConsult", () => {
  const validWL = {
    currentWeight: 95,
    currentHeight: 175,
    targetWeight: 80,
    previousAttempts: "diet_exercise",
    eatingDisorderHistory: "no",
    weightLossMedPreference: "glp1",
    wlAdverseReactions: "no",
    weightLossGoals: "I want to improve my health and energy levels for my family.",
  }

  it("passes with all required fields", () => {
    const result = validateWeightLossConsult(validWL)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails without required fields", () => {
    const result = validateWeightLossConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(6)
  })

  it("rejects weight outside range", () => {
    const result = validateWeightLossConsult({ ...validWL, currentWeight: 15 })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Weight must be between 30 and 300 kg")
  })

  it("rejects height outside range", () => {
    const result = validateWeightLossConsult({ ...validWL, currentHeight: 50 })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Height must be between 100 and 250 cm")
  })

  it("rejects target weight >= current weight", () => {
    const result = validateWeightLossConsult({ ...validWL, targetWeight: 100 })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Target weight should be less than current weight for a weight loss consultation")
  })

  it("blocks underweight BMI", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      currentWeight: 45,
      currentHeight: 175,
      targetWeight: 40,
    })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "underweight" })
    )
  })

  it("flags sub-25 BMI", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      currentWeight: 68,
      currentHeight: 175,
      targetWeight: 60,
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "bmi_below_threshold" })
    )
  })

  it("flags aggressive weight loss target (>30%)", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      currentWeight: 120,
      targetWeight: 70,
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "aggressive_target" })
    )
  })

  it("requires call for eating disorder history", () => {
    const result = validateWeightLossConsult({ ...validWL, eatingDisorderHistory: "yes" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "requires_call", reason: "eating_disorder_history" })
    )
  })

  it("flags duromine + heart condition conflict", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      weightLossMedPreference: "duromine",
      wlHistoryHeartCondition: true,
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "duromine_cardiac_risk" })
    )
  })

  it("flags diabetes for clinical note", () => {
    const result = validateWeightLossConsult({ ...validWL, wlHistoryDiabetes: true })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "type_2_diabetes" })
    )
  })

  it("flags thyroid disorder", () => {
    const result = validateWeightLossConsult({ ...validWL, wlHistoryThyroid: true })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "thyroid_disorder" })
    )
  })

  it("requires adverse reaction details when indicated", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      wlAdverseReactions: "yes",
      wlAdverseReactionsDetails: "Nausea",
    })
    expect(result.valid).toBe(false) // "Nausea" is < 10 chars
    expect(result.errors).toContain("Adverse reaction details must be at least 10 characters")
  })

  it("accepts detailed adverse reaction description", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      wlAdverseReactions: "yes",
      wlAdverseReactionsDetails: "Severe nausea and vomiting lasting several days",
    })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "previous_adverse_reaction" })
    )
  })

  it("parses string numbers for weight/height", () => {
    const result = validateWeightLossConsult({
      ...validWL,
      currentWeight: "95",
      currentHeight: "175",
      targetWeight: "80",
    })
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// WOMEN'S GENERAL CONSULT
// ============================================================================

describe("validateWomensGeneralConsult", () => {
  it("passes with sufficient detail", () => {
    const result = validateWomensGeneralConsult({
      womensDetails: "Heavy periods lasting more than seven days each month.",
    })
    expect(result.valid).toBe(true)
  })

  it("fails with insufficient detail", () => {
    const result = validateWomensGeneralConsult({
      womensDetails: "Period pain",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Description of your concern must be at least 20 characters")
  })
})

// ============================================================================
// DISPATCHER
// ============================================================================

describe("validateConsultBySubtype", () => {
  it("routes general subtype correctly", () => {
    const result = validateConsultBySubtype("general", {
      consultCategory: "skin",
      consultDetails: "I have a rash that has been getting worse over two weeks.",
    })
    expect(result.valid).toBe(true)
  })

  it("routes ed subtype correctly", () => {
    const result = validateConsultBySubtype("ed", {
      edAgeConfirmed: true,
      edOnset: "gradual",
      edFrequency: "sometimes",
      edMorningErections: "yes",
      edPreference: "prn",
    })
    expect(result.valid).toBe(true)
  })

  it("routes weight_loss subtype correctly", () => {
    const result = validateConsultBySubtype("weight_loss", {
      currentWeight: 90,
      currentHeight: 170,
      targetWeight: 75,
      previousAttempts: "diet_exercise",
      eatingDisorderHistory: "no",
      weightLossMedPreference: "glp1",
      wlAdverseReactions: "no",
      weightLossGoals: "I want to feel healthier and more active in daily life.",
    })
    expect(result.valid).toBe(true)
  })

  it("routes womens_health_uti correctly", () => {
    const result = validateConsultBySubtype("womens_health_uti", {
      utiSymptoms: ["burning"],
      utiRedFlags: "no",
      utiPregnant: "no",
    })
    expect(result.valid).toBe(true)
  })

  it("routes womens_health_morning_after correctly", () => {
    const result = validateConsultBySubtype("womens_health_morning_after", {
      hoursSinceIntercourse: "under_24",
    })
    expect(result.valid).toBe(true)
  })

  it("routes womens_health_contraception correctly", () => {
    const result = validateConsultBySubtype("womens_health_contraception", {
      contraceptionType: "start",
      contraceptionCurrent: "none",
      pregnancyStatus: "no",
    })
    expect(result.valid).toBe(true)
  })

  it("routes womens_health_general correctly", () => {
    const result = validateConsultBySubtype("womens_health_general", {
      womensDetails: "Persistent lower abdominal cramping for the past month.",
    })
    expect(result.valid).toBe(true)
  })

  it("routes hair_loss correctly", () => {
    const result = validateConsultBySubtype("hair_loss", {
      hairPattern: "male_pattern",
      hairDuration: "more_than_2_years",
      hairFamilyHistory: "yes_both",
      hairMedicationPreference: "oral",
    })
    expect(result.valid).toBe(true)
  })
})
