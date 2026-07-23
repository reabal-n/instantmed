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
    expect(html).toContain("Sent")
    expect(html).toContain("66.7% of eligible")
    expect(html).toContain("Delivered")
    expect(html).toContain("87.5% of sent")
    expect(html).toContain("Unique email traversals")
    expect(html).toContain("50% of 6 trackable sends")
    expect(html).toContain("Externally posted reviews")
    expect(html).toContain("+3 since baseline")
    expect(html).toContain("Email security scanners can open review links")
    expect(html).toContain("External totals are manual snapshots and are not attributed to individual visits")
    expect(html).toContain("Decision checkpoint: 15 Aug 2026")
    expect(html).toContain("Current external review total")
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
})
