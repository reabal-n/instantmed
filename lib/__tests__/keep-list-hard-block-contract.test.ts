import { describe, expect, it } from "vitest"

import { checkHighStakesUseCase, isControlledSubstance } from "@/lib/clinical/intake-validation"
import { validateWomensHealthAssessmentStep } from "@/lib/request/validation"
import { checkSafetyForServer } from "@/lib/safety/evaluate"
import { validateMedCertPayload } from "@/lib/validation/med-cert-schema"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

/**
 * Platform-wide keep-list contract.
 *
 * The "soften the intake / flag for the doctor" work deliberately removed dozens
 * of soft blocks. This pins the OTHER side of that line: the clinical/legal
 * hard-blocks that must STILL stop a patient before payment, each asserted
 * through its real entry point. If a future change accidentally softens one of
 * these, this fails.
 */

describe("keep-list: safety-engine DECLINE blocks", () => {
  it("declines emergency symptoms (chest pain) on a med cert", () => {
    const result = checkSafetyForServer("medical-certificate", { emergency_symptoms: ["chest_pain"] })
    expect(result.isAllowed).toBe(false)
    expect(result.outcome).toBe("DECLINE")
  })

  it("declines ED + nitrates", () => {
    const result = checkSafetyForServer("consult", { consultSubtype: "ed", edNitrates: true })
    expect(result.isAllowed).toBe(false)
    expect(result.outcome).toBe("DECLINE")
  })

  it("blocks ED + recent cardiac event / severe heart disease without GP clearance", () => {
    // The cardiac rules only fire when the patient has NOT been GP-cleared
    // (edGpCleared not_equals true), which is the unsafe case we must keep blocking.
    expect(
      checkSafetyForServer("consult", { consultSubtype: "ed", edRecentHeartEvent: true, edGpCleared: false }).isAllowed,
    ).toBe(false)
    expect(
      checkSafetyForServer("consult", { consultSubtype: "ed", edSevereHeart: true, edGpCleared: false }).isAllowed,
    ).toBe(false)
  })

  it("declines a UTI with red flags or pregnancy", () => {
    const base = { consultSubtype: "womens_health", womensHealthOption: "uti", utiSymptoms: ["burning"] }
    expect(checkSafetyForServer("consult", { ...base, utiRedFlags: "yes", utiPregnant: "no" }).outcome).toBe("DECLINE")
    expect(checkSafetyForServer("consult", { ...base, utiRedFlags: "no", utiPregnant: "yes" }).outcome).toBe("DECLINE")
  })
})

describe("keep-list: validator-level hard-blocks", () => {
  it("flags Schedule 8 / controlled substances", () => {
    expect(isControlledSubstance("Oxycodone")).toBe(true)
    expect(isControlledSubstance("Diazepam")).toBe(true)
    expect(isControlledSubstance("Atorvastatin")).toBe(false)

    const result = validateRepeatScriptPayload({
      prescribed_before: true,
      dose_changed: false,
      last_prescribed: "6_to_12_months",
      current_dose: "5 mg",
      medications: [{ name: "Oxycodone", strength: "5 mg", form: "tablet", pbsCode: "MANUAL" }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/controlled substances/i)
  })

  it("flags high-stakes med-cert use cases (exam / court / fitness-to-X)", () => {
    expect(checkHighStakesUseCase("I need a certificate for exam deferral").isHighStakes).toBe(true)
    expect(checkHighStakesUseCase("certificate for a court appearance").isHighStakes).toBe(true)
    expect(checkHighStakesUseCase("just a cold, need a day off work").isHighStakes).toBe(false)
  })

  it("caps med-cert duration at 3 days", () => {
    const base = {
      certificate_type: "work",
      symptoms_description: "head cold and fatigue, need rest",
      symptom_duration: "today",
      start_date: new Date().toISOString().slice(0, 10),
      telehealth_consent_given: true,
      accuracy_confirmed: true,
      terms_agreed: true,
    }
    expect(validateMedCertPayload({ ...base, duration: "5" }).valid).toBe(false)
    expect(validateMedCertPayload({ ...base, duration: "3" }).valid).toBe(true)
  })

  it("blocks a never-before-prescribed medicine in the repeat flow (new-med stays routed/declined)", () => {
    const result = validateRepeatScriptPayload({
      prescribed_before: false,
      dose_changed: false,
      last_prescribed: "6_to_12_months",
      current_dose: "10 mg",
      medications: [{ name: "Atorvastatin", strength: "10 mg", form: "tablet", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("blocks a dose change in the repeat flow", () => {
    const result = validateRepeatScriptPayload({
      prescribed_before: true,
      dose_changed: true,
      last_prescribed: "6_to_12_months",
      current_dose: "20 mg",
      medications: [{ name: "Atorvastatin", strength: "10 mg", form: "tablet", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("rejects a gated women's-health option even if the client route is bypassed", () => {
    expect(validateWomensHealthAssessmentStep({ womensHealthOption: "morning_after" }).isValid).toBe(false)
    expect(validateWomensHealthAssessmentStep({ womensHealthOption: "period_pain" }).isValid).toBe(false)
  })
})
