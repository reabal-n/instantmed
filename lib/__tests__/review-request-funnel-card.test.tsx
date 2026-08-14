import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/app/actions/review-reputation", () => ({
  recordProductReviewTotalAction: vi.fn(),
}))

import { ReviewRequestFunnelCard } from "@/components/admin/review-request-funnel-card"
import type { ReviewRequestFunnelSnapshot } from "@/lib/admin/review-request-funnel"

const LIVE_SNAPSHOT: ReviewRequestFunnelSnapshot = {
  generatedAt: "2026-07-24T00:00:00.000Z",
  windowStart: "2026-06-24T00:00:00.000Z",
  windowEnd: "2026-07-24T00:00:00.000Z",
  windowDays: 30,
  funnel: {
    status: "live",
    eligible: 12,
    sent: 8,
    delivered: 7,
    trackableSent: 6,
    uniqueRedirectTraversals: 3,
    traversalRate: 50,
    awaitingNextRun: 1,
    cooldownDeferred: 1,
    policySuppressed: 1,
    legacyHandledUnverifiable: 1,
    actionableBacklog: 0,
  },
  external: {
    status: "live",
    total: 5,
    delta: 3,
    baselineTotal: 2,
    latestRecordedAt: "2026-07-23T00:00:00.000Z",
  },
}

describe("ReviewRequestFunnelCard", () => {
  it("renders the aggregate email stages, trackable denominator, and separate external evidence", () => {
    const html = renderToStaticMarkup(<ReviewRequestFunnelCard snapshot={LIVE_SNAPSHOT} />)

    expect(html).toContain("Review requests")
    expect(html).toContain("Cohort 24 June 2026–24 July 2026")
    expect(html).toContain("Eligible")
    expect(html).toContain("Confirmed sent")
    expect(html).toContain("66.7% of eligible")
    expect(html).toContain("Delivered")
    expect(html).toContain("87.5% of sent")
    expect(html).toContain("Unique email traversals")
    expect(html).toContain("50% of 6 trackable sends")
    expect(html).toContain("Eligible request lifecycle")
    expect(html).toContain("Awaiting next run")
    expect(html).toContain("30-day cooldown")
    expect(html).toContain("Policy suppressed")
    expect(html).toContain("Legacy handled, unverified")
    expect(html).toContain("Needs investigation")
    expect(html).toContain("Externally posted reviews")
    expect(html).toContain("+3 since baseline")
    expect(html).toContain("Email security scanners can open review links")
    expect(html).toContain("External totals are manual snapshots and are not attributed to individual visits")
    expect(html).toContain("Decision checkpoint: 15 Aug 2026")
    expect(html).toContain("Current external review total")
  })

  it("does not present legacy handled, unverified requests as definitely unsent", () => {
    const html = renderToStaticMarkup(<ReviewRequestFunnelCard snapshot={LIVE_SNAPSHOT} />)

    expect(html).toContain("Legacy handled, unverified")
    expect(html).toContain(
      "Confirmed sent plus these five lifecycle buckets must equal Eligible.",
    )
    expect(html).not.toContain("Why eligible requests were not sent")
  })

  it("describes a no-sends cohort as an absence of confirmed evidence", () => {
    const html = renderToStaticMarkup(
      <ReviewRequestFunnelCard
        snapshot={{
          ...LIVE_SNAPSHOT,
          funnel: {
            ...LIVE_SNAPSHOT.funnel,
            status: "no_sends",
            eligible: 4,
            sent: 0,
            delivered: 0,
            trackableSent: 0,
            uniqueRedirectTraversals: 0,
            traversalRate: null,
            awaitingNextRun: 1,
            cooldownDeferred: 1,
            policySuppressed: 1,
            legacyHandledUnverifiable: 1,
            actionableBacklog: 0,
          },
        }}
      />,
    )

    expect(html).toContain("No confirmed sends")
    expect(html).toContain("No review-request sends could be confirmed in this window.")
    expect(html).not.toContain("No review-request emails were sent in this window.")
  })

  it("renders degraded evidence as unavailable instead of zero", () => {
    const html = renderToStaticMarkup(
      <ReviewRequestFunnelCard
        snapshot={{
          ...LIVE_SNAPSHOT,
          funnel: {
            status: "degraded",
            eligible: null,
            sent: null,
            delivered: null,
            trackableSent: null,
            uniqueRedirectTraversals: null,
            traversalRate: null,
            awaitingNextRun: null,
            cooldownDeferred: null,
            policySuppressed: null,
            legacyHandledUnverifiable: null,
            actionableBacklog: null,
          },
          external: {
            status: "degraded",
            total: null,
            delta: null,
            baselineTotal: null,
            latestRecordedAt: null,
          },
        }}
      />,
    )

    expect(html.match(/Unavailable/g)?.length).toBeGreaterThanOrEqual(5)
    expect(html).toContain("Email funnel unavailable")
    expect(html).toContain("External total unavailable")
  })

  it("makes a non-zero actionable backlog explicit", () => {
    const html = renderToStaticMarkup(
      <ReviewRequestFunnelCard
        snapshot={{
          ...LIVE_SNAPSHOT,
          funnel: {
            ...LIVE_SNAPSHOT.funnel,
            status: "action_required",
            legacyHandledUnverifiable: 0,
            actionableBacklog: 1,
          },
        }}
      />,
    )

    expect(html).toContain("Needs investigation")
    expect(html).toContain("1 request missed expected processing")
  })
})
