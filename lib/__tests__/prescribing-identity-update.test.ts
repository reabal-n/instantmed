import { describe, expect, it } from "vitest"

import {
  buildPrescribingIdentityProfileUpdates,
  resolvePrescribingIdentityFormValues,
} from "@/lib/doctor/prescribing-identity-update"

describe("buildPrescribingIdentityProfileUpdates", () => {
  it("prefills the prescribing edit form from active intake answers before stale profile values", () => {
    const values = resolvePrescribingIdentityFormValues({
      date_of_birth: "1980-01-01",
      sex: "M",
      phone: "0400000000",
      medicare_number: "1111111111",
      medicare_irn: 1,
      medicare_expiry: "2029-05-01",
      address_line1: "1 Old Street",
      suburb: "Oldtown",
      state: "VIC",
      postcode: "3000",
    }, {
      dateOfBirth: "1991-06-14",
      sex: "F",
      phone: "0412 345 678",
      medicareNumber: "2123456701",
      medicareIrn: "4",
      medicareExpiry: "2030-06",
      addressLine1: "Unit 2, 21 Kent Road",
      suburb: "Dapto",
      state: "NSW",
      postcode: "2530",
    })

    expect(values).toEqual({
      dateOfBirth: "1991-06-14",
      sex: "F",
      phone: "0412 345 678",
      medicareNumber: "2123456701",
      medicareIrn: "4",
      medicareExpiry: "2030-06",
      addressLine1: "Unit 2, 21 Kent Road",
      suburb: "Dapto",
      state: "NSW",
      postcode: "2530",
    })
  })

  it("does not prefill stale profile address fragments after a partial intake address edit", () => {
    const values = resolvePrescribingIdentityFormValues({
      address_line1: "1 Old Street",
      suburb: "Oldtown",
      state: "VIC",
      postcode: "3000",
    }, {
      addressLine1: "Unit 2, 21 Kent Road",
    })

    expect(values.addressLine1).toBe("Unit 2, 21 Kent Road")
    expect(values.suburb).toBe("")
    expect(values.state).toBe("")
    expect(values.postcode).toBe("")
  })

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

  it("does not require Medicare expiry when updating prescribing identity", () => {
    const result = buildPrescribingIdentityProfileUpdates({
      dateOfBirth: "1988-01-01",
      sex: "F",
      phone: "0412 345 678",
      medicareNumber: "1111 11111 1",
      medicareIrn: "2",
      medicareExpiry: "",
      addressLine1: "12 Test Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    })

    expect(result.valid).toBe(true)
    expect(result.updates).toMatchObject({
      medicare_number: "1111111111",
      medicare_irn: 2,
    })
    expect(result.updates).not.toHaveProperty("medicare_expiry")
  })

  it("rejects invalid Medicare expiry when one is supplied", () => {
    const result = buildPrescribingIdentityProfileUpdates({
      dateOfBirth: "1988-01-01",
      sex: "F",
      phone: "0412 345 678",
      medicareNumber: "1111 11111 1",
      medicareIrn: "2",
      medicareExpiry: "2020-01",
      addressLine1: "12 Test Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    })

    expect(result.valid).toBe(false)
    expect(result.fieldErrors).toMatchObject({
      medicareExpiry: expect.any(String),
    })
  })

  it("returns field errors instead of partial updates for unsafe prescribing identity", () => {
    const result = buildPrescribingIdentityProfileUpdates({
      dateOfBirth: "",
      sex: "X",
      phone: "123",
      medicareNumber: "123",
      medicareIrn: "10",
      medicareExpiry: "",
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
      addressLine1: expect.any(String),
      suburb: expect.any(String),
      postcode: expect.any(String),
    })
  })
})
