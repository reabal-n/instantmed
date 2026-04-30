import { describe, expect, it } from "vitest"

import { buildPrescribingIdentityBlockerReport } from "@/lib/doctor/prescribing-identity-blockers"

describe("buildPrescribingIdentityBlockerReport", () => {
  it("summarizes active prescription intakes blocked by missing prescribing identity", () => {
    const report = buildPrescribingIdentityBlockerReport([
      {
        id: "intake-blocked",
        reference_number: "REQ-BLOCKED",
        status: "paid",
        category: "prescription",
        subtype: "repeat",
        created_at: "2026-04-30T00:00:00.000Z",
        paid_at: "2026-04-30T00:05:00.000Z",
        patient: {
          id: "patient-blocked",
          full_name: "Blocked Patient",
          date_of_birth: "1988-01-01",
          sex: "M",
          phone: "0400000000",
          email: "blocked@example.com",
          medicare_number: "1111111111",
          medicare_irn: null,
          medicare_expiry: null,
          address_line1: "1 Test Street",
          suburb: "Sydney",
          state: "NSW",
          postcode: "2000",
        },
        answers: {},
      },
      {
        id: "intake-ready",
        reference_number: "REQ-READY",
        status: "paid",
        category: "prescription",
        subtype: "repeat",
        created_at: "2026-04-30T01:00:00.000Z",
        paid_at: "2026-04-30T01:05:00.000Z",
        patient: {
          id: "patient-ready",
          full_name: "Ready Patient",
          date_of_birth: "1990-01-01",
          sex: "F",
          phone: "0400000001",
          email: "ready@example.com",
          medicare_number: "1111111111",
          medicare_irn: 1,
          medicare_expiry: "2029-05-01",
          address_line1: "2 Test Street",
          suburb: "Sydney",
          state: "NSW",
          postcode: "2000",
        },
        answers: {},
      },
    ])

    expect(report.totalActive).toBe(2)
    expect(report.blockedCount).toBe(1)
    expect(report.readyCount).toBe(1)
    expect(report.blockerCounts).toEqual({
      "Medicare IRN": 1,
      "Medicare expiry": 1,
    })
    expect(report.items).toEqual([
      expect.objectContaining({
        intakeId: "intake-blocked",
        patientId: "patient-blocked",
        referenceNumber: "REQ-BLOCKED",
        blockers: ["Medicare IRN", "Medicare expiry"],
        intakeHref: "/doctor/intakes/intake-blocked",
        profileHref: "/doctor/patients/patient-blocked",
      }),
    ])
  })

  it("uses intake answers as fallbacks before reporting a blocker", () => {
    const report = buildPrescribingIdentityBlockerReport([
      {
        id: "intake-answer-fallback",
        reference_number: "REQ-FALLBACK",
        status: "paid",
        category: "prescription",
        subtype: "repeat",
        created_at: "2026-04-30T00:00:00.000Z",
        paid_at: "2026-04-30T00:05:00.000Z",
        patient: {
          id: "patient-answer-fallback",
          full_name: "Fallback Patient",
          date_of_birth: "1988-01-01",
          sex: null,
          phone: "0400000000",
          email: "fallback@example.com",
          medicare_number: null,
          medicare_irn: null,
          medicare_expiry: null,
          address_line1: null,
          suburb: null,
          state: null,
          postcode: null,
        },
        answers: {
          sex: "F",
          medicareNumber: "1111111111",
          medicareIrn: "1",
          medicareExpiry: "2029-05-01",
          addressLine1: "3 Test Street",
          suburb: "Sydney",
          state: "NSW",
          postcode: "2000",
        },
      },
    ])

    expect(report.blockedCount).toBe(0)
    expect(report.readyCount).toBe(1)
    expect(report.items).toEqual([])
  })
})
