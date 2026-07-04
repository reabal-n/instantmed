import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>
}
const auditScript = readFileSync(join(root, "scripts/audit-health-guides.mjs"), "utf8")
const ciWorkflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8")

describe("content audit guardrails", () => {
  it("has a strict mode for blocking guide-only and clinical failures", () => {
    expect(packageJson.scripts?.["content:audit:strict"]).toBe(
      "node scripts/audit-health-guides.mjs --fail-on=P1",
    )
    expect(auditScript).toContain("parseFailOnArg")
    expect(auditScript).toContain("Blocking content failures at")
    expect(auditScript).toContain("process.exitCode = 1")
  })

  it("has an image-only guard for local guide visual regressions", () => {
    expect(packageJson.scripts?.["content:audit:images"]).toBe(
      "node scripts/audit-health-guides.mjs --fail-on-image",
    )
    expect(auditScript).toContain("parseFailOnImageArg")
    expect(auditScript).toContain("Blocking image failures:")
    expect(ciWorkflow).toContain("Health guide image audit")
    expect(ciWorkflow).toContain("pnpm content:audit:images")
  })

  it("has a report mode and P1 component syntax guard", () => {
    expect(packageJson.scripts?.["content:audit:report"]).toBe(
      "node scripts/audit-health-guides.mjs --report=markdown",
    )
    expect(auditScript).toContain("P1 component")
    expect(auditScript).toContain("findUnknownArticleComponentTags")
    expect(auditScript).toContain("findMalformedArticleComponentBlocks")
    expect(auditScript).toContain("renderMarkdownReport")
  })
})
