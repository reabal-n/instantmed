import { describe, expect, it } from "vitest"

import {
  parseAustralianStreetAddress,
  validateAustralianAddress,
} from "@/lib/validation/australian-address"

describe("parseAustralianStreetAddress", () => {
  it.each([
    ["12 Smith Road", { street_number: "12", street_name: "Smith Road" }],
    ["12/34 Smith Road", { street_number: "12/34", street_name: "Smith Road" }],
    ["Unit 5, 22 King Street", { street_number: "5/22", street_name: "King Street" }],
    ["Level 1/457-459 Elizabeth Street", { street_number: "1/457-459", street_name: "Elizabeth Street" }],
  ])("separates the street number in %s", (input, expected) => {
    expect(parseAustralianStreetAddress(input)).toEqual(expected)
  })

  it("does not invent a street number from locality or postcode text", () => {
    expect(parseAustralianStreetAddress("Forster Street Mascot 2020 NSW")).toEqual({
      street_name: "Forster Street Mascot 2020 NSW",
    })
  })
})

describe("validateAustralianAddress", () => {
  const address = {
    addressLine1: "Forster Street Mascot 2020 NSW",
    suburb: "Mascot",
    state: "NSW",
    postcode: "2020",
  }

  it("requires a street number only for workflows that request it", () => {
    expect(validateAustralianAddress(address).valid).toBe(true)
    expect(validateAustralianAddress(address, { requireStreetNumber: true })).toMatchObject({
      valid: false,
      errors: {
        addressLine1: "Include the street number, for example 12 Smith Street.",
      },
    })
  })
})
