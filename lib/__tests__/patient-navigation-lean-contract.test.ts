import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8")
}

describe("patient navigation lean contract", () => {
  it("keeps patient primary navigation focused on operating tasks", () => {
    const leftRail = readProjectFile("components/shell/left-rail.tsx")
    const mobileNav = readProjectFile("components/ui/mobile-nav.tsx")

    for (const source of [leftRail, mobileNav]) {
      expect(source).toContain("PATIENT_INTAKES_HREF")
      expect(source).toContain("PATIENT_PRESCRIPTIONS_HREF")
      expect(source).toContain("PATIENT_DOCUMENTS_HREF")
      expect(source).toContain("PATIENT_MESSAGES_HREF")
      expect(source).toContain("PATIENT_SETTINGS_HREF")
      expect(source).not.toContain("Health summary")
      expect(source).not.toContain("/patient/health-summary")
    }
  })

  it("keeps the health summary route available as a deep-linked record view", () => {
    const page = readProjectFile("app/patient/health-summary/page.tsx")

    expect(page).toContain("getPatientHealthSummary")
    expect(page).toContain("HealthSummaryClient")
  })
})
