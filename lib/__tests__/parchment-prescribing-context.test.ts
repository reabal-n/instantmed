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
        patientReportedFrequency: "Night",
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
      patientReportedFrequency: undefined,
      regimenSource: "patient_reported",
      directionsTemplate: "Confirm regimen in Parchment.",
      copyText: "Rosuvastatin",
      requestedNameCopyText: "Rosuvastatin",
    })
  })

  it("keeps a patient-entered medicine name copyable without its dose or form", () => {
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
        medicationName: "Valaciclovir 500mg Tablets",
        medicationSearchHint: "Valaciclovir 500mg Tablets",
        patientReportedDose: "1 tablet twice daily",
        patientReportedFrequency: "Twice daily",
        directionsTemplate: "Confirm regimen in Parchment.",
        safetyChecks: [],
        parchmentMode: "open_patient_prescribe",
        clipboardText: "",
      },
      draftNote: "",
    })

    expect(context).toMatchObject({
      medicationLabel: "Valaciclovir 500mg Tablets",
      patientReportedDose: "1 tablet twice daily",
      patientReportedFrequency: undefined,
      copyText: "",
      requestedNameCopyText: "Valaciclovir",
    })
  })

  it.each([
    "Take 1 tablet twice daily when needed; maximum 2 tablets in 24 hours",
    "Take 2 tablets each morning for 3 days, then 1 each morning for 3 days",
    "Medicine A: 1 tablet nightly. Medicine B: 2 puffs every morning",
  ])("uses complete source packet fields and never copies a shortened frequency: %s", (directions) => {
    const summary = {
      title: "Repeat prescription", patientStory: "", keyFacts: [], safetyItems: [],
      recommendedPlan: { action: "prescribe" as const, title: "Review", rationale: "", nextSteps: [] },
      prescriptionIntent: {
        presetLabel: "Repeat", medicationName: "Sertraline", strength: "50 mg",
        patientReportedDose: "shortened summary", patientReportedFrequency: "Once daily",
        medicationSearchHint: "Sertraline", directionsTemplate: "Confirm regimen",
        safetyChecks: [], parchmentMode: "open_patient_prescribe" as const, clipboardText: "Sertraline",
      }, draftNote: "",
    }
    const context = buildParchmentPrescriptionContext(summary, {
      category: "prescription", answers: {
        medications: [{ name: "Sertraline", strength: "50 mg" }, { name: "Atorvastatin", strength: "20 mg" }],
        currentDose: directions, indication: "Patient reports anxiety and cholesterol treatment",
      },
    })
    expect(context?.requestFacts?.map(({ key }) => key)).toEqual(["medicine", "patient_dose", "frequency", "indication"])
    expect(context?.medicationLabel).toBe("Sertraline 50 mg; Atorvastatin 20 mg")
    expect(context?.patientReportedDose).toBe(directions)
    expect(context?.patientReportedFrequency).toBeUndefined()
    expect(context?.requestFacts?.find(({ key }) => key === "frequency")).toMatchObject({state: "not_asked", value: "Not separately captured; see directions"})
    expect(context?.requestFacts?.find(({ key }) => key === "indication")?.value).toBe("Patient reports anxiety and cholesterol treatment")
    expect(context?.copyText).toBe("Sertraline")
    expect(buildParchmentPrescriptionContext(summary)?.patientReportedFrequency).toBeUndefined()
  })

  it("does not replace missing source directions with summary text", () => {
    const context = buildParchmentPrescriptionContext({
      title: "Repeat prescription", patientStory: "", keyFacts: [], safetyItems: [],
      recommendedPlan: { action: "prescribe", title: "Review", rationale: "", nextSteps: [] },
      prescriptionIntent: {
        presetLabel: "Repeat", medicationName: "Sertraline", strength: "50 mg",
        patientReportedDose: "Summary directions must not replace the source", patientReportedFrequency: "Once daily",
        directionsTemplate: "Confirm regimen", safetyChecks: [], parchmentMode: "open_patient_prescribe", clipboardText: "Sertraline",
      }, draftNote: "",
    }, { category: "prescription", answers: {} })
    expect(context?.patientReportedDose).toBeUndefined()
    expect(context?.patientReportedFrequency).toBeUndefined()
    expect(context?.requestFacts?.find(({ key }) => key === "patient_dose")).toMatchObject({ state: "missing" })
    expect(context?.requestFacts?.find(({ key }) => key === "frequency")).toMatchObject({ state: "not_asked", value: "Not captured in this request" })
    expect(context?.requestFacts?.find(({ key }) => key === "indication")).toMatchObject({ state: "missing" })
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
      patientReportedFrequency: undefined,
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
    expect(context?.requestedNameCopyText).toBe("Rosuvastatin")
  })
})
