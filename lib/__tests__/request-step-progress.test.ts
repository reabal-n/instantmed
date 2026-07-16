import { describe, expect, it } from "vitest"

import { deriveRequestStepProgress } from "@/lib/request/step-progress"

describe("request step progress", () => {
  it("keeps the earliest invalidated step actionable and blocks later visited steps", () => {
    const progress = deriveRequestStepProgress({
      stepIds: ["certificate", "symptoms", "details", "checkout"],
      currentStepId: "symptoms",
      furthestVisitedStepId: "checkout",
      stepsNeedingRevalidation: ["symptoms"],
    })

    expect(progress.furthestVisitedIndex).toBe(3)
    expect(progress.firstRevalidationIndex).toBe(1)
    expect(progress.maxReachableIndex).toBe(1)
  })
})
