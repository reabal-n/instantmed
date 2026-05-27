import { describe, expect, it } from "vitest"

import {
  buildCreatePatientRequest,
  buildUpdatePatientRequest,
  getParchmentPatientIdentityIssues,
} from "@/lib/parchment/sync-patient"
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

  it("blocks Parchment sync when Medicare IRN is missing but allows absent card expiry", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_irn: null,
      medicare_expiry: null,
    })).toEqual(["Medicare IRN"])

    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_expiry: null,
    })).toEqual([])
  })

  it("blocks Parchment sync for all-zero Medicare placeholders", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_number: "0000000000",
    })).toEqual(["Valid Medicare"])
  })

  it("does not include invalid Medicare details in Parchment payload helpers", () => {
    const createPayload = buildCreatePatientRequest({
      ...baseProfile,
      medicare_number: "0000000000",
      medicare_irn: 1,
      medicare_expiry: "2029-05-01",
    }, "profile-1")
    const updatePayload = buildUpdatePatientRequest({
      ...baseProfile,
      medicare_number: "0000000000",
      medicare_irn: 1,
      medicare_expiry: "2029-05-01",
    })

    expect(createPayload.medicare_card_number).toBeUndefined()
    expect(createPayload.medicare_irn).toBeUndefined()
    expect(createPayload.medicare_valid_to).toBeUndefined()
    expect(updatePayload.medicare_card_number).toBeUndefined()
    expect(updatePayload.medicare_irn).toBeUndefined()
    expect(updatePayload.medicare_valid_to).toBeUndefined()
  })

  it("flags Medicare card expiry only when an invalid expiry is supplied", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_expiry: "2020-01-01",
    })).toEqual(["Valid Medicare expiry"])
  })

  it("uses validated intake answer fallbacks in the create patient payload", () => {
    const payload = buildCreatePatientRequest({
      ...baseProfile,
      email: null,
      phone: null,
    }, "profile-1", {
      email: "fallback@example.com",
      mobilePhone: "04 1207 4190",
    })

    expect(payload.email).toBe("fallback@example.com")
    expect(payload.phone).toBe("0412074190")
  })

  it("uses validated intake answer fallbacks in the update patient payload", () => {
    const payload = buildUpdatePatientRequest({
      ...baseProfile,
      email: null,
      phone: null,
    }, {
      email: "fallback@example.com",
      mobile: "04 1207 4190",
    })

    expect(payload.email).toBe("fallback@example.com")
    expect(payload.phone).toBe("0412074190")
  })

  it("uses active intake answers before stale profile fields in Parchment payloads", () => {
    const payload = buildUpdatePatientRequest(baseProfile, {
      email: "current@example.com",
      mobilePhone: "04 1207 4190",
      medicareNumber: "2123456701",
      medicareIrn: "4",
      medicareExpiry: "2030-06-01",
      sex: "F",
      addressLine1: "Unit 2, 21 Kent Road",
      suburb: "Dapto",
      state: "NSW",
      postcode: "2530",
    })

    expect(payload.email).toBe("current@example.com")
    expect(payload.phone).toBe("0412074190")
    expect(payload.sex).toBe("F")
    expect(payload.medicare_card_number).toBe("2123456701")
    expect(payload.medicare_irn).toBe("4")
    expect(payload.medicare_valid_to).toBe("2030-06-01")
    expect(payload.australian_address).toMatchObject({
      street_number: "2/21",
      street_name: "Kent Road",
      suburb: "Dapto",
      state: "NSW",
      postcode: "2530",
    })
  })

  it("does not mix a partial intake address with stale profile address fragments before Parchment sync", () => {
    expect(getParchmentPatientIdentityIssues(baseProfile, {
      addressLine1: "Unit 2, 21 Kent Road",
    })).toEqual(["Address suburb", "Address state", "Address postcode"])

    const payload = buildUpdatePatientRequest(baseProfile, {
      addressLine1: "Unit 2, 21 Kent Road",
    })

    expect(payload.australian_address).toMatchObject({
      street_number: "2/21",
      street_name: "Kent Road",
    })
    expect(payload.australian_address?.suburb).toBeUndefined()
    expect(payload.australian_address?.state).toBeUndefined()
    expect(payload.australian_address?.postcode).toBeUndefined()
  })
})
