import { describe, expect, it } from "vitest"

import {
  attentionFlags,
  dedupeIntakeFlags,
  forcesDoctorReview,
  INTAKE_FLAG_TAXONOMY,
  type IntakeFlag,
  makeIntakeFlag,
  mapEngineSoftFlagToIntakeFlag,
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
    const flag = makeIntakeFlag("medication_count_high", { detail: "7 medications", source: "clinical" })
    expect(flag.detail).toBe("7 medications")
    expect(flag.source).toBe("clinical")
    expect(flag.severity).toBe("info")
  })
})

describe("severity discipline", () => {
  it("attentionFlags returns only attention-severity flags", () => {
    const flags = [makeIntakeFlag("medication_count_high"), makeIntakeFlag("medication_strength_missing")]
    expect(attentionFlags(flags).map((f) => f.code)).toEqual(["medication_strength_missing"])
  })

  it("forcesDoctorReview is true iff at least one attention flag is present", () => {
    expect(forcesDoctorReview([makeIntakeFlag("medication_strength_missing")])).toBe(true)
    expect(forcesDoctorReview([makeIntakeFlag("medication_count_high")])).toBe(false)
    expect(forcesDoctorReview([])).toBe(false)
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
      makeIntakeFlag("symptom_detail_brief"), // info
      { code: "symptom_detail_brief", label: "Brief detail", source: "intake", severity: "attention" },
      makeIntakeFlag("medication_strength_missing"),
    ]
    const out = dedupeIntakeFlags(flags)
    expect(out).toHaveLength(2)
    expect(out.find((f) => f.code === "symptom_detail_brief")?.severity).toBe("attention")
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

describe("mapEngineSoftFlagToIntakeFlag", () => {
  it("parses a 'prefix: detail' soft flag into an info auto_approval flag", () => {
    const flag = mapEngineSoftFlagToIntakeFlag("draft_review_flag: anxiety")
    expect(flag.source).toBe("auto_approval")
    expect(flag.severity).toBe("info")
    expect(flag.detail).toBe("anxiety")
    expect(flag.code).toContain("draft_review_flag")
  })

  it("parses a bare token soft flag with no detail", () => {
    const flag = mapEngineSoftFlagToIntakeFlag("panic_co_symptom")
    expect(flag.source).toBe("auto_approval")
    expect(flag.severity).toBe("info")
    expect(flag.detail).toBeUndefined()
    expect(flag.code).toContain("panic_co_symptom")
  })
})
