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

  it("keeps the retired health summary route redirect-only", () => {
    const nextConfig = readProjectFile("next.config.mjs")
    const orphanCheck = readProjectFile("scripts/check-orphaned-files.sh")

    expect(nextConfig).toContain('source: "/patient/health-summary"')
    expect(nextConfig).toContain('destination: "/patient"')
    expect(orphanCheck).toContain("app/patient/health-summary/page.tsx")
    expect(orphanCheck).toContain("lib/data/health-summary.ts")
  })

  it("sends new patient requests to the canonical request selector", () => {
    const leftRail = readProjectFile("components/shell/left-rail.tsx")
    const layout = readProjectFile("app/patient/layout.tsx")
    const nextConfig = readProjectFile("next.config.mjs")
    const orphanCheck = readProjectFile("scripts/check-orphaned-files.sh")

    expect(leftRail).toContain("REQUEST_HREF")
    expect(leftRail).not.toContain("PATIENT_NEW_REQUEST_HREF")
    expect(layout).not.toContain("modal")
    expect(nextConfig).toContain('source: "/patient/new-request"')
    expect(nextConfig).toContain('destination: "/request"')
    expect(orphanCheck).toContain("app/patient/@modal/new-request/page.tsx")
    expect(orphanCheck).toContain("app/patient/default.tsx")
  })
})
