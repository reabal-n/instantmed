import { describe, expect, it } from "vitest"

import { ED_PRESCRIBING_PRESETS, getEdPreset } from "@/lib/clinical/ed-prescribing-presets"

describe("ED Parchment handoff presets", () => {
  it("daily preference returns Tadalafil 5mg with daily directions", () => {
    const preset = getEdPreset("daily")
    expect(preset.medicationName).toBe("Tadalafil")
    expect(preset.strength).toBe("5mg")
    expect(preset.quantityTemplate).toBe("30 tablets")
    expect(preset.repeatsTemplate).toBe("2")
    expect(preset.directionsTemplate).toMatch(/once daily/i)
    expect(preset.medicationSearchHint).toMatch(/tadalafil/i)
    expect(preset.alternativeNote).toBeUndefined()
  })

  it("prn preference returns Sildenafil 50mg with as-needed directions", () => {
    const preset = getEdPreset("prn")
    expect(preset.medicationName).toBe("Sildenafil")
    expect(preset.strength).toBe("50mg")
    expect(preset.quantityTemplate).toBe("8 tablets")
    expect(preset.repeatsTemplate).toBe("2")
    expect(preset.directionsTemplate).toMatch(/1 hour before sexual activity/i)
    expect(preset.directionsTemplate).toMatch(/maximum 1 tablet per 24 hours/i)
  })

  // 50mg is the starting dose, not the only as-needed option. The note carries
  // the escalation rule and the longer-acting alternative so the doctor is not
  // nudged into re-prescribing a starting dose to someone already established
  // on something stronger.
  it("prn preference carries the escalation and longer-acting alternative for the doctor", () => {
    const preset = getEdPreset("prn")
    expect(preset.alternativeNote).toMatch(/100mg/i)
    expect(preset.alternativeNote).toMatch(/tadalafil 20mg/i)
    expect(preset.alternativeNote).toMatch(/prior treatment/i)
  })

  it("doctor_decides preference defaults to Sildenafil 50mg PRN with Tadalafil alternative note", () => {
    const preset = getEdPreset("doctor_decides")
    expect(preset.medicationName).toBe("Sildenafil")
    expect(preset.strength).toBe("50mg")
    expect(preset.alternativeNote).toMatch(/Tadalafil 5mg/i)
  })

  it("unknown preference falls back to doctor_decides", () => {
    const preset = getEdPreset("garbage")
    expect(preset.medicationName).toBe(ED_PRESCRIBING_PRESETS.doctor_decides.medicationName)
  })

  it("null/undefined preference falls back to doctor_decides", () => {
    expect(getEdPreset(null).medicationName).toBe(ED_PRESCRIBING_PRESETS.doctor_decides.medicationName)
    expect(getEdPreset(undefined).medicationName).toBe(ED_PRESCRIBING_PRESETS.doctor_decides.medicationName)
  })
})
