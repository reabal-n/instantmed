import { describe, expect, it } from "vitest"

import {
  buildCheckoutIdentityProfileUpdates,
  buildPrescribingProfileUpdates,
} from "@/lib/stripe/prescribing-profile-fields"

describe("buildPrescribingProfileUpdates", () => {
  it("extracts prescribing identity fields from unified checkout answers", () => {
    expect(buildPrescribingProfileUpdates({
      medicareNumber: "2420 99202 9",
      medicareIrn: "2",
      medicareExpiry: "2029-05-01",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    })).toEqual({
      medicare_number: "2420992029",
      medicare_irn: 2,
      medicare_expiry: "2029-05-01",
      address_line1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    })
  })

  it("does not emit blank or invalid enum fields", () => {
    expect(buildPrescribingProfileUpdates({
      medicareNumber: " ",
      medicareIrn: "12",
      medicareExpiry: "not-a-date",
      addressLine1: "",
      suburb: " ",
      state: "Victoria",
      postcode: "3000",
      sex: "male",
    })).toEqual({
      postcode: "3000",
    })
  })

  it("normalizes MM/YY Medicare expiry from legacy intake answers", () => {
    expect(buildPrescribingProfileUpdates({
      medicareNumber: "2420992029",
      medicareIrn: 4,
      medicareExpiry: "06/30",
    })).toEqual({
      medicare_number: "2420992029",
      medicare_irn: 4,
      medicare_expiry: "2030-06-01",
    })
  })
})

describe("buildCheckoutIdentityProfileUpdates", () => {
  it("persists missing authenticated identity fields collected in the request flow", () => {
    expect(buildCheckoutIdentityProfileUpdates({
      full_name: "Pat Existing",
      date_of_birth: null,
      phone: null,
    }, {
      fullName: "Pat Existing",
      dateOfBirth: "1985-04-01",
      phone: "0412 345 678",
    })).toEqual({
      date_of_birth: "1985-04-01",
      phone: "0412 345 678",
    })
  })

  it("does not overwrite existing profile identity fields", () => {
    expect(buildCheckoutIdentityProfileUpdates({
      full_name: "Pat Existing",
      date_of_birth: "1980-01-01",
      phone: "0400 000 000",
    }, {
      fullName: "Different Name",
      dateOfBirth: "1985-04-01",
      phone: "0412 345 678",
    })).toEqual({})
  })
})
