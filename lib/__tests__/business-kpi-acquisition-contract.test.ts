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
    expect(analyticsTabSource).toContain("Daily Business Scorecard")
    expect(analyticsTabSource).toContain("$1M annual gross run-rate")
    expect(analyticsTabSource).toContain("ANNUAL_GROSS_TARGET")
    expect(analyticsTabSource).toContain("30-day growth gates")
    expect(analyticsTabSource).toContain("Paid orders by service")
    expect(analyticsTabSource).toContain("Attribution quality")
    expect(analyticsTabSource).toContain("Attribution diagnostics")
    expect(analyticsTabSource).toContain("Open refunds")
    expect(analyticsTabSource).toContain("Open finance")
    expect(analyticsTabSource).toContain("Review P95")
    expect(analyticsTabSource).toContain("Google Ads clicks")
    expect(analyticsTabSource).toContain("Unknown paid")
    expect(analyticsTabSource).toContain("formatAcquisitionAlert")
  })
})
