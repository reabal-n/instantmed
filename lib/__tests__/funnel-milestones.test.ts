import { describe, expect, it } from "vitest"

import { shouldTrackIntakeComplete } from "@/lib/analytics/funnel-milestones"

describe("funnel milestones", () => {
  it("treats review-pay as the completion milestone for repeat prescriptions", () => {
    expect(shouldTrackIntakeComplete({
      currentStepId: "review",
      serviceType: "repeat-script",
    })).toBe(true)
    expect(shouldTrackIntakeComplete({
      currentStepId: "review",
      serviceType: "prescription",
    })).toBe(true)
  })

  it("keeps consult review separate from checkout completion", () => {
    expect(shouldTrackIntakeComplete({
      currentStepId: "review",
      serviceType: "consult",
    })).toBe(false)
    expect(shouldTrackIntakeComplete({
      currentStepId: "checkout",
      serviceType: "consult",
    })).toBe(true)
  })
})
