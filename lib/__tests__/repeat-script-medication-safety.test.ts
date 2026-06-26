import { describe, expect, it } from "vitest"

import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { getMedicationBlocklistCandidate } from "@/lib/operational-controls/medication-blocklist"
import {
  transformAnswersForUnifiedCheckout,
  validateAnswersServerSide,
} from "@/lib/request/unified-checkout"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Script",
  dateOfBirth: "1980-01-01",
  phone: "0412345678",
}

const medicalHistory = {
  hasAllergies: false,
  hasConditions: false,
  hasOtherMedications: false,
  isPregnantOrBreastfeeding: false,
  hasAdverseMedicationReactions: false,
}

const prescriptionIdentity = {
  medicareNumber: "1111111111",
  medicareIrn: "2",
  addressLine1: "12 Manual Entry Road",
  suburb: "Sydney",
  state: "NSW",
  postcode: "2000",
  sex: "M",
}

const validRepeatAnswers = {
  prescriptionHistory: "6_to_12_months",
  currentDose: "As previously prescribed",
  indication: "Ongoing therapy",
  ...medicalHistory,
  ...prescriptionIdentity,
}

describe("repeat script medication array safety", () => {
  it("lets an incomplete secondary medicine through as a flag, not a block (A3)", () => {
    // A3 softening: a secondary medicine missing its form no longer blocks
    // checkout — it proceeds and the doctor sees a medication_form_missing flag.
    const result = validateAnswersServerSide("repeat-script", {
      ...validRepeatAnswers,
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Amlodipine", strength: "5 mg", pbsCode: "MANUAL" },
      ],
    }, identity)

    expect(result).toBeNull()
  })

  it("normalizes canonical checkout fields from medication arrays when legacy fields are absent", () => {
    const transformed = transformAnswersForUnifiedCheckout("repeat-script", {
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Amlodipine", strength: "5 mg", form: "tablet", pbsCode: "MANUAL" },
      ],
      prescriptionHistory: "6_to_12_months",
      currentDose: "As previously prescribed",
    })

    expect(transformed.medication_name).toBe("Rosuvastatin")
    expect(transformed.medication_strength).toBe("10 mg")
    expect(transformed.medication_form).toBe("tablet")
    expect(transformed.pbs_code).toBe("MANUAL")
  })

  it("checks blocklists and controlled-substance validation across every requested medicine", () => {
    const answers = {
      medication_name: "Rosuvastatin",
      medication_display: "Rosuvastatin",
      medication_strength: "10 mg",
      medication_form: "tablet",
      pbs_code: "MANUAL",
      prescribed_before: true,
      dose_changed: false,
      last_prescribed: "6_to_12_months",
      current_dose: "As previously prescribed",
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Oxycodone", strength: "5 mg", form: "tablet", pbsCode: "MANUAL" },
      ],
    }

    expect(getMedicationBlocklistCandidate(answers)).toContain("Oxycodone")
    expect(validateRepeatScriptPayload(answers)).toMatchObject({
      valid: false,
      requiresConsult: false,
    })
  })

  it("blocks a controlled substance named only in the unknown-medication description", () => {
    // The "I don't know the name" path carries a free-text description. A patient
    // must not be able to slip a controlled substance through by naming it only in
    // that description — the server scan (buildRepeatScriptMedicationValidationText)
    // must include it.
    const answers = {
      medication_name: "Unknown - doctor to identify",
      medication_display: "Unknown - doctor to identify",
      pbs_code: "UNKNOWN",
      prescribed_before: true,
      dose_changed: false,
      last_prescribed: "6_to_12_months",
      current_dose: "As previously prescribed",
      medications: [
        {
          name: "Unknown - doctor to identify",
          description: "small white tablet, I think it's oxycodone for pain",
          pbsCode: "UNKNOWN",
        },
      ],
    }

    expect(getMedicationBlocklistCandidate(answers)).toContain("oxycodone")
    expect(validateRepeatScriptPayload(answers)).toMatchObject({ valid: false })
  })

  it("surfaces all requested medicines in the doctor summary and Parchment handoff context", () => {
    const summary = buildClinicalCaseSummary({
      category: "prescription",
      serviceType: "repeat-script",
      patientName: "Pat Script",
      answers: {
        medications: [
          { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
          { name: "Amlodipine", strength: "5 mg", form: "tablet", pbsCode: "MANUAL" },
        ],
        prescriptionHistory: "6_to_12_months",
        currentDose: "As previously prescribed",
        ...medicalHistory,
      },
    })

    expect(summary.keyFacts).toContainEqual({
      label: "Requested medications",
      value: "Rosuvastatin 10 mg tablet; Amlodipine 5 mg tablet",
    })
    expect(summary.prescriptionIntent?.clipboardText).toContain("Amlodipine 5 mg tablet")
    expect(summary.patientStory).toContain("Amlodipine")
  })
})
