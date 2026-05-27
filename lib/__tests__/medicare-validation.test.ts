import { describe, expect, it } from "vitest"

import { validateMedicareNumber } from "@/lib/validation/medicare"

describe("validateMedicareNumber", () => {
  it("rejects all-zero Medicare numbers", () => {
    expect(validateMedicareNumber("0000000000")).toEqual({
      valid: false,
      error: "Enter a valid Medicare number",
    })
  })

  it("rejects deterministic test numbers unless explicitly allowed", () => {
    expect(validateMedicareNumber("1111111111", { allowTestNumbers: false })).toEqual({
      valid: false,
      error: "Enter a real Medicare number",
    })
    expect(validateMedicareNumber("1234567890", { allowTestNumbers: false })).toEqual({
      valid: false,
      error: "Enter a real Medicare number",
    })
  })

  it("allows deterministic test numbers only for test fixtures", () => {
    expect(validateMedicareNumber("1111111111", { allowTestNumbers: true })).toEqual({
      valid: true,
    })
  })
})
