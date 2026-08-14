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
          refund_amount_cents: 0,
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
      disputeCents: 0,
      grossCents: 4995,
      netCents: 2500,
      orderCount: 1,
      refundCents: 2495,
    })
  })

  it("keeps a recorded refund when a later retry changes only the latest status to failed", () => {
    const value = buildNetRetainedPurchaseValue({
      since: new Date("2026-06-01T00:00:00.000Z"),
      until: new Date("2026-07-01T00:00:00.000Z"),
      paidRows: [
        { amount_cents: 4995, paid_at: "2026-06-15T00:00:00.000Z" },
      ],
      refundRows: [
        {
          refund_amount_cents: 995,
          refund_status: "failed",
          refunded_at: "2026-06-20T00:00:00.000Z",
        },
        {
          refund_amount_cents: 0,
          refund_status: "failed",
          refunded_at: "2026-06-21T00:00:00.000Z",
        },
        {
          refund_amount_cents: 500,
          refund_status: "succeeded",
          refunded_at: null,
        },
      ],
    })

    expect(value).toMatchObject({
      grossCents: 4995,
      netCents: 4000,
      refundCents: 995,
    })
  })

  it("deducts dispute withdrawals by cash-event time without double-counting losses already refunded", () => {
    const value = buildNetRetainedPurchaseValue({
      since: new Date("2026-06-01T00:00:00.000Z"),
      until: new Date("2026-07-01T00:00:00.000Z"),
      paidRows: [
        {
          id: "fully-refunded-before-window",
          amount_cents: 4995,
          paid_at: "2026-05-01T00:00:00.000Z",
        },
        {
          id: "partially-refunded-in-window",
          amount_cents: 4995,
          paid_at: "2026-06-15T00:00:00.000Z",
        },
      ],
      refundRows: [
        {
          id: "fully-refunded-before-window",
          amount_cents: 4995,
          refund_amount_cents: 4995,
          refund_status: "succeeded",
          refunded_at: "2026-05-20T00:00:00.000Z",
        },
        {
          id: "partially-refunded-in-window",
          amount_cents: 4995,
          refund_amount_cents: 1995,
          refund_status: "succeeded",
          refunded_at: "2026-06-16T00:00:00.000Z",
        },
      ],
      disputeRows: [
        {
          intake_id: "fully-refunded-before-window",
          funds_reinstated_at: null,
          funds_reinstated_cents: 0,
          funds_withdrawn_at: "2026-06-20T00:00:00.000Z",
          funds_withdrawn_cents: 4995,
          order_amount_cents: 4995,
        },
        {
          intake_id: "partially-refunded-in-window",
          funds_reinstated_at: null,
          funds_reinstated_cents: 0,
          funds_withdrawn_at: "2026-06-17T00:00:00.000Z",
          funds_withdrawn_cents: 4995,
          order_amount_cents: 4995,
        },
        {
          intake_id: "outside-window",
          funds_reinstated_at: null,
          funds_reinstated_cents: 0,
          funds_withdrawn_at: "2026-07-01T00:00:00.001Z",
          funds_withdrawn_cents: 2995,
          order_amount_cents: 2995,
        },
      ],
    })

    expect(value).toEqual({
      averageOrderCents: 0,
      disputeCents: 3000,
      grossCents: 4995,
      netCents: 0,
      orderCount: 1,
      refundCents: 1995,
    })
  })

  it("reinstates only the dispute loss that previously left retained revenue", () => {
    const value = buildNetRetainedPurchaseValue({
      since: new Date("2026-06-01T00:00:00.000Z"),
      until: new Date("2026-07-01T00:00:00.000Z"),
      paidRows: [
        {
          id: "won-dispute",
          amount_cents: 4995,
          paid_at: "2026-05-01T00:00:00.000Z",
        },
      ],
      refundRows: [],
      disputeRows: [
        {
          intake_id: "won-dispute",
          funds_reinstated_at: "2026-06-20T00:00:00.000Z",
          funds_reinstated_cents: 4995,
          funds_withdrawn_at: "2026-05-20T00:00:00.000Z",
          funds_withdrawn_cents: 4995,
          order_amount_cents: 4995,
        },
      ],
    })

    expect(value).toEqual({
      averageOrderCents: null,
      disputeCents: -4995,
      grossCents: 0,
      netCents: 4995,
      orderCount: 0,
      refundCents: 0,
    })
  })
})
