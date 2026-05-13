import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("staff readiness panel contract", () => {
  it("surfaces staff role, owner doctor, future doctor, and runtime Sentry readiness in the admin dashboard", () => {
    const dashboardSource = read("app/dashboard/page.tsx")
    const readinessDataSource = read("lib/data/staff-readiness.ts")
    const panelSource = read("components/admin/staff-readiness-panel.tsx")

    expect(dashboardSource).toContain("getStaffReadinessSnapshot")
    expect(dashboardSource).toContain("<StaffReadinessPanel snapshot={staffReadiness} />")
    expect(readinessDataSource).toContain("Staff readiness admin count drift")
    expect(readinessDataSource).toContain("Sentry.captureMessage")
    expect(readinessDataSource).not.toContain("DASHBOARD_SMOKE_EMAIL")
    expect(readinessDataSource).not.toContain("DASHBOARD_SMOKE_PASSWORD")
    expect(readinessDataSource).not.toContain("DASHBOARD_SMOKE_COOKIE_HEADER")
    expect(readinessDataSource).not.toContain("prod-dashboard-smoke")
    expect(readinessDataSource).toContain("getDoctorOnboardingState")
    expect(panelSource).toContain("Release readiness")
    expect(panelSource).toContain("staff roles, owner doctor setup, future doctors, and runtime Sentry")
  })

  it("lazy-loads the admin conversion snapshot below the clinical queue", () => {
    const dashboardSource = read("app/dashboard/page.tsx")

    expect(dashboardSource).toContain("Suspense")
    expect(dashboardSource).toContain("AdminConversionSnapshotSection")
    expect(dashboardSource).not.toContain("isAdmin ? getConversionSnapshot() : Promise.resolve(null)")
  })
})
