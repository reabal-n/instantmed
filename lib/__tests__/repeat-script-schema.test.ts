import { describe, expect, it } from "vitest"

import { validateMedicationStep } from "@/lib/request/validation"
import { getMedicationBlocklistCandidate } from "@/lib/operational-controls/medication-blocklist"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

const validRepeatScriptAnswers = {
  pbs_code: "MANUAL",
  medication_name: "Rosuvastatin",
  medication_display: "Rosuvastatin",
  medication_strength: "10 mg",
  medication_form: "tablet",
  prescribed_before: true,
  dose_changed: false,
  last_prescribed: "6_to_12_months",
  current_dose: "10 mg nightly",
}

describe("repeat script schema", () => {
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
    dose_changed: false,
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
    dose_changed: false,
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

  it("still blocks a missing current dose", () => {
    const { current_dose: _omit, ...noDose } = base
    void _omit
    const result = validateRepeatScriptPayload({
      ...noDose,
      medications: [{ name: "Rosuvastatin", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
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

  it("still blocks more than 5 medications at BOTH the step and the server validator (softened later, boundary 5)", () => {
    const medications = Array.from({ length: 6 }, (_, i) => ({
      name: `Med${i}`,
      pbsCode: `code-${i}`,
    }))
    // Enforced in two layers — boundary 5 must soften both.
    expect(validateMedicationStep({ medications }).isValid).toBe(false)
    expect(validateRepeatScriptPayload({ ...base, medications }).valid).toBe(false)
  })
})

describe("A3 softening — unknown medication passes only with a useful description (boundary 3)", () => {
  const base = {
    prescribed_before: true,
    dose_changed: false,
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
