import { describe, expect, it } from "vitest"

import {
  buildPatientSnapshot,
  collapseDuplicatePatientProfiles,
  findPotentialDuplicatePatients,
  getPatientSnapshotOptionsForCase,
  summarizeDuplicatePatientProfiles,
} from "@/lib/doctor/patient-snapshot"

const now = new Date("2026-04-29T12:00:00+10:00")

describe("buildPatientSnapshot", () => {
  it("surfaces complete patient identifiers with a profile link", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-1",
      full_name: "Marcus Pearson",
      date_of_birth: "2001-11-24",
      medicare_number: "2123456701",
      phone: "0467 326 610",
      email: "marcus@example.com",
      address_line1: "12 George St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    }, { now })

    expect(snapshot.age).toBe(24)
    expect(snapshot.ageDobLabel).toBe("24y / 24/11/2001")
    expect(snapshot.medicare.label).toBe("2123456701")
    expect(snapshot.address.label).toBe("12 George St, Sydney, NSW, 2000")
    expect(snapshot.profileHref).toBe("/doctor/patients/patient-1")
    expect(snapshot.missingCriticalFields).toEqual([])
    expect(snapshot.completenessTone).toBe("complete")
  })

  it("does not hide missing clinical identifiers behind N/A", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-2",
      full_name: "Daniel McDonald",
      date_of_birth: null,
      medicare_number: null,
      phone: null,
      email: "daniel@example.com",
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
    }, { now })

    expect(snapshot.ageDobLabel).toBe("Not provided")
    expect(snapshot.medicare.label).toBe("Not provided")
    expect(snapshot.address.label).toBe("Not provided")
    expect(snapshot.missingCriticalFields).toEqual(["DOB", "Medicare", "Phone", "Address"])
    expect(snapshot.completenessLabel).toBe("Missing DOB, Medicare, Phone, Address")
    expect(snapshot.completenessTone).toBe("missing")
  })

  it("uses intake answers as a case-level fallback when the profile row is incomplete", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-3",
      full_name: "Joshua Bryant",
      date_of_birth: "1997-05-24",
      medicare_number: null,
      phone: "0412 074 190",
      email: "joshua@example.com",
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
    }, {
      now,
      answers: {
        medicareNumber: "2420992029",
        addressLine1: "12 Manual Entry Road",
      },
      requireStructuredAddress: true,
    })

    expect(snapshot.medicare.label).toBe("2420992029")
    expect(snapshot.medicare.value).toBe("2420992029")
    expect(snapshot.address.label).toBe("12 Manual Entry Road")
    expect(snapshot.address.present).toBe(true)
    expect(snapshot.address.complete).toBe(false)
    expect(snapshot.address.verificationLabel).toBe("Manual address")
    expect(snapshot.address.verificationTone).toBe("warning")
    expect(snapshot.missingCriticalFields).toEqual(["Address suburb", "Address state", "Address postcode"])
    expect(snapshot.completenessTone).toBe("partial")
  })

  it("uses active intake answers before stale profile fields for case review", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-stale-profile",
      full_name: "Stale Profile",
      date_of_birth: "1980-01-01",
      medicare_number: "1111111111",
      medicare_irn: 1,
      phone: "0400 000 000",
      email: "old@example.com",
      address_line1: "1 Old Street",
      suburb: "Oldtown",
      state: "VIC",
      postcode: "3000",
      sex: "M",
    }, {
      now,
      answers: {
        dateOfBirth: "1991-06-14",
        medicareNumber: "2123456701",
        medicareIrn: "4",
        phone: "0412 345 678",
        email: "current@example.com",
        addressLine1: "Unit 2, 21 Kent Road",
        suburb: "Dapto",
        state: "NSW",
        postcode: "2530",
        sex: "F",
      },
      requireStructuredAddress: true,
      requireSex: true,
      requireMedicareDetails: true,
    })

    expect(snapshot.ageDobLabel).toBe("34y / 14/06/1991")
    expect(snapshot.sex.label).toBe("Female")
    expect(snapshot.phone.label).toBe("0412 345 678")
    expect(snapshot.email.label).toBe("current@example.com")
    expect(snapshot.medicare.label).toBe("2123456701")
    expect(snapshot.medicare.detailsLabel).toBe("IRN 4")
    expect(snapshot.address.label).toBe("Unit 2, 21 Kent Road, Dapto, NSW, 2530")
    expect(snapshot.missingCriticalFields).toEqual([])
  })

  it("does not mix partial intake address edits with stale profile address fragments", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-partial-address",
      full_name: "Partial Address",
      date_of_birth: "1991-06-14",
      medicare_number: "1111111111",
      phone: "0412 345 678",
      email: "partial@example.com",
      address_line1: "1 Old Street",
      suburb: "Oldtown",
      state: "VIC",
      postcode: "3000",
    }, {
      now,
      answers: {
        addressLine1: "Unit 2, 21 Kent Road",
      },
      requireStructuredAddress: true,
    })

    expect(snapshot.address.label).toBe("Unit 2, 21 Kent Road")
    expect(snapshot.address.complete).toBe(false)
    expect(snapshot.missingCriticalFields).toEqual(["Address suburb", "Address state", "Address postcode"])
  })

  it("surfaces verified address metadata for clinical review", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-verified-address",
      full_name: "Verified Address",
      date_of_birth: "1991-06-14",
      medicare_number: "1111111111",
      phone: "0412 345 678",
      email: "verified@example.com",
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
    }, {
      now,
      answers: {
        addressLine1: "Unit 2, 21 Kent Road",
        suburb: "Dapto",
        state: "NSW",
        postcode: "2530",
        addressVerified: true,
        addressProviderPlaceId: "af:abc-123",
      },
      requireStructuredAddress: true,
    })

    expect(snapshot.address.label).toBe("Unit 2, 21 Kent Road, Dapto, NSW, 2530")
    expect(snapshot.address.complete).toBe(true)
    expect(snapshot.address.verificationLabel).toBe("Verified via Addressfinder")
    expect(snapshot.address.verificationTone).toBe("success")
    expect(snapshot.address.verified).toBe(true)
  })

  it("surfaces prescribing sex from profile or intake answers when required", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-4",
      full_name: "Riley Example",
      date_of_birth: "1985-01-01",
      medicare_number: "2420992029",
      phone: "0412 345 678",
      email: "riley@example.com",
      address_line1: "12 George St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: null,
    }, {
      now,
      answers: { sex: "F" },
      requireSex: true,
      requireStructuredAddress: true,
    })

    expect(snapshot.sex.label).toBe("Female")
    expect(snapshot.sex.value).toBe("F")
    expect(snapshot.missingCriticalFields).toEqual([])
  })

  it("flags invalid Medicare numbers when prescribing validation is required", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-5",
      full_name: "Invalid Medicare",
      date_of_birth: "1985-01-01",
      medicare_number: "2420992029",
      phone: "0412 345 678",
      email: "invalid@example.com",
      address_line1: "12 George St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }, {
      now,
      requireStructuredAddress: true,
      requireSex: true,
      validateMedicare: true,
    })

    expect(snapshot.medicare.present).toBe(true)
    expect(snapshot.medicare.valid).toBe(false)
    expect(snapshot.missingCriticalFields).toEqual(["Valid Medicare"])
  })

  it("treats all-zero Medicare placeholders as invalid prescribing identity", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-zero-medicare",
      full_name: "Zero Medicare",
      date_of_birth: "1985-01-01",
      medicare_number: "0000000000",
      medicare_irn: 1,
      phone: "0412 345 678",
      email: "zero@example.com",
      address_line1: "12 George St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }, {
      now,
      requireStructuredAddress: true,
      requireSex: true,
      requireMedicareDetails: true,
      validateMedicare: true,
    })

    expect(snapshot.medicare.present).toBe(true)
    expect(snapshot.medicare.valid).toBe(false)
    expect(snapshot.missingCriticalFields).toEqual(["Valid Medicare"])
    expect(snapshot.completenessTone).toBe("partial")
  })

  it("flags missing Medicare IRN but does not require expiry when full prescribing identity is required", () => {
    const snapshot = buildPatientSnapshot({
      id: "patient-6",
      full_name: "Missing Medicare Details",
      date_of_birth: "1985-01-01",
      medicare_number: "1111111111",
      medicare_irn: null,
      medicare_expiry: null,
      phone: "0412 345 678",
      email: "missing-details@example.com",
      address_line1: "12 George St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    }, {
      now,
      requireStructuredAddress: true,
      requireSex: true,
      requireMedicareDetails: true,
      validateMedicare: true,
    })

    expect(snapshot.missingCriticalFields).toEqual(["Medicare IRN"])
    expect(snapshot.medicare.detailsLabel).toBe("IRN missing")
  })
})

describe("getPatientSnapshotOptionsForCase", () => {
  it("does not require Medicare, phone, or address for medical certificate review", () => {
    const snapshot = buildPatientSnapshot({
      id: "med-cert-patient",
      full_name: "Med Cert Patient",
      date_of_birth: "1990-01-01",
      medicare_number: null,
      phone: null,
      email: "medcert@example.com",
      address_line1: null,
      suburb: null,
      state: null,
      postcode: null,
    }, {
      now,
      ...getPatientSnapshotOptionsForCase({
        category: "medical_certificate",
        serviceType: "med_certs",
      }),
    })

    expect(snapshot.missingCriticalFields).toEqual([])
    expect(snapshot.completenessTone).toBe("complete")
  })

  it("requires full prescribing identity for ED and hair-loss prescribing consults", () => {
    const snapshot = buildPatientSnapshot({
      id: "ed-patient",
      full_name: "ED Patient",
      date_of_birth: "1990-01-01",
      medicare_number: "1111111111",
      medicare_irn: null,
      medicare_expiry: null,
      phone: "0400000000",
      email: "ed@example.com",
      address_line1: "1 Test Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: null,
    }, {
      now,
      ...getPatientSnapshotOptionsForCase({
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
      }),
    })

    expect(snapshot.missingCriticalFields).toEqual(["Sex", "Medicare IRN"])
    expect(snapshot.completenessTone).toBe("partial")
  })
})

describe("findPotentialDuplicatePatients", () => {
  it("flags duplicate directory rows using email, phone, or name and DOB", () => {
    const groups = findPotentialDuplicatePatients([
      { id: "a", full_name: "Marcus Pearson", date_of_birth: "2001-11-24", phone: "0467 326 610", email: "marcus@example.com" },
      { id: "b", full_name: "Marcus Pearson", date_of_birth: "2001-11-24", phone: "0467 326 610", email: "marcus.alt@example.com" },
      { id: "c", full_name: "Daniel McDonald", date_of_birth: null, phone: "+61407748990", email: "daniel@example.com" },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      reason: "phone",
      patientIds: ["a", "b"],
    })
  })

  it("normalizes Australian mobile numbers before duplicate matching", () => {
    const groups = findPotentialDuplicatePatients([
      { id: "a", full_name: "Sabah Shehzad", date_of_birth: "1998-01-01", phone: "+61421845401", email: "sabah@example.com" },
      { id: "b", full_name: "sabah shehzad", date_of_birth: "1998-01-01", phone: "0421845401", email: "sabah.alt@example.com" },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      reason: "phone",
      key: "0421845401",
      patientIds: ["a", "b"],
    })
  })
})

describe("collapseDuplicatePatientProfiles", () => {
  it("collapses strict duplicate profile rows without hiding duplicate profile IDs", () => {
    const result = collapseDuplicatePatientProfiles([
      {
        id: "older",
        full_name: "Marcus Pearson",
        date_of_birth: "2001-11-24",
        phone: "0467 326 610",
        email: "marcus@example.com",
        created_at: "2026-04-29T09:00:00Z",
        updated_at: "2026-04-29T09:00:00Z",
      },
      {
        id: "complete",
        full_name: "Marcus Pearson",
        date_of_birth: "2001-11-24",
        phone: "0467326610",
        email: "marcus@example.com",
        medicare_number: "2123456701",
        address_line1: "1 George St",
        suburb: "Sydney",
        state: "NSW",
        created_at: "2026-04-29T10:00:00Z",
        updated_at: "2026-04-29T10:00:00Z",
      },
      {
        id: "daniel",
        full_name: "Daniel McDonald",
        date_of_birth: null,
        phone: "+61407748990",
        email: "daniel@example.com",
        created_at: "2026-04-29T11:00:00Z",
        updated_at: "2026-04-29T11:00:00Z",
      },
    ])

    expect(result.collapsedCount).toBe(1)
    expect(result.patients).toHaveLength(2)
    expect(result.patients[0].id).toBe("complete")
    expect(result.patients[0].duplicate_profile_ids).toEqual(["older"])
  })

  it("does not collapse different patients who share a phone number", () => {
    const result = collapseDuplicatePatientProfiles([
      { id: "parent", full_name: "Alex Parent", date_of_birth: "1980-01-01", phone: "0400000000" },
      { id: "child", full_name: "Sam Child", date_of_birth: "2010-01-01", phone: "+61400000000" },
    ])

    expect(result.collapsedCount).toBe(0)
    expect(result.patients.map((patient) => patient.id)).toEqual(["parent", "child"])
  })
})

describe("summarizeDuplicatePatientProfiles", () => {
  it("reports raw, unique, and duplicate profile counts for ops dashboards", () => {
    const summary = summarizeDuplicatePatientProfiles([
      { id: "a", full_name: "Marcus Pearson", date_of_birth: "2001-11-24", phone: "0467 326 610" },
      { id: "b", full_name: "Marcus Pearson", date_of_birth: "2001-11-24", phone: "+61467326610" },
      { id: "c", full_name: "Daniel McDonald", date_of_birth: null, phone: "+61407748990" },
    ])

    expect(summary).toEqual({
      rawProfileCount: 3,
      uniqueProfileCount: 2,
      duplicateProfileCount: 1,
      duplicateGroupCount: 1,
    })
  })
})
