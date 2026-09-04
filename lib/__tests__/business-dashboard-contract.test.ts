import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const page = read("app/admin/analytics/page.tsx")
const client = read("app/admin/analytics/analytics-client.tsx")
const adsRuns = read("lib/ads-agent/runs.ts")

describe("Business decision surface contract", () => {
  it("is admin-only and assembles bounded read-only evidence sources", () => {
    expect(page).toContain('requireRole(["admin"])')
    expect(page).toContain("Promise.allSettled")
    expect(page).toContain("getRevenueDashboard")
    expect(page).toContain("getLatestDeliveredAdsAgentRun")
    expect(page).toContain("getBusinessAdsActionEvidence")
    expect(page).toContain("getRecentDeliveredAdsAgentRunDailySpend")
    expect(page).toContain("buildBusinessTrends")
    expect(page).toContain("getPostHogCanonicalIntakeFunnelSnapshot")
    expect(page).toContain("getRecordedAttributionBreakdown")
    expect(page).toContain("getHeardAboutUsBreakdown")
    expect(page).toContain("getReviewRequestFunnelSnapshot")
    expect(page).toContain("getReleaseFrictionDashboardSnapshot")
    expect(page).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
    expect(page).not.toContain("buildAdsAgentSnapshot")
    expect(page).not.toContain("getStripeFeeMap")
  })

  it("reads the latest delivered Ads snapshot rather than refreshing economics on page load", () => {
    expect(adsRuns).toContain('.eq("status", "delivered")')
    expect(adsRuns).toContain('.order("delivered_at", { ascending: false })')
    expect(adsRuns).toContain("latest report that was actually delivered")
  })

  it("keeps the default Business surface to five primary decision blocks", () => {
    expect(client.match(/<DashboardCard/g)).toHaveLength(5)
    expect(client).toContain("Scale gate")
    expect(client).toContain("Revenue &amp; profit")
    expect(client).toContain("Daily net retained")
    expect(client).toContain("Profit after ads &amp; payment fees")
    expect(client).toContain("Ads performance")
    expect(client).toContain("By campaign")
    expect(client).toContain("Canonical 30-day start cohort")
    expect(client).toContain("Recent 7-day coverage")
    expect(client).toContain("Current instrumentation meets the coverage gate")
    expect(client).toContain("Release conversion &amp; retention")
    expect(client).toContain("Baseline")
    expect(client).toContain("D+7")
    expect(client).toContain("D+14")
    expect(client).toContain("Starts → checkout")
    expect(client).toContain("Starts → paid")
    expect(client).toContain("Mobile medication complete")
    expect(client).toContain("Guest links ≤24h")
    expect(client).toContain("Refunded orders")
    expect(client).toContain("Repeat Rx decline/refund")
    expect(client).toContain("Matched follow-up")
    expect(client).toContain("Recorded acquisition")
    expect(client).toContain("Self-reported discovery")
    expect(client).toContain("<details")
    expect(client).toContain("Measurement checkpoints")
  })

  it("translates durable Ads service gates into operator language", () => {
    expect(client).toContain("Scripts attribution investigation remains open")
    expect(client).toContain("Med Certs remain in the protocol observation window")
    expect(client).toContain("Specialty pilots remain within approved loss caps")
    expect(client).toContain("service gates still apply")
  })

  it("reserves approval copy for an exact proposal and names observation evidence", () => {
    expect(client).toContain("Observation in progress")
    expect(client).toContain("both post-change evidence gates clear")
    expect(client).toContain("Review and approve that exact Ads change")
    expect(client).toContain("Scripts observation:")
    expect(client).not.toContain("A specific Ads change is ready for operator approval")
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
