import { describe, expect, it } from "vitest"

import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"

describe("buildClinicalCaseSummary", () => {
  it("turns an ED request into a patient story, plan, note, and Parchment prescribing intent", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "Daniel McDonald",
      answers: {
        edGoal: "improve_erections",
        edDuration: "1_to_3_years",
        edPreference: "daily",
        iiefTotal: 12,
        edNitrates: "no",
        edRecentHeartEvent: "no",
        edSevereHeart: "no",
        edBpMedication: "no",
        edAlphaBlockers: "no",
        previousEdMeds: "no",
        has_allergies: "yes",
        known_allergies: "Hay fever",
        takes_medications: "yes",
        current_medications: "Oral antihistamines",
      },
    })

    expect(summary.title).toBe("Erectile dysfunction consult")
    expect(summary.patientStory).toContain("improve erections")
    expect(summary.patientStory).toContain("1 to 3 years")
    expect(summary.keyFacts).toContainEqual({ label: "IIEF-5 score", value: "12" })
    expect(summary.keyFacts).toContainEqual({ label: "Alpha blockers", value: "No" })
    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.recommendedPlan.title).toMatch(/PDE5/i)
    expect(summary.prescriptionIntent?.presetLabel).toMatch(/ED/i)
    expect(summary.prescriptionIntent?.parchmentMode).toBe("open_patient_prescribe")
    expect(summary.draftNote).toContain("Subjective:")
    expect(summary.draftNote).toContain("Plan:")
  })

  it("hard-blocks hair loss prescribing when reproductive contraindication is present", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "hair_loss",
      serviceType: "consult",
      patientName: "Alex Patient",
      answers: {
        hairGoal: "both",
        hairOnset: "1_2_years",
        hairPattern: "noticeable_thinning",
        hairFamilyHistory: "yes_father",
        hairMedicationPreference: "oral",
        hairReproductive: "yes",
        scalpNone: true,
        hairLowBP: false,
        hairHeartConditions: false,
        takes_medications: "no",
        has_allergies: "no",
        has_conditions: "no",
      },
    })

    expect(summary.title).toBe("Hair loss consult")
    expect(summary.recommendedPlan.action).toBe("decline")
    expect(summary.safetyItems).toContainEqual(
      expect.objectContaining({ severity: "block", label: "Reproductive contraindication" }),
    )
    expect(summary.prescriptionIntent).toBeUndefined()
  })

  it("uses the requested medication as the repeat-prescription Parchment intent", () => {
    const summary = buildClinicalCaseSummary({
      category: "prescription",
      serviceType: "common_scripts",
      patientName: "Pat Script",
      answers: {
        medicationName: "Rosuvastatin",
        medicationStrength: "10 mg",
        medicationForm: "tablet",
        prescriptionHistory: "last_3_months",
        currentDose: "10 mg nightly",
        takes_medications: "no",
        has_allergies: "no",
        has_conditions: "no",
      },
    })

    expect(summary.title).toBe("Repeat prescription")
    expect(summary.patientStory).toContain("Rosuvastatin")
    expect(summary.keyFacts).toContainEqual({ label: "Patient-reported dose", value: "10 mg nightly" })
    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.prescriptionIntent).toMatchObject({
      medicationName: "Rosuvastatin",
      strength: "10 mg",
      form: "tablet",
      parchmentMode: "open_patient_prescribe",
    })
    expect(summary.prescriptionIntent?.directionsTemplate).toContain("10 mg nightly")
  })

  it("builds a medical certificate summary without falling back to general consult copy", () => {
    const summary = buildClinicalCaseSummary({
      serviceType: "med_certs",
      patientName: "Cert Patient",
      answers: {
        certType: "work",
        duration: "2",
        startDate: "2026-04-29",
        symptoms: ["Sore throat", "Fatigue"],
        symptomDuration: "two_days",
        symptomDetails: "I have been unwell with viral symptoms and cannot attend work.",
      },
    })

    expect(summary.title).toBe("Medical certificate request")
    expect(summary.patientStory).toContain("viral symptoms")
    expect(summary.keyFacts).toContainEqual({ label: "Requested duration", value: "2 days" })
    expect(summary.recommendedPlan.action).toBe("approve")
    expect(summary.prescriptionIntent).toBeUndefined()
  })

  it("prioritises the patient's words for general consults and recommends triage instead of medication", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "general",
      serviceType: "consult",
      patientName: "General Patient",
      answers: {
        consultCategory: "skin",
        consultDetails: "I have had a spreading itchy rash on my arm for two weeks after changing detergent.",
        consultUrgency: "soon",
        general_associated_symptoms: ["itch", "redness"],
        takes_medications: "no",
        has_allergies: "no",
        has_conditions: "no",
      },
    })

    expect(summary.title).toBe("General consult")
    expect(summary.patientStory).toContain("spreading itchy rash")
    expect(summary.recommendedPlan.action).toBe("approve")
    expect(summary.recommendedPlan.title).toMatch(/async/i)
    expect(summary.prescriptionIntent).toBeUndefined()
  })
})
