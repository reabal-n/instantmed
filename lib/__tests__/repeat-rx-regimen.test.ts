import { describe, expect, it } from "vitest"

import {
  areRepeatRxMedicationDetailsEqual,
  hasDoseFrequencyStarter,
  toggleDoseFrequencyStarter,
} from "@/lib/request/repeat-rx-regimen"

describe("repeat-Rx regimen editing", () => {
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
