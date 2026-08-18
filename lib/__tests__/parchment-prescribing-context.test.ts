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
        presetLabel: "Repeat prescription Parchment context",
        medicationName: "Rosuvastatin",
        strength: "10 mg",
        form: "tablet",
        medicationSearchHint: "Rosuvastatin 10 mg tablet",
        patientReportedDose: "10 mg nightly",
        directionsTemplate: "Confirm regimen in Parchment.",
        safetyChecks: [],
        parchmentMode: "open_patient_prescribe",
        clipboardText: "Rosuvastatin",
      },
      draftNote: "",
    })

    expect(context).toEqual({
      presetLabel: "Repeat prescription Parchment context",
      medicationLabel: "Rosuvastatin 10 mg tablet",
      searchHint: "Rosuvastatin 10 mg tablet",
      patientReportedDose: "10 mg nightly",
      regimenSource: "patient_reported",
      directionsTemplate: "Confirm regimen in Parchment.",
      copyText: "Rosuvastatin",
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

  it("keeps clinician-selected specialty directions separate from patient-reported dose context", () => {
    const context = buildParchmentPrescriptionContext({
      title: "Women's health",
      patientStory: "",
      keyFacts: [],
      safetyItems: [],
      recommendedPlan: {
        action: "prescribe",
        title: "Review",
        rationale: "",
        nextSteps: [],
      },
      prescriptionIntent: {
        presetLabel: "UTI Parchment handoff context",
        medicationSearchHint: "UTI antibiotic",
        directionsTemplate: "Doctor to select therapy in Parchment.",
        safetyChecks: [],
        parchmentMode: "open_patient_prescribe",
        clipboardText: "",
      },
      draftNote: "",
    })

    expect(context).toMatchObject({
      regimenSource: "template",
      patientReportedDose: undefined,
      directionsTemplate: "Doctor to select therapy in Parchment.",
    })
  })

  it.each([
    "Rosuvastatin 10 mg tablet",
    "Rosuvastatin once daily",
    "Rosuvastatin: patient requested",
  ])("rejects strength-bearing or sentence-like clipboard content: %s", (clipboardText) => {
    const context = buildParchmentPrescriptionContext({
      title: "Repeat prescription",
      patientStory: "",
      keyFacts: [],
      safetyItems: [],
      recommendedPlan: {
        action: "prescribe",
        title: "Review",
        rationale: "",
        nextSteps: [],
      },
      prescriptionIntent: {
        presetLabel: "Repeat prescription Parchment context",
        medicationName: "Rosuvastatin",
        medicationSearchHint: "Rosuvastatin 10 mg tablet",
        patientReportedDose: "10 mg nightly",
        directionsTemplate: "Confirm regimen in Parchment.",
        safetyChecks: [],
        parchmentMode: "open_patient_prescribe",
        clipboardText,
      },
      draftNote: "",
    })

    expect(context?.copyText).toBe("")
  })
})
