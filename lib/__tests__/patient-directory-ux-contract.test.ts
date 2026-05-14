import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const patientsListSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
  "utf8",
)

describe("patient directory duplicate review UX", () => {
  it("turns duplicate warnings into the next operator action", () => {
    expect(patientsListSource).toContain("Open flagged patient")
    expect(patientsListSource).toContain("Show duplicate rows")
    expect(patientsListSource).toContain('value="duplicates"')
    expect(patientsListSource).toContain('aria-label="Filter patients by status"')
    expect(patientsListSource).toContain('aria-label="Filter patients by service"')
    expect(patientsListSource).toContain('aria-label="Filter patients by Parchment sync"')
    expect(patientsListSource).toContain("All statuses")
    expect(patientsListSource).toContain("All services")
    expect(patientsListSource).toContain("Any sync")
    expect(patientsListSource).not.toContain('aria-label="Sort patients"')
    expect(patientsListSource).toContain("Merge only when the patient file shows linked profiles")
    expect(patientsListSource).toContain("signed-in duplicates stay as manual review")
    expect(patientsListSource).toContain("Duplicate review")
    expect(patientsListSource).toContain("linked profile")
    expect(patientsListSource).toContain("patient-duplicate-row")
    expect(patientsListSource).toContain("bg-warning-light/25")
  })
})
