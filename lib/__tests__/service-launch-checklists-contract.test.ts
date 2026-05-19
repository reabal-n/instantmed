import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  const fullPath = join(process.cwd(), path)
  expect(existsSync(fullPath), `${path} should exist`).toBe(true)
  return readFileSync(fullPath, "utf8")
}

describe("service launch checklists", () => {
  it("gates non-med-cert paid traffic behind production prescribing, compliance, and evidence", () => {
    const checklist = readProjectFile("docs/SERVICE_LAUNCH_CHECKLISTS.md")
    const businessPlan = readProjectFile("docs/BUSINESS_PLAN.md")

    expect(businessPlan).toContain("docs/SERVICE_LAUNCH_CHECKLISTS.md")
    expect(checklist).toContain("Do not turn on paid traffic")
    expect(checklist).toContain("https://api.parchmenthealth.io/external")
    expect(checklist).toContain("no sandbox Parchment env vars remain")
    expect(checklist).toContain("parchment-smoke")
    expect(checklist).toContain("repeat scripts")
    expect(checklist).toContain("ED")
    expect(checklist).toContain("Hair Loss")
    expect(checklist).toContain("Block launch below 90")
  })
})
