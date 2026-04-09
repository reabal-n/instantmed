import { describe, it, expect } from "vitest"
import {
  getContraindicationRationale,
  getRationaleSeverity,
} from "@/lib/clinical/contraindication-rationales"

describe("getContraindicationRationale", () => {
  it("returns destructive-severity rationale for nitrate use when true", () => {
    const r = getContraindicationRationale("nitrates", true)
    expect(r).not.toBeNull()
    expect(r?.severity).toBe("destructive")
    expect(r?.text.toLowerCase()).toContain("nitrate")
  })

  it("returns null for nitrates when false", () => {
    expect(getContraindicationRationale("nitrates", false)).toBeNull()
  })

  it("returns destructive rationale for recentHeartEvent = true", () => {
    const r = getContraindicationRationale("recentHeartEvent", true)
    expect(r?.severity).toBe("destructive")
  })

  it("returns warning rationale for edHypertension = true", () => {
    const r = getContraindicationRationale("edHypertension", true)
    expect(r?.severity).toBe("warning")
  })

  it("returns null for unknown field", () => {
    expect(getContraindicationRationale("unknownField", true)).toBeNull()
  })
})

describe("getRationaleSeverity", () => {
  it("returns null for benign answers", () => {
    expect(getRationaleSeverity("edDuration", "6 months")).toBeNull()
  })
})
