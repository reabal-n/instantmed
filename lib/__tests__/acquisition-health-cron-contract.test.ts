import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("acquisition health cron contract", () => {
  it("runs the acquisition health monitor from Vercel cron", () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }

    expect(vercelConfig.crons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/api/cron/acquisition-health",
          schedule: "0 */6 * * *",
        }),
      ]),
    )
  })

  it("alerts on the exact failure where Google Ads clicks exist but paid intakes have no click IDs", () => {
    const source = readFileSync(join(process.cwd(), "lib/analytics/acquisition-health.ts"), "utf8")
    expect(source).toContain("google_ads_clicks_but_no_paid_click_ids")
    expect(source).toContain("paid_attribution_unknown_over_50_percent")
    expect(source).toContain("google_ads_reporting_not_configured")
    expect(source).toContain("(row) => !row.utm_source && !row.gclid && !row.gbraid && !row.wbraid")
  })
})
