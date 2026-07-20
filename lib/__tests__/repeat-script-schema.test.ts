import { describe, expect, it } from "vitest"

import { getMedicationBlocklistCandidate } from "@/lib/operational-controls/medication-blocklist"
import { validateMedicationStep } from "@/lib/request/validation"
import {
  isUnidentifiedRepeatMedication,
  resolveRepeatMedicationCode,
} from "@/lib/validation/repeat-script-medications"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

const validRepeatScriptAnswers = {
  pbs_code: "MANUAL",
  medication_name: "Rosuvastatin",
  medication_display: "Rosuvastatin",
  medication_strength: "10 mg",
  medication_form: "tablet",
  prescribed_before: true,
  doseChanged: false,
  dose_changed: false,
  hasSideEffects: false,
  last_prescribed: "6_to_12_months",
  current_dose: "10 mg nightly",
}

describe("repeat script schema", () => {
  it("requires an explicit side-effect answer and details only when side effects are reported", () => {
    const { hasSideEffects: _omitted, ...withoutSideEffectAnswer } = validRepeatScriptAnswers
    void _omitted

    expect(validateRepeatScriptPayload(withoutSideEffectAnswer)).toMatchObject({ valid: false })
    expect(validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      hasSideEffects: null,
    })).toMatchObject({ valid: false })
    expect(validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      hasSideEffects: "false",
    })).toMatchObject({ valid: false })

    for (const sideEffects of ["", "   "]) {
      expect(validateRepeatScriptPayload({
        ...validRepeatScriptAnswers,
        hasSideEffects: true,
        sideEffects,
      })).toMatchObject({ valid: false })
    }

    expect(validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      hasSideEffects: false,
      sideEffects: "",
    })).toEqual({ valid: true })
    expect(validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      hasSideEffects: true,
      sideEffects: "  mild nausea  ",
    })).toEqual({ valid: true })
  })

  it("requires an explicit answer about whether dose or directions changed", () => {
    const { doseChanged: _omitted, ...withoutDoseConfirmation } = validRepeatScriptAnswers
    void _omitted

    const result = validateRepeatScriptPayload(withoutDoseConfirmation)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/dose or directions have changed/i)
  })

  it("routes changed dose or directions to the patient's regular prescriber", () => {
    const result = validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      doseChanged: true,
      dose_changed: true,
    })

    expect(result).toMatchObject({ valid: false, requiresConsult: true })
    expect(result.error).toMatch(/regular GP or specialist/i)
  })

  it("accepts an explicit confirmation that dose and directions are unchanged", () => {
    expect(validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      dose_changed: false,
    })).toEqual({ valid: true })
  })

  it("blocks controlled medicines hidden in secondary medication entries", () => {
    const result = validateRepeatScriptPayload({
      ...validRepeatScriptAnswers,
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Oxycodone", strength: "5 mg", form: "tablet", pbsCode: "MANUAL" },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/controlled substances/i)
  })

  it("passes all active medication names to the operational blocklist candidate", () => {
    expect(getMedicationBlocklistCandidate({
      medication_name: "Rosuvastatin",
      medications: [
        { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
        { name: "Oxycodone", strength: "5 mg", form: "tablet", pbsCode: "MANUAL" },
      ],
    })).toContain("Oxycodone")
  })
})

describe("A3 softening — missing medication strength is a flag, not a block", () => {
  const base = {
    prescribed_before: true,
    doseChanged: false,
    dose_changed: false,
    hasSideEffects: false,
    last_prescribed: "6_to_12_months",
    current_dose: "10 mg nightly",
  }

  it("allows a repeat with a missing strength (now derived as a doctor flag)", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Rosuvastatin", form: "tablet", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(true)
  })

  // ---- keep-list: these must STILL hard-block ----

  it("still blocks a never-before-prescribed medicine (new-med stays routed/declined)", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      prescribed_before: false,
      medications: [{ name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("still blocks a dose change", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      doseChanged: true,
      dose_changed: true,
      medications: [{ name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("still blocks a controlled substance even when its strength is missing", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Oxycodone", form: "tablet", pbsCode: "MANUAL" }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/controlled substances/i)
  })

  // (form was a hard block at boundary 1; it is softened in boundary 2 below.)
})

describe("A3 softening — missing medication form is a flag, not a block (boundary 2)", () => {
  const base = {
    prescribed_before: true,
    doseChanged: false,
    dose_changed: false,
    hasSideEffects: false,
    last_prescribed: "6_to_12_months",
    current_dose: "10 mg nightly",
  }

  it("allows a repeat with a missing form (now derived as a doctor flag)", () => {
    // name only — no strength (already softened) and no form.
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Rosuvastatin", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(true)
  })

  // ---- keep-list: every one of these must STILL hard-block ----

  it("still blocks an unknown medication", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "unknown - doctor will confirm", pbsCode: "UNKNOWN" }],
    })
    expect(result.valid).toBe(false)
  })

  it("allows a missing current dose now (softened in boundary 4)", () => {
    const { current_dose: _omit, ...noDose } = base
    void _omit
    const result = validateRepeatScriptPayload({
      ...noDose,
      medications: [{ name: "Rosuvastatin", form: "tablet", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(true)
  })

  it("still blocks a missing last-prescribed", () => {
    const { last_prescribed: _omit, ...noLast } = base
    void _omit
    const result = validateRepeatScriptPayload({
      ...noLast,
      medications: [{ name: "Rosuvastatin", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("still blocks a dose change", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      doseChanged: true,
      dose_changed: true,
      medications: [{ name: "Rosuvastatin", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("still blocks a never-before-prescribed medicine", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      prescribed_before: false,
      medications: [{ name: "Rosuvastatin", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
  })

  it("still blocks a controlled substance", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Oxycodone", form: "tablet", pbsCode: "MANUAL" }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/controlled substances/i)
  })

  it("blocks multiple medications at BOTH layers so one dose/history answer is unambiguous", () => {
    const medications = Array.from({ length: 2 }, (_, i) => ({
      name: `Med${i}`,
      strength: "10 mg",
      form: "tablet",
      pbsCode: `code-${i}`,
    }))
    expect(validateMedicationStep({ medications }).isValid).toBe(false)
    const result = validateRepeatScriptPayload({ ...base, medications })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/one medication at a time/i)
  })
})

describe("A3 softening — unknown medication passes only with a useful description (boundary 3)", () => {
  const base = {
    prescribed_before: true,
    doseChanged: false,
    dose_changed: false,
    hasSideEffects: false,
    last_prescribed: "6_to_12_months",
    current_dose: "one daily",
  }
  const unknown = { name: "Unknown - doctor will confirm", pbsCode: "UNKNOWN" }

  it("still blocks an unknown medication with NO description", () => {
    const result = validateRepeatScriptPayload({ ...base, medications: [{ ...unknown }] })
    expect(result.valid).toBe(false)
  })

  it("still blocks an unknown medication with only a trivial description", () => {
    const result = validateRepeatScriptPayload({ ...base, medications: [{ ...unknown, description: "idk" }] })
    expect(result.valid).toBe(false)
  })

  it("allows an unknown medication WITH a useful free-text description (now a doctor flag)", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ ...unknown, description: "small white blood pressure tablet, prescribed by Dr Smith" }],
    })
    expect(result.valid).toBe(true)
  })
})

describe("legacy UNKNOWN sentinel — a real typed name is identified (2026-07-20)", () => {
  // The PBS reference search was retired in #211, so the current intake is
  // free-text-only: every entry is a patient-typed name with code MANUAL, and
  // no description field renders anywhere. But the retired UNKNOWN sentinel
  // survives in saved recent-medication preferences (no expiry) and restored
  // drafts, and both validators used to treat the code ALONE as unidentified —
  // demanding a description the UI cannot supply. One patient hit that wall 16
  // times at the pay step. These pins make a real name sufficient while
  // keeping every genuinely-unidentified and controlled-substance block.
  const base = {
    prescribed_before: true,
    doseChanged: false,
    dose_changed: false,
    hasSideEffects: false,
    last_prescribed: "6_to_12_months",
    current_dose: "one daily",
  }

  it("server: a real name with the stale UNKNOWN code passes without a description", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "UNKNOWN" }],
    })
    expect(result.valid).toBe(true)
  })

  it("client: a real name with the stale UNKNOWN code passes the step validator", () => {
    const result = validateMedicationStep({
      medications: [{ name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "UNKNOWN" }],
    })
    expect(result.isValid).toBe(true)
  })

  it("both layers still block the placeholder name with no description", () => {
    const placeholder = { name: "Unknown - doctor will confirm", pbsCode: "UNKNOWN" }
    expect(validateMedicationStep({ medications: [placeholder] }).isValid).toBe(false)
    expect(validateRepeatScriptPayload({ ...base, medications: [placeholder] }).valid).toBe(false)
  })

  it("still blocks a nameless UNKNOWN entry with no description", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "", pbsCode: "UNKNOWN" }],
    })
    expect(result.valid).toBe(false)
  })

  it("a controlled substance cannot sneak through on the stale code", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Diazepam", form: "tablet", pbsCode: "UNKNOWN" }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/controlled substances/i)
  })
})

describe("repeat medication identity helpers", () => {
  it("isUnidentifiedRepeatMedication: stale code with a real name is identified", () => {
    expect(isUnidentifiedRepeatMedication({ name: "Rosuvastatin", pbsCode: "UNKNOWN" })).toBe(false)
    expect(isUnidentifiedRepeatMedication({ name: "Rosuvastatin", pbsCode: "unknown" })).toBe(false)
  })

  it("isUnidentifiedRepeatMedication: no usable name stays unidentified", () => {
    expect(isUnidentifiedRepeatMedication({ name: "", pbsCode: "UNKNOWN" })).toBe(true)
    expect(isUnidentifiedRepeatMedication({ name: "Unknown - doctor will confirm", pbsCode: "UNKNOWN" })).toBe(true)
    expect(isUnidentifiedRepeatMedication({ name: "Unknown - doctor will confirm" })).toBe(true)
  })

  it("isUnidentifiedRepeatMedication: ordinary manual entries are untouched", () => {
    expect(isUnidentifiedRepeatMedication({ name: "Rosuvastatin", pbsCode: "MANUAL" })).toBe(false)
    expect(isUnidentifiedRepeatMedication({ name: "Rosuvastatin" })).toBe(false)
  })

  it("resolveRepeatMedicationCode: maps the stale sentinel to MANUAL only for named medicines", () => {
    expect(resolveRepeatMedicationCode("Rosuvastatin", "UNKNOWN")).toBe("MANUAL")
    expect(resolveRepeatMedicationCode("Unknown - doctor will confirm", "UNKNOWN")).toBe("UNKNOWN")
    expect(resolveRepeatMedicationCode("", "UNKNOWN")).toBe("UNKNOWN")
  })

  it("resolveRepeatMedicationCode: leaves real codes alone and defaults empty to MANUAL", () => {
    expect(resolveRepeatMedicationCode("Rosuvastatin", "MANUAL")).toBe("MANUAL")
    expect(resolveRepeatMedicationCode("Rosuvastatin", "1234K")).toBe("1234K")
    expect(resolveRepeatMedicationCode("Rosuvastatin", undefined)).toBe("MANUAL")
    expect(resolveRepeatMedicationCode("Rosuvastatin", "  ")).toBe("MANUAL")
  })
})
