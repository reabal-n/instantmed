import { describe, expect, it } from "vitest"

import { validateMedicareDrawerFields } from "@/components/patient/profile-drawers"

describe("Medicare profile drawer validation", () => {
  it("allows valid Medicare number and IRN without expiry", () => {
    expect(validateMedicareDrawerFields({
      expiryMonth: null,
      expiryYear: null,
      irn: 2,
      medicareNumber: "1111111111",
    }).errors).toEqual({})
  })

  it("rejects partial Medicare details before calling the server action", () => {
    expect(validateMedicareDrawerFields({
      expiryMonth: null,
      expiryYear: null,
      irn: 2,
      medicareNumber: "",
    }).errors).toMatchObject({
      medicare: "Medicare number is required when saving card details",
    })
  })

  it("requires both expiry fields when an expiry is provided", () => {
    expect(validateMedicareDrawerFields({
      expiryMonth: "05",
      expiryYear: null,
      irn: 2,
      medicareNumber: "1111111111",
    }).errors).toMatchObject({
      expiry: "Select both expiry month and year, or leave expiry blank",
    })
  })
})
