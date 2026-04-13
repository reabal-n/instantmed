import { describe, expect,it } from "vitest"

import {
  DURATION_OPTIONS,
  getProgressiveSymptomOptions,
  getRandomizedSymptomOptions,
  getSeverityOptions,
  getTreatmentDurationOptions,
  SEVERITY_OPTIONS,
  shuffleOptions,
  SYMPTOM_OPTIONS,
  TREATMENT_DURATION_OPTIONS,
} from "@/lib/security/option-randomizer"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("SYMPTOM_OPTIONS", () => {
  it("should contain 8 options", () => {
    expect(SYMPTOM_OPTIONS).toHaveLength(8)
  })

  it("should have unique ids", () => {
    const ids = SYMPTOM_OPTIONS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should include an "other" option as the last entry', () => {
    const last = SYMPTOM_OPTIONS[SYMPTOM_OPTIONS.length - 1]
    expect(last.id).toBe("other")
  })
})

describe("DURATION_OPTIONS", () => {
  it("should contain 4 options", () => {
    expect(DURATION_OPTIONS).toHaveLength(4)
  })

  it("should have numeric values", () => {
    for (const opt of DURATION_OPTIONS) {
      expect(typeof opt.value).toBe("number")
    }
  })

  it("should cap displayed value at 4 to hide the 5-day threshold", () => {
    const maxValue = Math.max(...DURATION_OPTIONS.map((o) => o.value))
    expect(maxValue).toBe(4)
  })
})

describe("SEVERITY_OPTIONS", () => {
  it("should contain 3 options", () => {
    expect(SEVERITY_OPTIONS).toHaveLength(3)
  })

  it("should use relative language, not clinical thresholds", () => {
    for (const opt of SEVERITY_OPTIONS) {
      expect(opt.label).not.toMatch(/\d/)
    }
  })
})

describe("TREATMENT_DURATION_OPTIONS", () => {
  it("should contain 3 options", () => {
    expect(TREATMENT_DURATION_OPTIONS).toHaveLength(3)
  })

  it("should have unique ids", () => {
    const ids = TREATMENT_DURATION_OPTIONS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ---------------------------------------------------------------------------
// shuffleOptions
// ---------------------------------------------------------------------------

describe("shuffleOptions", () => {
  it("should return a new array of the same length", () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleOptions(input, "seed")
    expect(result).toHaveLength(input.length)
    expect(result).not.toBe(input) // different reference
  })

  it("should preserve all original elements (no duplicates, no losses)", () => {
    const input = ["a", "b", "c", "d", "e"]
    const result = shuffleOptions(input, "test-seed")
    expect([...result].sort()).toEqual([...input].sort())
  })

  it("should be deterministic with the same seed", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = shuffleOptions(input, "deterministic")
    const b = shuffleOptions(input, "deterministic")
    expect(a).toEqual(b)
  })

  it("should produce different orders for different seeds", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const a = shuffleOptions(input, "seed-alpha")
    const b = shuffleOptions(input, "seed-beta")
    // With 10 elements the chance of identical order from different seeds is negligible
    expect(a).not.toEqual(b)
  })

  it("should not mutate the original array", () => {
    const input = [10, 20, 30, 40]
    const copy = [...input]
    shuffleOptions(input, "no-mutate")
    expect(input).toEqual(copy)
  })

  it("should handle single-element arrays", () => {
    const result = shuffleOptions(["only"], "seed")
    expect(result).toEqual(["only"])
  })

  it("should handle empty arrays", () => {
    const result = shuffleOptions([], "seed")
    expect(result).toEqual([])
  })

  it("should work with object arrays", () => {
    const input = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 3, name: "c" },
    ]
    const result = shuffleOptions(input, "obj-seed")
    expect(result).toHaveLength(3)
    const ids = result.map((o) => o.id).sort()
    expect(ids).toEqual([1, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// getRandomizedSymptomOptions
// ---------------------------------------------------------------------------

describe("getRandomizedSymptomOptions", () => {
  it('should always place "other" as the last option', () => {
    const result = getRandomizedSymptomOptions("session-abc")
    const last = result[result.length - 1]
    expect(last.id).toBe("other")
  })

  it("should return the same count as SYMPTOM_OPTIONS", () => {
    const result = getRandomizedSymptomOptions("session-xyz")
    expect(result).toHaveLength(SYMPTOM_OPTIONS.length)
  })

  it("should contain all original symptom ids", () => {
    const result = getRandomizedSymptomOptions("session-check")
    const resultIds = result.map((o) => o.id).sort()
    const originalIds = SYMPTOM_OPTIONS.map((o) => o.id).sort()
    expect(resultIds).toEqual(originalIds)
  })

  it("should be deterministic for the same session id", () => {
    const a = getRandomizedSymptomOptions("same-session")
    const b = getRandomizedSymptomOptions("same-session")
    expect(a).toEqual(b)
  })

  it("should randomize non-other options for different sessions", () => {
    const a = getRandomizedSymptomOptions("session-one")
    const b = getRandomizedSymptomOptions("session-two")
    // Compare only the first 7 elements (excluding "other" at the end)
    const aIds = a.slice(0, -1).map((o) => o.id)
    const bIds = b.slice(0, -1).map((o) => o.id)
    expect(aIds).not.toEqual(bIds)
  })
})

// ---------------------------------------------------------------------------
// getSeverityOptions
// ---------------------------------------------------------------------------

describe("getSeverityOptions", () => {
  it("should return SEVERITY_OPTIONS unchanged", () => {
    expect(getSeverityOptions()).toEqual(SEVERITY_OPTIONS)
  })

  it("should return the same reference (not randomized)", () => {
    expect(getSeverityOptions()).toBe(SEVERITY_OPTIONS)
  })
})

// ---------------------------------------------------------------------------
// getProgressiveSymptomOptions
// ---------------------------------------------------------------------------

describe("getProgressiveSymptomOptions", () => {
  it("should return only 4 options initially (no previousAnswer)", () => {
    const { options, showMore } = getProgressiveSymptomOptions("progressive-session")
    expect(options).toHaveLength(4)
    expect(showMore).toBe(true)
  })

  it("should return all options when previousAnswer is provided", () => {
    const { options, showMore } = getProgressiveSymptomOptions(
      "progressive-session",
      "respiratory"
    )
    expect(options).toHaveLength(SYMPTOM_OPTIONS.length)
    expect(showMore).toBe(false)
  })

  it("should be deterministic for the same session id", () => {
    const a = getProgressiveSymptomOptions("stable-session")
    const b = getProgressiveSymptomOptions("stable-session")
    expect(a.options).toEqual(b.options)
    expect(a.showMore).toBe(b.showMore)
  })

  it("initial options should be a subset of the full randomized set", () => {
    const sessionId = "subset-check"
    const initial = getProgressiveSymptomOptions(sessionId)
    const full = getProgressiveSymptomOptions(sessionId, "expanded")
    const initialIds = initial.options.map((o) => o.id)
    const fullIds = full.options.map((o) => o.id)
    for (const id of initialIds) {
      expect(fullIds).toContain(id)
    }
  })
})

// ---------------------------------------------------------------------------
// getTreatmentDurationOptions
// ---------------------------------------------------------------------------

describe("getTreatmentDurationOptions", () => {
  it("should return TREATMENT_DURATION_OPTIONS unchanged", () => {
    expect(getTreatmentDurationOptions()).toEqual(TREATMENT_DURATION_OPTIONS)
  })

  it("should return the same reference (not randomized)", () => {
    expect(getTreatmentDurationOptions()).toBe(TREATMENT_DURATION_OPTIONS)
  })
})
