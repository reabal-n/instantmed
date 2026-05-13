import { describe, expect, it } from "vitest"

import {
  checkParchmentPrescribingCapability,
  extractRequestedPrescriptionMedicationTexts,
} from "@/lib/doctor/parchment-prescribing-capability"
import type { Profile } from "@/types/db"

function profile(overrides: Partial<Profile> = {}): Pick<Profile, "role"> & Partial<Profile> {
  return {
    role: "doctor",
    can_prescribe_s4: true,
    can_prescribe_s8: false,
    ...overrides,
  }
}

describe("Parchment prescribing capability", () => {
  it("allows an S4-enabled doctor to open ordinary Parchment prescribing", () => {
    const result = checkParchmentPrescribingCapability({
      profile: profile(),
      answers: { medicationName: "Atorvastatin" },
    })

    expect(result.allowed).toBe(true)
    expect(result.controlledMedicationDetected).toBe(false)
  })

  it("blocks doctors who are not enabled for Schedule 4 prescribing", () => {
    const result = checkParchmentPrescribingCapability({
      profile: profile({ can_prescribe_s4: false }),
      answers: { medicationName: "Atorvastatin" },
    })

    expect(result.allowed).toBe(false)
    expect(result.requiredCapability).toBe("prescribe_s4")
    expect(result.error).toContain("Schedule 4")
  })

  it("allows the owner-admin doctor through prescribing gates even if doctor flags are false", () => {
    const result = checkParchmentPrescribingCapability({
      profile: profile({ role: "admin", can_prescribe_s4: false, can_prescribe_s8: false }),
      answers: { medicationName: "Oxycodone" },
    })

    expect(result.allowed).toBe(true)
    expect(result.controlledMedicationDetected).toBe(true)
  })

  it("blocks controlled medicines unless the doctor has the explicit S8 grant", () => {
    const result = checkParchmentPrescribingCapability({
      profile: profile({ can_prescribe_s4: true, can_prescribe_s8: false }),
      answers: { medicationName: "Oxycodone" },
    })

    expect(result.allowed).toBe(false)
    expect(result.requiredCapability).toBe("prescribe_s8")
    expect(result.controlledMedicationDetected).toBe(true)
    expect(result.medicationText).toContain("Oxycodone")
  })

  it("permits S8-capable doctors past the capability gate", () => {
    const result = checkParchmentPrescribingCapability({
      profile: profile({ can_prescribe_s4: true, can_prescribe_s8: true }),
      answers: { medicationName: "Oxycodone" },
    })

    expect(result.allowed).toBe(true)
    expect(result.controlledMedicationDetected).toBe(true)
  })

  it("extracts medication text from repeat-script medication arrays and legacy fields", () => {
    const texts = extractRequestedPrescriptionMedicationTexts({
      medications: [
        {
          product: {
            drug_name: "Rosuvastatin",
            brand_name: "Crestor",
            active_ingredient: "rosuvastatin",
          },
          strength: "10 mg",
          form: "tablet",
        },
      ],
      medicationName: "Atorvastatin",
    })

    expect(texts.some((text) =>
      text.includes("Rosuvastatin") &&
      text.includes("Crestor") &&
      text.includes("10 mg") &&
      text.includes("tablet")
    )).toBe(true)
    expect(texts).toContain("Atorvastatin")
  })
})
