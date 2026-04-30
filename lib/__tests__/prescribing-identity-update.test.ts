import { describe, expect, it } from "vitest"

import { buildPrescribingIdentityProfileUpdates } from "@/lib/doctor/prescribing-identity-update"

describe("buildPrescribingIdentityProfileUpdates", () => {
  it("normalizes complete prescribing identity into profile updates", () => {
    const result = buildPrescribingIdentityProfileUpdates({
      dateOfBirth: "1988-01-01",
      sex: "F",
      phone: "0412 345 678",
      medicareNumber: "1111 11111 1",
      medicareIrn: "2",
      medicareExpiry: "2029-05",
      addressLine1: "12 Test Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    })

    expect(result.valid).toBe(true)
    expect(result.updates).toMatchObject({
      date_of_birth: "1988-01-01",
      sex: "F",
      phone: "+61412345678",
      medicare_number: "1111111111",
      medicare_irn: 2,
      medicare_expiry: "2029-05-01",
      address_line1: "12 Test Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    })
  })

  it("returns field errors instead of partial updates for unsafe prescribing identity", () => {
    const result = buildPrescribingIdentityProfileUpdates({
      dateOfBirth: "",
      sex: "X",
      phone: "123",
      medicareNumber: "123",
      medicareIrn: "10",
      medicareExpiry: "2020-01",
      addressLine1: "",
      suburb: "",
      state: "NSW",
      postcode: "3000",
    })

    expect(result.valid).toBe(false)
    expect(result.updates).toEqual({})
    expect(result.fieldErrors).toMatchObject({
      dateOfBirth: expect.any(String),
      sex: expect.any(String),
      phone: expect.any(String),
      medicareNumber: expect.any(String),
      medicareIrn: expect.any(String),
      medicareExpiry: expect.any(String),
      addressLine1: expect.any(String),
      suburb: expect.any(String),
      postcode: expect.any(String),
    })
  })
})
