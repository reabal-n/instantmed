import { describe, expect, it } from "vitest"

import { validateMedicareNumber } from "@/lib/validation/medicare"

describe("validateMedicareNumber", () => {
  it("rejects all-zero Medicare numbers", () => {
    expect(validateMedicareNumber("0000000000")).toEqual({
      valid: false,
      error: "Enter a valid Medicare number",
    })
  })
})
