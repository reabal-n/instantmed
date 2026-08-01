import { describe, expect, it } from "vitest"

import {
  areRepeatRxMedicationDetailsEqual,
  getRepeatRxRegimenSignals,
  hasCompleteRepeatRxRegimen,
  hasDoseFrequencyStarter,
  toggleDoseFrequencyStarter,
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
    "As previously prescribed",
  ])("rejects a regimen missing amount or frequency: %s", (value) => {
    expect(hasCompleteRepeatRxRegimen(value)).toBe(false)
  })

  it("reports amount and frequency signals independently", () => {
    expect(getRepeatRxRegimenSignals("Once daily")).toEqual({
      hasAmount: false,
      hasFrequency: true,
    })
    expect(getRepeatRxRegimenSignals("One tablet")).toEqual({
      hasAmount: true,
      hasFrequency: false,
    })
    expect(getRepeatRxRegimenSignals("One tablet each morning")).toEqual({
      hasAmount: true,
      hasFrequency: true,
    })
  })

  it("matches frequency starters only as standalone comma-delimited entries", () => {
    expect(hasDoseFrequencyStarter("Take one tablet, In the morning", "In the morning")).toBe(true)
    expect(hasDoseFrequencyStarter("Take one tablet, in THE morning", "In the morning")).toBe(true)
    expect(hasDoseFrequencyStarter("In the mornings I take one", "In the morning")).toBe(false)
    expect(hasDoseFrequencyStarter("Once daily with food", "Once daily")).toBe(false)
  })

  it("adds a starter without changing patient-entered prose", () => {
    expect(
      toggleDoseFrequencyStarter("In the mornings I take one", "In the morning"),
    ).toBe("In the mornings I take one, In the morning")
  })

  it("removes only an exact standalone starter", () => {
    expect(
      toggleDoseFrequencyStarter("Take one tablet, Once daily", "Once daily"),
    ).toBe("Take one tablet")
    expect(
      toggleDoseFrequencyStarter("Once daily with food", "Once daily"),
    ).toBe("Once daily with food, Once daily")
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
