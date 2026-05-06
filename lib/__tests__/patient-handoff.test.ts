import { describe, expect, it } from "vitest"

import { buildPatientHandoffSummary } from "@/lib/doctor/patient-handoff"
import type { PatientSnapshot } from "@/lib/doctor/patient-snapshot"

function snapshot(overrides: Partial<PatientSnapshot>): PatientSnapshot {
  return {
    id: "patient_1",
    name: "Test Patient",
    age: 42,
    dobLabel: "1 Jan 1984",
    ageDobLabel: "42y / 1 Jan 1984",
    sex: { label: "Male", present: true },
    medicare: { label: "2123456701", present: true },
    phone: { label: "0412 345 678", present: true },
    email: { label: "patient@example.com", present: true },
    address: { label: "1 Test St, Sydney NSW 2000", present: true },
    profileHref: "/doctor/patients/patient_1",
    missingCriticalFields: [],
    completenessLabel: "Patient details complete",
    completenessTone: "complete",
    ...overrides,
  }
}

describe("patient handoff summary", () => {
  it("marks complete patient details as handoff ready", () => {
    const summary = buildPatientHandoffSummary(snapshot({}))

    expect(summary.tone).toBe("success")
    expect(summary.statusLabel).toBe("Handoff ready")
    expect(summary.actionLabel).toBe("Open request")
    expect(summary.missingFields).toEqual([])
  })

  it("summarizes partial handoff gaps without hiding the exact field list", () => {
    const summary = buildPatientHandoffSummary(snapshot({
      missingCriticalFields: ["Address street", "Address suburb"],
      completenessLabel: "Missing Address street, Address suburb",
      completenessTone: "partial",
    }))

    expect(summary.tone).toBe("warning")
    expect(summary.shortLabel).toBe("Missing 2")
    expect(summary.statusLabel).toBe("Missing 2: Address street, Address suburb")
    expect(summary.tooltip).toContain("Address street, Address suburb")
    expect(summary.actionLabel).toBe("Fix before review")
  })

  it("escalates broad identity gaps to critical and preserves overflow detail", () => {
    const summary = buildPatientHandoffSummary(snapshot({
      missingCriticalFields: ["DOB", "Phone", "Medicare", "Address postcode"],
      completenessLabel: "Missing DOB, Phone, Medicare, Address postcode",
      completenessTone: "missing",
    }))

    expect(summary.tone).toBe("critical")
    expect(summary.statusLabel).toBe("Missing 4: DOB, Phone, Medicare +1 more")
    expect(summary.tooltip).toContain("DOB, Phone, Medicare, Address postcode")
  })
})
