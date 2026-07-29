import { describe, expect, it } from "vitest"

import {
  buildCanonicalIntakeFunnel,
  type CanonicalFunnelCoverageRow,
  type CanonicalFunnelFlowRow,
} from "@/lib/analytics/canonical-intake-funnel"

const dateFrom = "2026-06-27T00:00:00.000Z"
const dateTo = "2026-07-27T00:00:00.000Z"

function completeCoverage(percent = 100): CanonicalFunnelCoverageRow[] {
  const rawRows = 100
  const withFlowId = Math.round(rawRows * (percent / 100))
  return [
    "intake_started",
    "checkout_viewed",
    "intake_funnel_payment_initiated",
    "purchase_completed_server",
  ].map((event) => ({ event, rawRows, withFlowId }))
}

function flow(
  flowInstanceId: string,
  overrides: Partial<CanonicalFunnelFlowRow> = {},
): CanonicalFunnelFlowRow {
  return {
    checkoutViewedAt: "2026-07-01T00:10:00.000Z",
    flowInstanceId,
    paidAt: "2026-07-01T00:30:00.000Z",
    paymentInitiatedAt: "2026-07-01T00:20:00.000Z",
    startedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("canonical intake funnel", () => {
  it("counts only ordered same-flow stages and separates late payments", () => {
    const summary = buildCanonicalIntakeFunnel({
      coverageRows: completeCoverage(),
      dateFrom,
      dateTo,
      flowRows: [
        flow("complete"),
        flow("checkout-only", { paymentInitiatedAt: null, paidAt: null }),
        flow("late", { paidAt: "2026-07-02T01:00:00.000Z" }),
        flow("out-of-order", {
          checkoutViewedAt: "2026-07-01T00:20:00.000Z",
          paymentInitiatedAt: "2026-07-01T00:10:00.000Z",
          paidAt: "2026-07-01T00:30:00.000Z",
        }),
      ],
    })

    expect(summary.availability).toBe("available")
    expect(summary.stages.map((stage) => stage.count)).toEqual([4, 4, 2, 1])
    expect(summary.paidWithin24Hours).toBe(1)
    expect(summary.latePayments).toBe(1)
    expect(summary.startToPaidRate).toBe(25)
  })

  it("deduplicates flow rows and keeps every stage monotonic", () => {
    const summary = buildCanonicalIntakeFunnel({
      coverageRows: completeCoverage(),
      dateFrom,
      dateTo,
      flowRows: [
        flow("same-flow"),
        flow("same-flow", { paidAt: "2026-07-01T00:25:00.000Z" }),
        flow("paid-without-payment", { paymentInitiatedAt: null }),
      ],
    })

    expect(summary.stages.map((stage) => stage.count)).toEqual([2, 2, 1, 1])
    expect(summary.startToPaidRate).toBe(50)
    expect(summary.startToPaidRate).toBeLessThanOrEqual(100)
  })

  it("withholds conversion below the 90 percent coverage gate", () => {
    const coverageRows = completeCoverage()
    coverageRows[2] = {
      event: "intake_funnel_payment_initiated",
      rawRows: 100,
      withFlowId: 89,
    }

    const summary = buildCanonicalIntakeFunnel({
      coverageRows,
      dateFrom,
      dateTo,
      flowRows: [flow("complete")],
    })

    expect(summary.availability).toBe("insufficient_coverage")
    expect(summary.coveragePercent).toBe(89)
    expect(summary.startToPaidRate).toBeNull()
    expect(summary.stages.every((stage) => stage.rateFromPrevious === null)).toBe(true)
  })

  it("fails closed when any required stage has no coverage evidence", () => {
    const summary = buildCanonicalIntakeFunnel({
      coverageRows: completeCoverage().slice(0, 3),
      dateFrom,
      dateTo,
      flowRows: [flow("complete")],
    })

    expect(summary.availability).toBe("unavailable")
    expect(summary.coveragePercent).toBeNull()
    expect(summary.startToPaidRate).toBeNull()
  })

  it("excludes starts outside the explicit cohort window", () => {
    const summary = buildCanonicalIntakeFunnel({
      coverageRows: completeCoverage(),
      dateFrom,
      dateTo,
      flowRows: [
        flow("inside"),
        flow("too-new", { startedAt: "2026-07-28T00:00:00.000Z" }),
        flow("too-old", { startedAt: "2026-06-26T23:59:59.000Z" }),
      ],
    })

    expect(summary.stages[0]?.count).toBe(1)
  })
})
