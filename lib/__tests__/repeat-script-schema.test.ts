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
