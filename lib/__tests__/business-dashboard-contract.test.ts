import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const page = read("app/admin/analytics/page.tsx")
const client = read("app/admin/analytics/analytics-client.tsx")
const adsRuns = read("lib/ads-agent/runs.ts")

describe("Business decision surface contract", () => {
  it("is admin-only and assembles six bounded read-only evidence sources", () => {
    expect(page).toContain('requireRole(["admin"])')
    expect(page).toContain("Promise.allSettled")
    expect(page).toContain("getRevenueDashboard")
    expect(page).toContain("getLatestDeliveredAdsAgentRun")
    expect(page).toContain("getPostHogCanonicalIntakeFunnelSnapshot")
    expect(page).toContain("getRecordedAttributionBreakdown")
    expect(page).toContain("getHeardAboutUsBreakdown")
    expect(page).toContain("getReviewRequestFunnelSnapshot")
    expect(page).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
    expect(page).not.toContain("buildAdsAgentSnapshot")
    expect(page).not.toContain("getStripeFeeMap")
  })

  it("reads the latest delivered Ads snapshot rather than refreshing economics on page load", () => {
    expect(adsRuns).toContain('.eq("status", "delivered")')
    expect(adsRuns).toContain('.order("delivered_at", { ascending: false })')
    expect(adsRuns).toContain("latest report that was actually delivered")
  })

  it("keeps the default Business surface to four primary decision blocks", () => {
    expect(client.match(/<DashboardCard/g)).toHaveLength(4)
    expect(client).toContain("Scale gate")
    expect(client).toContain("30d net retained")
    expect(client).toContain("Canonical 30-day start cohort")
    expect(client).toContain("Recorded acquisition")
    expect(client).toContain("Self-reported discovery")
    expect(client).toContain("<details")
    expect(client).toContain("Measurement checkpoints")
  })

  it("does not reintroduce the superseded metrics wall", () => {
    for (const retiredLabel of [
      "Net revenue · last 7 days",
      "Revenue detail",
      "Operating scorecard",
      "Checkout recovery",
      "Prescription fulfilment",
      "GeographicBreakdownCard",
      "Detailed metrics",
      "AI assistants (8 weeks)",
    ]) {
      expect(client).not.toContain(retiredLabel)
    }
  })
})
