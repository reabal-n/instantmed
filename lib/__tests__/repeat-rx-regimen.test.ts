import { describe, expect, it } from "vitest"

import {
  areRepeatRxMedicationDetailsEqual,
  extractRepeatRxFrequency,
  hasCompleteRepeatRxRegimen,
} from "@/lib/request/repeat-rx-regimen"

describe("repeat-Rx regimen editing", () => {
  it.each([
    "One tablet each morning",
    "One pill each morning",
    "2 puffs twice daily",
    "1 pump daily",
    "1 vial twice daily",
    "One ampoule each morning",
    "2 actuations as needed",
    "One inhalation twice daily",
    "10 mg nightly",
    "Take one daily",
    "1 daily",
    "Half at night",
    "A tablet each morning",
    "Half a tablet every second day",
    "5 mL every 8 hours",
    "One capsule on Mondays and Thursdays",
    "Apply a thin layer twice daily",
    "1 capsule as needed",
  ])("accepts an amount plus frequency: %s", (value) => {
    expect(hasCompleteRepeatRxRegimen(value)).toBe(true)
  })

  it.each([
    "",
    "Once daily",
    "Twice daily",
    "In the morning",
    "At night",
    "As needed",
    "Every 8 hours",
    "One tablet",
    "10 mg",
    "10 mg with food",
    "Apply twice daily",
    "2 times daily",
    "As previously prescribed",
  ])("rejects a regimen missing amount or frequency: %s", (value) => {
    expect(hasCompleteRepeatRxRegimen(value)).toBe(false)
  })

  it("requires both amount and frequency at the public validation seam", () => {
    expect(hasCompleteRepeatRxRegimen("Once daily")).toBe(false)
    expect(hasCompleteRepeatRxRegimen("One tablet")).toBe(false)
    expect(hasCompleteRepeatRxRegimen("One tablet each morning")).toBe(true)
  })

  it.each([
    ["500mcg daily", "Once daily"],
    ["1 tablet once daily", "Once daily"],
    ["1 tablet twice a day", "Twice daily"],
    ["2 puffs three times daily", "3 times daily"],
    ["1 tablet each morning", "Morning"],
    ["1 capsule at night", "Night"],
    ["2 puffs when needed", "As needed"],
  ])("extracts only the supported patient frequency from %s", (value, expected) => {
    expect(extractRepeatRxFrequency(value)).toBe(expected)
  })

  it("does not manufacture a clipboard frequency from uncommon directions", () => {
    expect(extractRepeatRxFrequency("Half a tablet every second day")).toBeNull()
    expect(extractRepeatRxFrequency("One capsule on Mondays and Thursdays")).toBeNull()
  })

  it("distinguishes real medication edits from equivalent stored details", () => {
    expect(
      areRepeatRxMedicationDetailsEqual(
        { name: "Atorvastatin", strength: "20 mg", form: undefined },
        { name: "Atorvastatin", strength: "20 mg", form: "" },
      ),
    ).toBe(true)
    expect(
      areRepeatRxMedicationDetailsEqual(
        { name: "Atorvastatin", strength: "20 mg", form: "tablet" },
        { name: "Atorvastatin", strength: "40 mg", form: "tablet" },
      ),
    ).toBe(false)
  })
})
