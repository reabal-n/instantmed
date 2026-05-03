import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const businessKpiSource = readFileSync(
  join(process.cwd(), "lib/data/business-kpi.ts"),
  "utf8",
)
const analyticsTabSource = readFileSync(
  join(process.cwd(), "app/admin/analytics/analytics-business-kpis-tab.tsx"),
  "utf8",
)

describe("business KPI acquisition health", () => {
  it("pulls acquisition health into the launch readiness score", () => {
    expect(businessKpiSource).toContain("getAcquisitionHealth(7)")
    expect(businessKpiSource).toContain("acquisition: AcquisitionHealthResult")
    expect(businessKpiSource).toContain("acquisitionTracked: acquisition.healthy")
    expect(analyticsTabSource).toContain("System health aggregation across operator scale indicators")
  })

  it("renders acquisition tracking in the admin analytics business KPIs tab", () => {
    expect(analyticsTabSource).toContain("Acquisition Tracking")
    expect(analyticsTabSource).toContain("Paid conversion attribution")
    expect(analyticsTabSource).toContain("Google Ads clicks")
    expect(analyticsTabSource).toContain("Unknown paid")
    expect(analyticsTabSource).toContain("formatAcquisitionAlert")
  })
})
