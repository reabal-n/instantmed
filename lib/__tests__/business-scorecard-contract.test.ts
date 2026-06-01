import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { buildBusinessOperatingScorecard } from "@/lib/data/business-scorecard"

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("business operating scorecard contract", () => {
  it("keeps the revenue model grounded in capacity, attribution, and hire-trigger metrics", () => {
    const revenueModel = readProjectFile("docs/REVENUE_MODEL.md")

    expect(revenueModel).toContain("Operating Scorecard")
    expect(revenueModel).toContain("Monthly gross revenue")
    expect(revenueModel).toContain("Paid order volume")
    expect(revenueModel).toContain("CAC ceiling")
    expect(revenueModel).toContain("Refund rate")
    expect(revenueModel).toContain("Chargeback rate")
    expect(revenueModel).toContain("Support tickets per 100 orders")
    expect(revenueModel).toContain("Doctor minutes per order")
    expect(revenueModel).toContain("Queue P95")
    expect(revenueModel).toContain("Hire trigger state")
    expect(revenueModel).toContain("Do not ramp ED or hair-loss paid traffic")
  })

  it("calculates live scorecard metrics from paid/refund/dispute/support/queue rows", () => {
    const scorecard = buildBusinessOperatingScorecard({
      now: new Date("2026-06-01T00:00:00.000Z"),
      paidIntakes: [
        {
          amount_cents: 1995,
          payment_status: "paid",
          paid_at: "2026-05-31T23:00:00.000Z",
          approved_at: "2026-05-31T23:08:00.000Z",
          declined_at: null,
          refunded_at: null,
          refund_amount_cents: 0,
          dispute_id: null,
        },
        {
          amount_cents: 4995,
          payment_status: "refunded",
          paid_at: "2026-05-30T00:00:00.000Z",
          approved_at: null,
          declined_at: "2026-05-30T00:20:00.000Z",
          refunded_at: "2026-05-30T00:21:00.000Z",
          refund_amount_cents: 4995,
          dispute_id: null,
        },
        {
          amount_cents: 2995,
          payment_status: "disputed",
          paid_at: "2026-05-29T00:00:00.000Z",
          approved_at: null,
          declined_at: null,
          refunded_at: null,
          refund_amount_cents: 0,
          dispute_id: "dp_123",
        },
      ],
      supportMessageCount: 2,
      queueWaitMinutes: [10, 80, 180],
    })

    expect(scorecard.monthlyGrossCents.value).toBe(9985)
    expect(scorecard.paidOrderVolume.value).toBe(3)
    expect(scorecard.cacCeilingCents.value).toBe(999)
    expect(scorecard.refundRate.value).toBe(33.3)
    expect(scorecard.chargebackRate.value).toBe(33.3)
    expect(scorecard.supportTicketsPer100Orders.value).toBe(66.7)
    expect(scorecard.doctorMinutesPerOrder.value).toBe(14)
    expect(scorecard.queueP95Minutes.value).toBe(180)
    expect(scorecard.hireTriggerState.status).toBe("triggered")
  })

  it("promotes the scorecard into the operator analytics product surface", () => {
    const pageSource = readProjectFile("app/admin/analytics/page.tsx")
    const clientSource = readProjectFile("app/admin/analytics/analytics-client.tsx")

    expect(pageSource).toContain("getBusinessOperatingScorecard")
    expect(clientSource).toContain("Operating scorecard")
    expect(clientSource).toContain("Monthly gross")
    expect(clientSource).toContain("Support tickets/100 orders")
    expect(clientSource).toContain("Hire trigger state")
  })
})
