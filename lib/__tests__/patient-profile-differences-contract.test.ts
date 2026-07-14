import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("patient profile difference surfaces", () => {
  it("derives drawer differences after explicit intent through the existing summary route", () => {
    const route = read("app/api/doctor/patients/[patientId]/summary/route.ts")
    const panel = read("components/doctor/patient-profile-panel.tsx")

    expect(route).toContain("buildClinicalProfileDifferences")
    expect(route).toContain("getIntakeWithDetails")
    expect(route).toContain("currentRequestId")
    expect(route).toContain("currentIntake.patient.id !== patientId")
    expect(route).toContain("clinicalDifferences")

    expect(panel).toContain("buildPatientSnapshot")
    expect(panel).toContain("Identity and contact")
    expect(panel).toContain("Patient-entered · Updated")
    expect(panel).toContain("Review differences")
    expect(panel).toContain("currentRequestId=${encodeURIComponent(currentRequestId)}")
    expect(panel).toContain("requestId=${encodeURIComponent(currentRequestId)}")
  })

  it("keeps the full record comparison tied to the request that opened it", () => {
    const page = read("app/doctor/patients/[id]/page.tsx")
    const client = read("app/doctor/patients/[id]/patient-detail-client.tsx")

    expect(page).toContain("buildClinicalProfileDifferences")
    expect(page).toContain("comparisonRequestId")
    expect(page).toContain("clinicalDifferences")
    expect(page).not.toContain("?? intakeRows[0]")
    expect(page).not.toContain(": intakeRows[0]")
    expect(client).toContain("Review differences")
    expect(client).toContain("Current request")
    expect(client).toContain("Saved profile")
  })
})
