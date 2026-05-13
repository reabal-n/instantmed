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
    expect(patientsListSource).toContain('aria-label="Filter patients by profile state"')
    expect(patientsListSource).toContain("Merge only when the patient file shows linked profiles")
    expect(patientsListSource).toContain("signed-in duplicates stay as manual review")
    expect(patientsListSource).toContain("Review duplicate")
    expect(patientsListSource).toContain("patient-duplicate-row")
    expect(patientsListSource).toContain("bg-warning-light/25")
  })
})
