import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const patientsListSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
  "utf8",
)
const patientDirectoryDataSource = readFileSync(
  join(process.cwd(), "lib/data/patient-directory.ts"),
  "utf8",
)
const adminPatientsPageSource = readFileSync(
  join(process.cwd(), "app/admin/patients/page.tsx"),
  "utf8",
)
const doctorPatientsPageSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/page.tsx"),
  "utf8",
)

describe("patient directory duplicate review UX", () => {
  it("turns duplicate warnings into the next operator action", () => {
    expect(patientsListSource).toContain("Open flagged patient")
    expect(patientsListSource).toContain("STAFF_DOCTOR_PATIENTS_HREF")
    expect(patientsListSource).toContain("Merge audit")
    expect(patientsListSource).toContain("mergeAuditHref")
    expect(patientsListSource).toContain('exceptionFilter === "duplicates"')
    expect(patientsListSource).toContain('aria-label="Active patient exceptions on this page"')
    expect(patientsListSource).toContain("needsDetailsCount > 0 ? (")
    expect(patientsListSource).toContain("syncNeededCount > 0 ? (")
    expect(patientsListSource).toContain("Sync needed")
    expect(patientsListSource).toContain("hasActivePrescribingRequest(patient) && patient.onboarding_completed && !patient.parchment_patient_id")
    expect(patientsListSource).toContain("Not needed")
    expect(patientsListSource).not.toContain("All statuses")
    expect(patientsListSource).not.toContain("All services")
    expect(patientsListSource).not.toContain("Any sync")
    expect(patientsListSource).toContain("Confirm linked records inside the patient file before merging")
    expect(patientsListSource).not.toContain("Match source:")
    expect(patientsListSource).toContain("Duplicate review")
    expect(patientsListSource).toContain("linked duplicate")
    expect(patientsListSource).toContain("bg-warning-light/20")
    expect(patientsListSource).toContain('className="hidden md:block"')
    expect(patientsListSource).toContain('className="divide-y divide-border/60 md:hidden"')
  })

  it("keeps the directory scalable without making search page-local", () => {
    expect(patientDirectoryDataSource).toContain("parsePatientDirectorySearch")
    expect(patientDirectoryDataSource).toContain("buildPatientDirectorySearchFilter")
    expect(patientDirectoryDataSource).toContain("query.range(from, to)")
    expect(patientDirectoryDataSource).not.toContain("patients.slice(from, to + 1)")
    expect(patientsListSource).toContain("router.replace(buildPatientDirectoryHref")
    expect(patientsListSource).toContain("totalPatients.toLocaleString")
    expect(patientsListSource).not.toContain("unique total")
    expect(patientsListSource).not.toContain("raw profiles")
    expect(patientDirectoryDataSource).toContain("getPatientDirectoryOrder(sort)")
    expect(patientDirectoryDataSource).not.toContain("compareDirectoryPatients")
    expect(patientDirectoryDataSource).not.toContain("medicare_number")
    expect(patientDirectoryDataSource).not.toContain("ihi_number")
    expect(patientDirectoryDataSource).not.toContain("address_line1")
    expect(patientDirectoryDataSource).not.toContain("stripe_customer_id")
    expect(patientDirectoryDataSource).not.toContain("extends Profile")
  })

  it("offers only URL-mirrored global newest and name sorting", () => {
    for (const pageSource of [adminPatientsPageSource, doctorPatientsPageSource]) {
      expect(pageSource).toContain("parsePatientDirectorySort(params.sort)")
      expect(pageSource).toMatch(/\n\s+sort,\n/)
      expect(pageSource).toContain("initialSort={sort}")
    }
    expect(patientsListSource).toContain('from "@/components/ui/select"')
    expect(patientsListSource).toContain('aria-label="Sort patients"')
    expect(patientsListSource).toContain('className="min-h-11')
    expect(patientsListSource).toContain('SelectItem value="newest"')
    expect(patientsListSource).toContain('SelectItem value="name"')
    expect(patientsListSource).toContain("sort: initialSort")
    expect(patientsListSource).toMatch(/\n\s+sort,\n/)
    expect(patientsListSource).not.toContain("Smart sort")
    expect(patientsListSource).not.toContain("recent_request")
    expect(patientsListSource).not.toContain("recent_script")
    expect(patientsListSource).not.toContain("request_type")
    expect(patientsListSource).not.toMatch(/\bpatients\.sort\(/)
  })
})
