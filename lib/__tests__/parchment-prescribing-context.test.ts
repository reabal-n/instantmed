import { describe, expect, it } from "vitest"

import { buildParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"

describe("buildParchmentPrescriptionContext", () => {
  it("returns compact Parchment context from a prescription intent", () => {
    const context = buildParchmentPrescriptionContext({
      title: "Repeat prescription",
      patientStory: "",
      keyFacts: [],
      safetyItems: [],
      recommendedPlan: {
        action: "prescribe",
        title: "Repeat prescription if appropriate",
        rationale: "",
        nextSteps: [],
      },
      prescriptionIntent: {
        presetLabel: "Repeat prescription preset",
        medicationName: "Rosuvastatin",
        strength: "10 mg",
        form: "tablet",
        medicationSearchHint: "Rosuvastatin 10 mg tablet",
        directionsTemplate: "Confirm regimen in Parchment.",
        safetyChecks: [],
        parchmentMode: "open_patient_prescribe",
        clipboardText: "Medication: Rosuvastatin\nStrength: 10 mg",
      },
      draftNote: "",
    })

    expect(context).toEqual({
      presetLabel: "Repeat prescription preset",
      medicationLabel: "Rosuvastatin 10 mg tablet",
      searchHint: "Rosuvastatin 10 mg tablet",
      directionsTemplate: "Confirm regimen in Parchment.",
      clipboardText: "Medication: Rosuvastatin\nStrength: 10 mg",
    })
  })

  it("returns null when there is no prescription intent", () => {
    const context = buildParchmentPrescriptionContext({
      title: "Medical certificate",
      patientStory: "",
      keyFacts: [],
      safetyItems: [],
      recommendedPlan: {
        action: "approve",
        title: "Review",
        rationale: "",
        nextSteps: [],
      },
      draftNote: "",
    })

    expect(context).toBeNull()
  })
})
