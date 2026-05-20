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

describe("patient directory duplicate review UX", () => {
  it("turns duplicate warnings into the next operator action", () => {
    expect(patientsListSource).toContain("Open flagged patient")
    expect(patientsListSource).toContain("STAFF_DOCTOR_PATIENTS_HREF")
    expect(patientsListSource).toContain("Merge audit")
    expect(patientsListSource).toContain("mergeAuditHref")
    expect(patientsListSource).toContain("Show duplicate rows")
    expect(patientsListSource).toContain('value="duplicates"')
    expect(patientsListSource).toContain('aria-label="Filter patients by status"')
    expect(patientsListSource).toContain('aria-label="Filter patients by service"')
    expect(patientsListSource).toContain('aria-label="Filter patients by Parchment sync"')
    expect(patientsListSource).toContain("All statuses")
    expect(patientsListSource).toContain("All services")
    expect(patientsListSource).toContain("Any sync")
    expect(patientsListSource).toContain("Sync needed")
    expect(patientsListSource).toContain("hasActivePrescribingRequest(patient) && !patient.parchment_patient_id")
    // Short copy "Partial" replaced "Profile partial" in 2026-05-21
    // when the loud colored-background pills became inline status dots.
    expect(patientsListSource).toContain(">\n                              Partial")
    expect(patientsListSource).toContain("Not needed")
    expect(patientsListSource).not.toContain('aria-label="Sort patients"')
    expect(patientsListSource).not.toContain("Not synced")
    expect(patientsListSource).toContain("Merge only when the patient file shows linked profiles")
    expect(patientsListSource).not.toContain("Match source:")
    expect(patientsListSource).toContain("Duplicate review")
    expect(patientsListSource).toContain("linked profile")
    expect(patientsListSource).toContain("patient-duplicate-row")
    expect(patientsListSource).toContain("bg-warning-light/25")
  })

  it("keeps the directory scalable without making search page-local", () => {
    expect(patientDirectoryDataSource).toContain("parsePatientDirectorySearch")
    expect(patientDirectoryDataSource).toContain("buildPatientDirectorySearchFilter")
    expect(patientDirectoryDataSource).toContain("query.range(from, to)")
    expect(patientDirectoryDataSource).not.toContain("patients.slice(from, to + 1)")
    expect(patientsListSource).toContain("router.replace(buildPatientDirectoryHref")
    expect(patientsListSource).toContain("total profiles")
    expect(patientsListSource).not.toContain("unique total")
    expect(patientsListSource).not.toContain("raw profiles")
  })
})
