import { describe, expect, it } from "vitest"

import * as parchmentClient from "@/lib/parchment/client"
import { parseParchmentErrorMetadata } from "@/lib/parchment/error-metadata"
import {
  buildCreatePatientRequest,
  buildUpdatePatientRequest,
  getParchmentPatientIdentityIssues,
} from "@/lib/parchment/sync-patient"
import type { Profile } from "@/types/db"

describe("Parchment error metadata", () => {
  it("classifies the provider HSD failure without retaining arbitrary response detail", () => {
    const providerFailure = parseParchmentErrorMetadata(JSON.stringify({
      code: "INTERNAL_ERROR",
      error: {
        detail: "The record could not be validated against the Health Servies Directory",
      },
      requestId: "req_safe_123",
    }))
    expect(providerFailure).toEqual({
      code: "INTERNAL_ERROR",
      reason: "health_services_directory_validation",
      requestId: "req_safe_123",
      safeDetail: "The record could not be validated against the Health Services Directory.",
    })

    const arbitraryFailure = parseParchmentErrorMetadata(JSON.stringify({
      code: "INTERNAL_ERROR",
      error: { detail: "Patient Jane Example could not be updated" },
      requestId: "req_safe_456",
    }))
    expect(arbitraryFailure?.safeDetail).toBeUndefined()
  })

  it("separates provider identity-service failures from fixable patient detail errors", async () => {
    const syncModule = await import("@/lib/parchment/sync-patient")
    const format = (syncModule as typeof syncModule & {
      formatParchmentPatientSyncError?: (
        error: InstanceType<typeof syncModule.ParchmentPatientSyncError>,
        options?: { patientSaved?: boolean },
      ) => string
    }).formatParchmentPatientSyncError

    expect(format).toBeTypeOf("function")

    const providerError = new syncModule.ParchmentPatientSyncError(
      "Failed to refresh patient details in Parchment",
      new parchmentClient.ParchmentApiError("Parchment update patient failed: 500", 500, {
        code: "INTERNAL_ERROR",
        reason: "health_services_directory_validation",
        requestId: "req_safe_123",
      }),
    )
    expect(format?.(providerError, { patientSaved: true })).toBe(
      "Patient saved, but Parchment's identity verification service failed. Your InstantMed details are saved; retry later or open the linked patient directly in Parchment.",
    )

    const genericProviderError = new syncModule.ParchmentPatientSyncError(
      "Failed to refresh patient details in Parchment",
      new parchmentClient.ParchmentApiError("Parchment update patient failed: 500", 500, {
        code: "INTERNAL_ERROR",
        reason: "unknown",
        requestId: "req_safe_456",
      }),
    )
    expect(format?.(genericProviderError)).toBe(
      "Parchment is temporarily unavailable. Your InstantMed details are saved; retry later.",
    )

    const validationError = new syncModule.ParchmentPatientSyncError(
      "Failed to refresh patient details in Parchment",
      new parchmentClient.ParchmentApiError("Parchment update patient failed: 422", 422, {
        reason: "validation",
      }),
    )
    expect(format?.(validationError)).toBe(
      "Parchment rejected the patient details. Check given/family name, Medicare/IHI, address, DOB, phone, and sex; then retry.",
    )
  })
})

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
    })).toEqual(["Valid Medicare number"])
  })

  it("accepts a valid IHI when the patient has no Medicare card", () => {
    expect(getParchmentPatientIdentityIssues({
      ...baseProfile,
      medicare_number: null,
      medicare_irn: null,
      medicare_expiry: null,
      ihi_number: "8003600000000000",
    })).toEqual([])
  })

  it("uses valid IHI in Parchment payload helpers and omits invalid Medicare placeholders", () => {
    const createPayload = buildCreatePatientRequest({
      ...baseProfile,
      medicare_number: "0000000000",
      medicare_irn: 1,
      medicare_expiry: "2029-05-01",
      ihi_number: "8003600000000000",
    }, "profile-1")
    const updatePayload = buildUpdatePatientRequest({
      ...baseProfile,
      medicare_number: "0000000000",
      medicare_irn: 1,
      medicare_expiry: "2029-05-01",
      ihi_number: "8003600000000000",
    })

    expect(createPayload.ihi_number).toBe("8003600000000000")
    expect(updatePayload.ihi_number).toBe("8003600000000000")
    expect(createPayload.medicare_card_number).toBeUndefined()
    expect(updatePayload.medicare_card_number).toBeNull()
    expect(updatePayload.medicare_irn).toBeNull()
    expect(updatePayload.medicare_valid_to).toBeNull()
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

// Audit follow-up (2026-06-27): plan-02 added structured first_name/last_name so
// the eScript family name is correct, but Parchment was still naively splitting
// full_name. The Parchment payload must PREFER the structured names and only fall
// back to the full_name split when either is missing.
describe("buildCreate/UpdatePatientRequest name resolution", () => {
  it("prefers structured first_name/last_name over a naive full_name split", () => {
    const profile = {
      ...baseProfile,
      full_name: "Mary Anne Van Der Berg",
      first_name: "Mary Anne",
      last_name: "Van Der Berg",
    } as Profile

    const createPayload = buildCreatePatientRequest(profile, "profile-1")
    const updatePayload = buildUpdatePatientRequest(profile)

    // Naive split would have given given="Mary", family="Anne Van Der Berg".
    expect(createPayload.given_name).toBe("Mary Anne")
    expect(createPayload.family_name).toBe("Van Der Berg")
    expect(updatePayload.given_name).toBe("Mary Anne")
    expect(updatePayload.family_name).toBe("Van Der Berg")
  })

  it("falls back to the full_name split when structured names are absent", () => {
    const createPayload = buildCreatePatientRequest(baseProfile, "profile-1")
    expect(createPayload.given_name).toBe("Joshua")
    expect(createPayload.family_name).toBe("Bryant")
  })

  it("falls back to the full_name split when only one structured name is present", () => {
    const partial = { ...baseProfile, first_name: "Joshua", last_name: null } as Profile
    const createPayload = buildCreatePatientRequest(partial, "profile-1")
    expect(createPayload.given_name).toBe("Joshua")
    expect(createPayload.family_name).toBe("Bryant")
  })
})
