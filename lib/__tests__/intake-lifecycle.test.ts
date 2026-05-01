import { describe, expect, it } from "vitest"

import { validateIntakeStatusTransition } from "@/lib/data/intake-lifecycle"

describe("validateIntakeStatusTransition", () => {
  it("allows an in-review prescribing case to move to awaiting script", () => {
    expect(validateIntakeStatusTransition("in_review", "awaiting_script", "paid")).toMatchObject({
      valid: true,
    })
  })
})
