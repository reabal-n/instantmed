import { describe, expect, it } from "vitest"

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

  it("still blocks a missing medication FORM (a separate boundary, not softened here)", () => {
    const result = validateRepeatScriptPayload({
      ...base,
      medications: [{ name: "Rosuvastatin", strength: "10 mg", pbsCode: "1234" }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/form/i)
  })
})
