import { describe, expect, it } from "vitest"

import { getParchmentPatientIdentityIssues } from "@/lib/parchment/sync-patient"
import type { Profile } from "@/types/db"

const baseProfile = {
  id: "profile-1",
  full_name: "Joshua Bryant",
  date_of_birth: "1997-05-24",
  sex: "M",
  phone: "0412074190",
  email: "joshua@example.com",
  medicare_number: "2123456701",
  medicare_irn: 1,
  medicare_expiry: "2029-05-01",
  address_line1: "21 Kent Road",
  address_line2: null,
  suburb: "Dapto",
  state: "NSW",
  postcode: "2530",
} as Profile

describe("getParchmentPatientIdentityIssues", () => {
  it("accepts a complete prescribing identity from the profile", () => {
    expect(getParchmentPatientIdentityIssues(baseProfile)).toEqual([])
  })

  it("uses intake answer fallbacks before blocking Parchment sync", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_number: null,
      medicare_irn: null,
      medicare_expiry: null,
      sex: null,
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
    }, {
      medicareNumber: "2123 45670 1",
      medicareIrn: "1",
      medicareExpiry: "2029-05-01",
      sex: "F",
      addressLine1: "Unit 2, 21 Kent Road",
      suburb: "Dapto",
      state: "NSW",
      postcode: "2530",
    })).toEqual([])
  })

  it("flags street-only manual addresses as incomplete for prescribing", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      address_line1: "12 Manual Entry Road",
      suburb: null,
      state: null,
      postcode: null,
    })).toEqual(["Address suburb", "Address state", "Address postcode"])
  })

  it("blocks Parchment sync when Medicare IRN or card expiry is missing", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_irn: null,
      medicare_expiry: null,
    })).toEqual(["Medicare IRN", "Medicare expiry"])
  })

  it("blocks Parchment sync when Medicare card expiry is expired", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_expiry: "2020-01-01",
    })).toEqual(["Valid Medicare expiry"])
  })
})
