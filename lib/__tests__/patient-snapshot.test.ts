import { describe, expect, it } from "vitest"

import {
  buildPatientSnapshot,
  findPotentialDuplicatePatients,
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
})
