import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  const fullPath = join(process.cwd(), path)
  expect(existsSync(fullPath), `${path} should exist`).toBe(true)
  return readFileSync(fullPath, "utf8")
}

describe("service launch checklists", () => {
  it("keeps bounded non-med-cert pilots behind production, compliance, evidence, and scale gates", () => {
    const checklist = readProjectFile("docs/SERVICE_LAUNCH_CHECKLISTS.md")
    const businessPlan = readProjectFile("docs/BUSINESS_PLAN.md")

    expect(businessPlan).toContain("docs/SERVICE_LAUNCH_CHECKLISTS.md")
    expect(checklist).toContain("Do not materially increase spend")
    expect(checklist).toContain("live at low budgets to gather data")
    expect(checklist).toContain("https://api.parchmenthealth.io/external")
    expect(checklist).toContain("no sandbox Parchment env vars remain")
    expect(checklist).toContain("parchment-smoke")
    expect(checklist).toContain("repeat scripts")
    expect(checklist).toContain("ED")
    expect(checklist).toContain("Hair Loss")
    expect(checklist).toContain("Women's Health")
    expect(checklist).toContain("LIVE_WOMENS_HEALTH_OPTIONS")
    expect(checklist).toContain("REQUEST_MORE_INFO")
    expect(checklist).toContain("One medication per request, entered as plain free text")
    expect(checklist).toContain("There is no PBS/AMT lookup")
    expect(checklist).toContain("Below 90, do not scale")
  })
})
