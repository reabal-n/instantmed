import { describe, expect, it } from "vitest"

import {
  hasUncertainMedicationAnswer,
  requiresClinicalAdministration,
} from "@/lib/clinical/medication-flags"

describe("hasUncertainMedicationAnswer", () => {
  it("flags 'Unsure' answers (the Verorab repeat-Rx case)", () => {
    // Patient answered medication "Verorab", strength "Unsure", form "Unsure".
    expect(hasUncertainMedicationAnswer(["Verorab", "Unsure", "Unsure"])).toBe(true)
  })

  it("matches common uncertainty phrasings", () => {
    for (const value of [
      "not sure",
      "don't know",
      "dont know",
      "no idea",
      "can't remember",
      "unknown",
    ]) {
      expect(hasUncertainMedicationAnswer([value]), value).toBe(true)
    }
  })

  it("does not flag confident answers", () => {
    expect(hasUncertainMedicationAnswer(["Atorvastatin", "40mg", "Tablet"])).toBe(false)
  })

  it("ignores null/undefined/empty fields", () => {
    expect(hasUncertainMedicationAnswer([null, undefined, ""])).toBe(false)
  })

  it("does not false-positive on substrings inside real words", () => {
    // "ensure" contains "sure" but is not an uncertainty marker.
    expect(hasUncertainMedicationAnswer(["Ensure nutritional supplement"])).toBe(false)
  })
})

describe("requiresClinicalAdministration", () => {
  it("flags the Verorab patient-reported dose (injection)", () => {
    expect(requiresClinicalAdministration("Verorab Injection.Powder 2.5IU 1")).toBe(true)
  })

  it("flags injectables, vaccines, infusions, and implants", () => {
    for (const text of [
      "influenza vaccine",
      "intramuscular injection",
      "subcutaneous injectable",
      "iron infusion",
      "contraceptive implant",
      "depot injection",
      "single vial",
    ]) {
      expect(requiresClinicalAdministration(text), text).toBe(true)
    }
  })

  it("does not flag ordinary oral medicines", () => {
    for (const text of [
      "Atorvastatin 40mg tablet",
      "Sertraline 50mg capsule",
      "Ventolin inhaler",
      "Metformin XR",
    ]) {
      expect(requiresClinicalAdministration(text), text).toBe(false)
    }
  })

  it("returns false for empty input", () => {
    expect(requiresClinicalAdministration(null)).toBe(false)
    expect(requiresClinicalAdministration(undefined)).toBe(false)
    expect(requiresClinicalAdministration("")).toBe(false)
  })
})
