import { describe, expect, it } from "vitest"

import { buildMonetisationReadouts } from "@/lib/data/revenue-dashboard"

type Row = Parameters<typeof buildMonetisationReadouts>[0][number]

function paidRow(overrides: Partial<Row>): Row {
  return {
    id: "row",
    amount_cents: 2495,
    category: "medical_certificate",
    is_priority: false,
    paid_at: "2026-07-01T00:00:00Z",
    payment_status: "paid",
    refund_amount_cents: null,
    refund_status: null,
    refunded_at: null,
    status: "approved",
    subtype: "work",
    ...overrides,
  }
}

/**
 * Decision-support readouts contract (2026-07-10 audit): Express attach and
 * the med-cert duration mix were the two monetisation levers running blind.
 */
describe("buildMonetisationReadouts", () => {
  it("computes Express attach rate and fee gross across all services", () => {
    const rows = [
      paidRow({ id: "a" }),
      paidRow({ id: "b", category: "prescription", amount_cents: 2995 + 995, is_priority: true }),
      paidRow({ id: "c", category: "prescription", amount_cents: 2995, is_priority: false }),
      paidRow({ id: "d", category: "consult", amount_cents: 4995, is_priority: false }),
    ]
    const result = buildMonetisationReadouts(rows)
    expect(result.express.paidOrders).toBe(4)
    expect(result.express.expressOrders).toBe(1)
    expect(result.express.attachPct).toBe(25)
    expect(result.express.feeGrossCents).toBe(995)
  })

  it("buckets cert duration by BASE price, normalising the priority fee out", () => {
    const rows = [
      paidRow({ id: "a", amount_cents: 2495 }), // 1d
      paidRow({ id: "b", amount_cents: 2495 + 995, is_priority: true }), // 1d + express
      paidRow({ id: "c", amount_cents: 2995 }), // 2d
      paidRow({ id: "d", amount_cents: 3995 }), // 3d
    ]
    const result = buildMonetisationReadouts(rows)
    expect(result.certOrderCount).toBe(4)
    expect(result.certDurationMix).toEqual([
      { days: 1, orderCount: 2, sharePct: 50 },
      { days: 2, orderCount: 1, sharePct: 25 },
      { days: 3, orderCount: 1, sharePct: 25 },
    ])
  })

  it("excludes legacy/unknown price points from the mix instead of misbucketing", () => {
    const rows = [
      paidRow({ id: "a", amount_cents: 1995 }), // legacy pre-Jun-8 price
      paidRow({ id: "b", amount_cents: 2495 }),
    ]
    const result = buildMonetisationReadouts(rows)
    expect(result.certOrderCount).toBe(2)
    const total = result.certDurationMix.reduce((s, t) => s + t.orderCount, 0)
    expect(total).toBe(1)
    expect(result.certDurationMix.find((t) => t.days === 1)?.sharePct).toBe(100)
  })

  it("handles zero orders without dividing by zero", () => {
    const result = buildMonetisationReadouts([])
    expect(result.express.attachPct).toBe(0)
    expect(result.certDurationMix).toEqual([])
    expect(result.certOrderCount).toBe(0)
  })
})
