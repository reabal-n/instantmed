import { describe, expect, it } from "vitest"

import { DECLINE_REASONS, isAdministrativeClosure,validateDeclineReason } from "@/lib/doctor/constants"

describe("Decline reasons", () => {
  it("covers clinical and administrative outcomes independently", () => {
    expect(DECLINE_REASONS.map(r => r.code)).toEqual([
      "requires_examination", "usual_clinician_review", "prescribing_guidelines",
      "repeat_too_soon", "outside_scope", "duplicate_request", "patient_cancelled",
      "urgent_care_needed", "other",
    ])
    expect(isAdministrativeClosure("duplicate_request")).toBe(true)
    expect(isAdministrativeClosure("patient_cancelled")).toBe(true)
    expect(isAdministrativeClosure("repeat_too_soon")).toBe(false)
  })
  it("requires a deliberate reason and completed patient details", () => {
    expect(validateDeclineReason("", "Some detail")).toBeTruthy()
    expect(validateDeclineReason("unknown", "Some detail")).toBeTruthy()
    expect(validateDeclineReason("other", " ")).toBeTruthy()
    expect(validateDeclineReason("prescribing_guidelines", "Please [explain why].")).toBeTruthy()
    expect(validateDeclineReason("other", "Please see your usual GP to review this treatment.")).toBeNull()
  })
  it("requires completion of safety-critical templates without a blanket supply interval", () => {
    for (const code of ["prescribing_guidelines", "repeat_too_soon", "outside_scope", "urgent_care_needed"]) {
      const reason = DECLINE_REASONS.find(r => r.code === code)!
      expect(validateDeclineReason(code, reason.template)).toBeTruthy()
    }
    for (const reason of DECLINE_REASONS) {
      expect(reason.template).not.toMatch(/refund|seven.day|7.day/i)
    }
  })
})
