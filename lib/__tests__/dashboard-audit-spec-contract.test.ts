import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const dashboardAuditSpec = readFileSync(
  join(process.cwd(), "e2e/dashboard-audit.spec.ts"),
  "utf8"
)

describe("dashboard audit spec contract", () => {
  it("runs axe against authenticated dashboard surfaces", () => {
    expect(dashboardAuditSpec).toContain("@axe-core/playwright")
    expect(dashboardAuditSpec).toContain("assertDashboardA11y")
  })

  it("keeps mobile screenshot coverage for every portal", () => {
    expect(dashboardAuditSpec).toContain("admin dashboard mobile screenshot")
    expect(dashboardAuditSpec).toContain("doctor dashboard mobile screenshot")
    expect(dashboardAuditSpec).toContain("patient dashboard mobile screenshot")
  })
})
