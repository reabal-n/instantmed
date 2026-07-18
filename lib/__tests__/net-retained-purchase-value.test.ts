import { describe, expect, it } from "vitest"

import { buildNetRetainedPurchaseValue } from "@/lib/data/net-retained-purchase-value"

describe("Net Retained Purchase Value", () => {
  it("uses payment and refund event timestamps for the reporting window", () => {
    const value = buildNetRetainedPurchaseValue({
      since: new Date("2026-06-01T00:00:00.000Z"),
      until: new Date("2026-07-01T00:00:00.000Z"),
      paidRows: [
        { amount_cents: 2995, paid_at: "2026-05-31T23:59:59.999Z" },
        { amount_cents: 4995, paid_at: "2026-06-15T00:00:00.000Z" },
        { amount_cents: 3995, paid_at: "2026-07-01T00:00:00.001Z" },
      ],
      refundRows: [
        {
          refund_amount_cents: 1000,
          refund_status: "succeeded",
          refunded_at: "2026-05-31T23:59:59.999Z",
        },
        {
          refund_amount_cents: 2495,
          refund_status: "succeeded",
          refunded_at: "2026-06-20T00:00:00.000Z",
        },
        {
          refund_amount_cents: 9995,
          refund_status: "failed",
          refunded_at: "2026-06-21T00:00:00.000Z",
        },
        {
          refund_amount_cents: 1000,
          refund_status: "succeeded",
          refunded_at: "2026-07-01T00:00:00.001Z",
        },
      ],
    })

    expect(value).toEqual({
      averageOrderCents: 2500,
      grossCents: 4995,
      netCents: 2500,
      orderCount: 1,
      refundCents: 2495,
    })
  })
})
