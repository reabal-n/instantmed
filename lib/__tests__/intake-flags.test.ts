import { describe, expect, it } from "vitest"

import {
  attentionFlags,
  dedupeIntakeFlags,
  INTAKE_FLAG_TAXONOMY,
  type IntakeFlag,
  makeIntakeFlag,
  parseIntakeFlags,
} from "@/lib/clinical/intake-flags"

describe("makeIntakeFlag", () => {
  it("populates label + severity from the taxonomy and defaults source to 'intake'", () => {
    const flag = makeIntakeFlag("medication_strength_missing")
    expect(flag.code).toBe("medication_strength_missing")
    expect(flag.severity).toBe("attention")
    expect(flag.source).toBe("intake")
    expect(flag.label.length).toBeGreaterThan(0)
  })

  it("accepts a detail and source override and reads severity from the taxonomy", () => {
    const flag = makeIntakeFlag("medication_count_high", { detail: "2 medications", source: "clinical" })
    expect(flag.detail).toBe("2 medications")
    expect(flag.source).toBe("clinical")
    expect(flag.severity).toBe("info")
  })
})

describe("severity discipline", () => {
  it("attentionFlags returns only attention-severity flags", () => {
    const flags = [makeIntakeFlag("medication_count_high"), makeIntakeFlag("medication_strength_missing")]
    expect(attentionFlags(flags).map((f) => f.code)).toEqual(["medication_strength_missing"])
  })

  it("never assigns an unknown severity in the taxonomy", () => {
    for (const entry of Object.values(INTAKE_FLAG_TAXONOMY)) {
      expect(["attention", "info"]).toContain(entry.severity)
    }
  })
})

describe("dedupeIntakeFlags", () => {
  it("collapses duplicate codes, keeping the highest severity (attention beats info)", () => {
    const flags: IntakeFlag[] = [
      makeIntakeFlag("medication_count_high"), // info
      { code: "medication_count_high", label: "Many meds", source: "intake", severity: "attention" },
      makeIntakeFlag("medication_strength_missing"),
    ]
    const out = dedupeIntakeFlags(flags)
    expect(out).toHaveLength(2)
    expect(out.find((f) => f.code === "medication_count_high")?.severity).toBe("attention")
  })
})

describe("parseIntakeFlags (defensive JSONB reader)", () => {
  it("returns [] for null, non-arrays, and malformed entries", () => {
    expect(parseIntakeFlags(null)).toEqual([])
    expect(parseIntakeFlags("nope")).toEqual([])
    expect(parseIntakeFlags([{ code: "x" }])).toEqual([])
    expect(parseIntakeFlags([{ code: "x", label: "y", source: "intake", severity: "loud" }])).toEqual([])
  })

  it("keeps valid flags and drops junk", () => {
    const valid = makeIntakeFlag("medication_form_missing")
    expect(parseIntakeFlags([valid, { junk: true }])).toEqual([valid])
  })
})
