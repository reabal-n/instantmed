import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return findRouteFiles(fullPath)
    return entry.name === "route.ts" ? [fullPath] : []
  })
}

const agents = readProjectFile("AGENTS.md")
const claude = readProjectFile("CLAUDE.md")
const architecture = readProjectFile("docs/ARCHITECTURE.md")
const aiOnboarding = readProjectFile("docs/AI_ONBOARDING.md")
const design = readProjectFile("DESIGN.md")
const product = readProjectFile("PRODUCT.md")
const testing = readProjectFile("docs/TESTING.md")

describe("project docs drift contract", () => {
  it("keeps root assistant docs aligned on hours, gated services, and staff dashboard rules", () => {
    for (const source of [agents, claude]) {
      expect(source).toContain("Requests submit 24/7 for every pathway")
      expect(source).toContain("Never hard-block checkout by time of day")
      expect(source).toContain("Women's health (gated future subtype)")
      expect(source).toContain("Weight loss (gated future subtype)")
      // Phase 1 of dashboard remaster (2026-05-11) renamed the "Staff cockpit"
      // workflow heading to "Staff dashboard" and introduced `/dashboard` as the
      // canonical staff URL. The unified-shell rule still holds.
      expect(source).toContain("**Staff dashboard:**")
      expect(source).toContain("`/dashboard` is the canonical URL")
      expect(source).toContain("OperatorShell")
      expect(source).toContain("`components/operator/*`")
      expect(source).toContain("`AGENTS.md` + `CLAUDE.md`")
    }
  })

  it("keeps product and design docs pointed at one compact operator experience", () => {
    expect(product).toContain("not separate admin and doctor products")
    expect(product).toContain("staff do not scroll through a wall of low-value data")
    expect(design).toContain("unified `OperatorShell` pattern")
    expect(design).toContain("Do not create separate \"admin mode\" and \"doctor mode\" experiences")
    expect(design).toContain("bounded desktop height with internal scroll panes")
    expect(aiOnboarding).toContain("**`components/operator/`**")
    expect(aiOnboarding).toContain("## Top 11 rules of thumb")
  })

  it("keeps the architecture and operator README documenting the active staff component pattern", () => {
    const operatorReadme = readProjectFile("components/operator/README.md")

    expect(architecture).toContain("**Staff cockpit architecture:**")
    expect(architecture).toContain("`OperatorShell`")
    expect(architecture).toContain("`StaffCommandPalette`")
    expect(architecture).toContain("`components/operator/`")
    expect(operatorReadme).toContain("Unified staff cockpit primitives")
    expect(operatorReadme).toContain("Do not reintroduce separate \"switch to doctor mode\" flows")
  })

  it("keeps docs current with the focused operator visual guardrails", () => {
    expect(testing).toContain("e2e/operator.viewport.spec.ts")
    expect(testing).toContain("e2e/operator.visual.spec.ts")
    expect(testing).toContain("Staff cockpit")
  })

  it("lists every doctor API route in the architecture inventory", () => {
    const doctorApiRoot = join(root, "app/api/doctor")
    const endpoints = findRouteFiles(doctorApiRoot)
      .map((file) => relative(doctorApiRoot, file).replace(/\/route\.ts$/, ""))
      .sort()

    expect(endpoints.length).toBeGreaterThan(0)
    for (const endpoint of endpoints) {
      expect(architecture, endpoint).toContain(endpoint)
    }
  })
})
