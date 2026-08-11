import { describe, expect, it } from "vitest"

import {
  getRepeatRxDoseMissingFields,
  hasRepeatRxDoseContractMarker,
  REPEAT_RX_DOSE_CONTRACT_KEY,
  REPEAT_RX_DOSE_CONTRACT_VERSION,
} from "@/lib/clinical/repeat-rx-dose-requirement"
import { getRepeatScriptMedicationConcreteStrength } from "@/lib/validation/repeat-script-medications"

describe("repeat-Rx dose requirement", () => {
  it.each([
    ["Sertraline 100mg tablet", "100mg"],
    ["Budesonide + formoterol 100/3 micrograms", "100/3 micrograms"],
    ["Amoxicillin 250 mg/5 mL", "250 mg/5 mL"],
    ["Hydrocortisone 1% cream", "1%"],
  ])("extracts a concrete strength from %s", (value, expected) => {
    expect(getRepeatScriptMedicationConcreteStrength({
      name: value,
      displayName: value,
    })).toBe(expected)
  })

  it("prefers a structured strength but accepts a reliable inline strength", () => {
    expect(getRepeatScriptMedicationConcreteStrength({
      name: "Sertraline",
      displayName: "Sertraline",
      strength: "100 mg",
    })).toBe("100 mg")
    expect(getRepeatScriptMedicationConcreteStrength({
      name: "Sertraline 100mg",
      displayName: "Sertraline 100mg",
    })).toBe("100mg")
    expect(getRepeatScriptMedicationConcreteStrength({
      name: "Sertraline",
      displayName: "Sertraline",
    })).toBeUndefined()
  })

  it("requires a concrete strength plus current amount and frequency", () => {
    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline",
      currentDose: "Once daily",
    })).toEqual(["medication_strength", "current_dose"])

    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline 100mg",
    })).toEqual(["current_dose"])

    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline 100mg",
      dosage_instructions: "Once daily",
    })).toEqual(["current_dose"])

    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline 100mg",
      dosage_instructions: "10 mg with food",
    })).toEqual(["current_dose"])

    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline 100mg",
      dosage_instructions: "One tablet each morning",
    })).toEqual([])

    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline 100mg",
      dosage_instructions: "1 pump daily",
    })).toEqual([])

    expect(getRepeatRxDoseMissingFields({
      medicationName: "Sertraline 100mg",
      dosage_instructions: "1 vial twice daily",
    })).toEqual([])
  })

  it("uses a persisted contract marker instead of deployment time", () => {
    expect(hasRepeatRxDoseContractMarker({
      [REPEAT_RX_DOSE_CONTRACT_KEY]: REPEAT_RX_DOSE_CONTRACT_VERSION,
    })).toBe(true)
    expect(hasRepeatRxDoseContractMarker({
      [REPEAT_RX_DOSE_CONTRACT_KEY]: "1",
    })).toBe(false)
    expect(hasRepeatRxDoseContractMarker({})).toBe(false)
  })
})
