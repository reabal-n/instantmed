import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"
const read = (path: string) => readFileSync(path, "utf8")
describe("production probe coverage and monitor contract", () => {
  it("requests four-hour off-hour browser cadence", () => {
    expect(read(".github/workflows/prod-request-flow-synthetic.yml")).toContain('cron: "17 */4 * * *"')
  })
  it("retains seven entry-flow cases and local draft/analytics isolation", () => {
    const spec = read("e2e/prod-request-flow-synthetic.spec.ts")
    expect(spec.match(/\btest\("/g)).toHaveLength(7)
    expect(spec).toContain("installProductionSyntheticIsolation(page)")
    const helper = read("e2e/helpers/production-synthetic-isolation.ts")
    expect(helper).toContain("/api/draft")
    expect(helper).toContain("/ingest")
  })
  it("keeps section failures unknown in the response and Telegram independent", () => {
    const route = read("app/api/cron/business-alerts/route.ts")
    expect(route).toContain("failed_payments: failedPayments,")
    expect(route).not.toContain("failed_payments: failedPayments ?? 0")
    expect(route).toContain("const criticalAlerts = alerts.filter")
    expect(route).toContain("shouldSendCriticalAlert(alert.detail")
    expect(route).toContain("recordCriticalAlertSent(alert.detail")
    expect(route).toContain("trackBusinessMetric({")
  })
})
