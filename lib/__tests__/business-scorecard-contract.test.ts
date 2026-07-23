import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  buildBusinessOperatingScorecard,
  getBusinessOperatingScorecardSource,
} from "@/lib/data/business-scorecard"

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function scorecardSourceClient(
  results: Array<{ count?: number | null; data: unknown[] | null; error: { message: string } | null }>,
) {
  let index = 0
  const makeQuery = (result: (typeof results)[number]) => {
    const query = new Proxy({}, {
      get: (_target, property) => {
        if (property === "then") {
          return (
            resolve: (value: typeof result) => unknown,
            reject: (reason: unknown) => unknown,
          ) => Promise.resolve(result).then(resolve, reject)
        }
        return () => query
      },
    })
    return query
  }

  return {
    from: () => makeQuery(results[index++] ?? { data: [], error: null }),
  } as unknown as SupabaseClient
}

describe("business operating scorecard contract", () => {
  it("keeps the revenue model grounded in capacity, attribution, and hire-trigger metrics", () => {
    const revenueModel = readProjectFile("docs/REVENUE_MODEL.md")

    expect(revenueModel).toContain("Operating scorecard")
    expect(revenueModel).toContain("Rolling 30-day net-retained revenue")
    expect(revenueModel).toContain("Paid order volume")
    expect(revenueModel).toContain("first-order contribution")
    expect(revenueModel).toContain("Refund rate")
    expect(revenueModel).toContain("Chargeback rate")
    expect(revenueModel).toContain("Support tickets per 100 orders")
    expect(revenueModel).toContain("Paid-to-decision elapsed time")
    expect(revenueModel).toContain("not active doctor labour")
    expect(revenueModel).toContain("Do not invent a contractor rate or sample active minutes")
    expect(revenueModel).not.toContain("Active doctor minutes per order")
    expect(revenueModel).toContain("Queue P95")
    expect(revenueModel).toContain("Capacity review state")
    expect(revenueModel).toContain("sole automatic trigger")
    expect(revenueModel).toContain("20 or more prescription requests per hour")
    expect(revenueModel).toContain("Every launched service remains a low-budget pilot")
    expect(revenueModel).not.toContain("CAC ceiling")
  })

  it("uses canonical net retained while calculating the remaining live scorecard metrics", () => {
    const scorecard = buildBusinessOperatingScorecard({
      now: new Date("2026-06-01T00:00:00.000Z"),
      rolling30DayNetRetainedCents: -2_500,
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

    expect(scorecard.rolling30DayNetRetainedCents.value).toBe(-2_500)
    expect(scorecard.paidOrderVolume.value).toBe(3)
    expect(scorecard.refundRate.value).toBe(33.3)
    expect(scorecard.chargebackRate.value).toBe(33.3)
    expect(scorecard.supportTicketsPer100Orders.value).toBe(66.7)
    expect(scorecard.paidToDecisionMinutes.value).toBe(14)
    expect(scorecard.paidToDecisionMinutes.label).toBe("Average paid-to-decision time")
    expect(scorecard).not.toHaveProperty("doctorMinutesPerOrder")
    expect(scorecard.contributionReadiness).toMatchObject({
      label: "Below-capacity first-order contribution",
      status: "inputs_required",
      display: "Fees + acquisition needed",
      decision: "complete_and_positive_before_scaling",
      formula: "Net-retained order revenue - Stripe/payment fees - attributable acquisition cost",
      ownerDoctorLabour: {
        marginalCashCostCents: 0,
        capacityBounded: true,
        display: "Owner-doctor cash labour is $0 while demand stays within current capacity.",
      },
    })
    expect(scorecard.contributionReadiness.requiredInputs).toEqual([
      "Stripe/payment fees",
      "Attributable acquisition cost",
    ])
    expect(scorecard.queueP95Minutes.value).toBe(180)
    expect(scorecard.queueP95Minutes.target).toBe("Below 2h; never beyond 24h")
    expect(scorecard.capacityReviewState.status).toBe("triggered")
    expect(scorecard.capacityReviewState.triggeredBy).toContain("support load above 5/100 orders")
    expect(scorecard.capacityReviewState.automaticExtraDoctorTrigger).toBe(
      "Sustained 20+ prescription requests/hour",
    )
  })

  it("rejects an incomplete scorecard source instead of converting it to zero", async () => {
    await expect(getBusinessOperatingScorecardSource(scorecardSourceClient([
      { data: [], error: null },
      { count: null, data: null, error: { message: "support read unavailable" } },
      { data: [], error: null },
    ]), new Date("2026-06-01T00:00:00.000Z"))).rejects.toThrow(
      "Business scorecard source unavailable",
    )
  })

  it("promotes the scorecard into the operator analytics product surface", () => {
    const pageSource = readProjectFile("app/admin/analytics/page.tsx")
    const clientSource = readProjectFile("app/admin/analytics/analytics-client.tsx")

    expect(pageSource).toContain("getBusinessOperatingScorecard")
    expect(clientSource).toContain("Operating scorecard")
    expect(clientSource).toContain("30d net retained")
    expect(clientSource).toContain("Support tickets/100 orders")
    expect(clientSource).toContain("Paid-to-decision average")
    expect(clientSource).toContain("Below-capacity contribution")
    expect(clientSource).toContain("businessScorecard.contributionReadiness.formula")
    expect(clientSource).toContain("businessScorecard.contributionReadiness.requiredInputs")
    expect(clientSource).toContain("businessScorecard.contributionReadiness.ownerDoctorLabour.display")
    expect(clientSource).toContain("businessScorecard.capacityReviewState.automaticExtraDoctorTrigger")
    expect(clientSource).toContain("Only sustained 20+ prescription requests/hour automatically requires extra verified doctor coverage.")
    expect(clientSource).toContain("Capacity review")
    expect(clientSource).not.toContain("Doctor time per order")
    expect(clientSource).not.toContain("active labour inputs are measured")
    expect(clientSource).not.toContain("hands-on doctor time")
    expect(clientSource).not.toContain("operator-approved hourly labour rates")
    expect(clientSource).not.toContain("Capacity state does not override the contribution block")
    expect(clientSource).not.toContain('label="Doctor minutes/order"')
    expect(clientSource).not.toContain("Max CAC @30%")
  })
})
