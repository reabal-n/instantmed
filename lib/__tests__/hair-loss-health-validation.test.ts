import { describe, expect, it } from "vitest"

import { hairLossHealthStepSchema } from "@/lib/request/validation"

describe("hairLossHealthStepSchema", () => {
  it("requires the full health screen before continuing", () => {
    const result = hairLossHealthStepSchema.safeParse({
      hairReproductive: "no",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."))
      expect(paths).toContain("scalp")
      expect(paths).toContain("bloodPressureAndHeart")
      expect(paths).toContain("takes_medications")
      expect(paths).toContain("has_allergies")
      expect(paths).toContain("has_conditions")
    }
  })

  it("passes when scalp, cardiovascular, and shared medical history sections are complete", () => {
    const result = hairLossHealthStepSchema.safeParse({
      hairReproductive: "no",
      scalpNone: true,
      hairLowBP: false,
      hairHeartConditions: false,
      takes_medications: "no",
      has_allergies: "no",
      has_conditions: "no",
    })

    expect(result.success).toBe(true)
  })
})
