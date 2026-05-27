import { describe, expect, it } from "vitest"

import {
  buildCheckoutIdentityProfileUpdates,
  buildPrescribingProfileUpdates,
} from "@/lib/stripe/prescribing-profile-fields"

describe("buildPrescribingProfileUpdates", () => {
  it("extracts prescribing identity fields from unified checkout answers", () => {
    expect(buildPrescribingProfileUpdates({
      medicareNumber: "2123 45670 1",
      medicareIrn: "2",
      medicareExpiry: "2029-05-01",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    })).toEqual({
      medicare_number: "2123456701",
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

  it("does not persist all-zero Medicare placeholders from checkout answers", () => {
    expect(buildPrescribingProfileUpdates({
      medicareNumber: "0000000000",
      medicareIrn: "2",
    })).toEqual({})
  })

  it("normalizes MM/YY Medicare expiry from legacy intake answers", () => {
    expect(buildPrescribingProfileUpdates({
      medicareNumber: "2123456701",
      medicareIrn: 4,
      medicareExpiry: "06/30",
    })).toEqual({
      medicare_number: "2123456701",
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

  it("syncs changed identity fields collected in the request flow", () => {
    expect(buildCheckoutIdentityProfileUpdates({
      full_name: "Pat Existing",
      date_of_birth: "1980-01-01",
      phone: "0400 000 000",
    }, {
      fullName: "Different Name",
      dateOfBirth: "1985-04-01",
      phone: "0412 345 678",
    })).toEqual({
      full_name: "Different Name",
      date_of_birth: "1985-04-01",
      phone: "0412 345 678",
    })
  })
})
