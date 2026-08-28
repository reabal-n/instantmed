import { describe, expect,it } from "vitest"

import {
  validateEdConsult,
  validateHairLossConsult,
} from "../clinical/consult-validators"
import { checkSafetyForServer } from "../safety/evaluate"

// ============================================================================
// ED CONSULT
// ============================================================================

describe("validateEdConsult", () => {
  const validEd = {
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

  it("leaves age enforcement to the checkout DOB gate", () => {
    const result = validateEdConsult(validEd)
    expect(result.valid).toBe(true)
    expect(result.errors).not.toContainEqual(expect.stringContaining("Age confirmation"))
  })

  it("fails without required fields", () => {
    const result = validateEdConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  // Three generations of ED intake reach this validator. Each must be checked
  // against the instrument it was actually collected with, so an in-flight
  // draft or a historical intake never fails on a field that did not exist yet.
  describe("intake generations", () => {
    const currentEd = {
      edDuration: "3_to_12_months",
      edErectionFrequency: 3,
      edPreference: "prn",
    }

    it("passes the current duration + severity flow", () => {
      const result = validateEdConsult(currentEd)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("requires the severity rating in the current flow", () => {
      const result = validateEdConsult({ edDuration: "3_to_12_months", edPreference: "prn" })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining("Erection frequency"))
    })

    it("rejects an out-of-range severity rating", () => {
      const result = validateEdConsult({ ...currentEd, edErectionFrequency: 9 })
      expect(result.valid).toBe(false)
    })

    it("no longer requires edGoal", () => {
      const result = validateEdConsult(currentEd)
      expect(result.valid).toBe(true)
      expect(result.errors).not.toContainEqual(expect.stringContaining("ED goal"))
    })

    it("still validates a stored IIEF-5 intake against the IIEF-5 rules", () => {
      const result = validateEdConsult({
        edGoal: "improve_erections",
        edDuration: "3_to_12_months",
        iief1: 3, iief2: 3, iief3: 3, iief4: 3, iief5: 3, iiefTotal: 15,
        edPreference: "prn",
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("fails a stored IIEF-5 intake that is missing part of the set", () => {
      const result = validateEdConsult({
        edDuration: "3_to_12_months",
        iief1: 3, iief2: 3, iiefTotal: 15,
        edPreference: "prn",
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining("IIEF3"))
    })

    it("does not demand the new severity field from a stored IIEF-5 intake", () => {
      const result = validateEdConsult({
        edDuration: "3_to_12_months",
        iief1: 4, iief2: 4, iief3: 4, iief4: 4, iief5: 4, iiefTotal: 20,
        edPreference: "daily",
      })
      expect(result.valid).toBe(true)
      expect(result.errors).not.toContainEqual(expect.stringContaining("Erection frequency"))
    })
  })

  it("blocks on nitrate use", () => {
    const result = validateEdConsult({ ...validEd, edNitrates: "yes" })
    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "nitrate_interaction" })
    )
  })

  it("recognizes current boolean ED safety fields", () => {
    const result = validateEdConsult({
      edGoal: "improve_erections",
      edDuration: "6_12_months",
      iief1: 3,
      iief2: 3,
      iief3: 3,
      iief4: 3,
      iief5: 3,
      edPreference: "prn",
      edNitrates: true,
    })

    expect(result.valid).toBe(false)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "nitrate_interaction" }),
    )
    expect(result.errors).not.toContain("Symptom onset is required")
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

  it("accepts doctor_decides preference", () => {
    const result = validateEdConsult({ ...validEd, edPreference: "doctor_decides" })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("accepts daily preference", () => {
    const result = validateEdConsult({ ...validEd, edPreference: "daily" })
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// HAIR LOSS CONSULT
// ============================================================================

describe("validateHairLossConsult", () => {
  const validHair = {
    hairGoal: "regrow",
    hairOnset: "over_12_months",
    hairPattern: "noticeable_thinning",
    hairFamilyHistory: "yes_father",
    hairReproductive: "no",
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
    expect(result.errors.length).toBe(6)
  })

  it("flags reproductive contraindication as hard block", () => {
    const result = validateHairLossConsult({ ...validHair, hairReproductive: "yes" })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "safety_block", reason: "reproductive_contraindication" })
    )
  })

  it.each(["consult", "mens-health-hair", "hair-loss"])(
    "declines the reproductive contraindication through the %s server-safety slug",
    (serviceSlug) => {
      const result = checkSafetyForServer(serviceSlug, {
        ...validHair,
        consultSubtype: "hair_loss",
        emergency_symptoms: [],
        hairReproductive: "yes",
      })

      expect(result.outcome).toBe("DECLINE")
      expect(result.triggeredRuleIds).toContain("hair_reproductive_contraindication")
    },
  )

  it.each(["no", "na"])(
    "allows the exact safe reproductive answer %s through server safety",
    (hairReproductive) => {
      const result = checkSafetyForServer("consult", {
        ...validHair,
        consultSubtype: "hair_loss",
        emergency_symptoms: [],
        hairReproductive,
      })

      expect(result.outcome).toBe("ALLOW")
      expect(result.triggeredRuleIds).not.toContain("hair_reproductive_contraindication")
    },
  )

  it("flags no visible loss", () => {
    const result = validateHairLossConsult({ ...validHair, hairPattern: "none" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "no_visible_loss" })
    )
  })

  it("flags extensive loss with warning", () => {
    const result = validateHairLossConsult({ ...validHair, hairPattern: "extensive" })
    expect(result.valid).toBe(true)
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "extensive_loss" })
    )
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("flags recent onset hair loss", () => {
    const result = validateHairLossConsult({ ...validHair, hairOnset: "under_6_months" })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "recent_onset" })
    )
  })

  it("still accepts legacy stored hair-loss onset values", () => {
    for (const hairOnset of ["few_months", "1_2_years", "2_plus_years"]) {
      const result = validateHairLossConsult({ ...validHair, hairOnset })
      expect(result.valid).toBe(true)
    }
  })

  it("accepts compact and legacy hair-loss family-history values", () => {
    for (const hairFamilyHistory of ["no_or_unsure", "no", "unknown"]) {
      const result = validateHairLossConsult({ ...validHair, hairFamilyHistory })
      expect(result.valid).toBe(true)
    }
  })

  it("accepts combination preference", () => {
    const result = validateHairLossConsult({ ...validHair, hairMedicationPreference: "combination" })
    expect(result.valid).toBe(true)
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

  it("flags low blood pressure", () => {
    const result = validateHairLossConsult({ ...validHair, hairLowBP: true })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "low_blood_pressure" })
    )
  })

  it("flags heart conditions", () => {
    const result = validateHairLossConsult({ ...validHair, hairHeartConditions: true })
    expect(result.flags).toContainEqual(
      expect.objectContaining({ type: "clinical_note", reason: "heart_conditions" })
    )
  })
})
