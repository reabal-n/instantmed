import { describe, expect, it } from "vitest"

import {
  buildPatientSnapshot,
  collapseDuplicatePatientProfiles,
  findPotentialDuplicatePatients,
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

    expect(snapshot.ageDobLabel).toBe("DOB not collected")
    expect(snapshot.medicare.label).toBe("Medicare not collected")
    expect(snapshot.address.label).toBe("Address not collected")
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
    expect(snapshot.missingCriticalFields).toEqual(["Address"])
    expect(snapshot.completenessTone).toBe("partial")
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
