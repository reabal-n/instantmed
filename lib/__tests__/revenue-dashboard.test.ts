import { describe, expect, it } from "vitest"

import {
  buildRevenueDashboard,
  REVENUE_DAILY_TARGET_CENTS,
  REVENUE_MONTHLY_TARGET_CENTS,
} from "@/lib/data/revenue-dashboard"

const NOW = new Date("2026-06-18T02:00:00.000Z")

function paidRow(overrides: Record<string, unknown>) {
  return {
    id: "intake-paid",
    amount_cents: 4995,
    category: "medical_certificate",
    is_priority: false,
    paid_at: "2026-06-18T01:00:00.000Z",
    payment_status: "paid",
    refund_amount_cents: 0,
    refund_status: null,
    refunded_at: null,
    status: "paid",
    subtype: null,
    ...overrides,
  }
}

function refundRow(overrides: Record<string, unknown>) {
  return {
    refund_amount_cents: 2495,
    refund_status: "succeeded",
    refunded_at: "2026-06-18T01:30:00.000Z",
    ...overrides,
  }
}

describe("revenue dashboard read model", () => {
  it("summarizes reportable revenue, refunds, service mix, and checkout pressure", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({ id: "today-medcert" }),
        paidRow({
          id: "week-rx",
          amount_cents: 2995,
          category: "prescription",
          paid_at: "2026-06-16T01:00:00.000Z",
        }),
        paidRow({
          id: "older-ed",
          amount_cents: 4995,
          category: "consult",
          subtype: "ed",
          paid_at: "2026-06-01T01:00:00.000Z",
        }),
      ],
      refundRows: [
        refundRow({}),
        refundRow({
          refund_amount_cents: 9995,
          refund_status: "failed",
          refunded_at: "2026-06-18T01:45:00.000Z",
        }),
      ],
      createdRows: [{ created_at: "2026-06-18T00:30:00.000Z" }],
      checkoutRows: [
        { created_at: "2026-06-18T01:50:00.000Z", payment_status: "pending", status: "pending_payment" },
        { created_at: "2026-06-17T03:00:00.000Z", payment_status: "failed", status: "checkout_failed" },
      ],
      partialDraftRows: [{ updated_at: "2026-06-18T00:00:00.000Z" }],
      refundStats: { eligible: 1, failed: 1, totalRefunded: 2495 },
    })

    expect(dashboard.status).toBe("healthy")
    expect(dashboard.statusLabel).toBe("Receiving payments")
    expect(dashboard.windows).toMatchObject([
      {
        key: "today",
        grossCents: 4995,
        refundCents: 2495,
        netCents: 2500,
        orderCount: 1,
        targetCents: REVENUE_DAILY_TARGET_CENTS,
      },
      {
        key: "last7Days",
        grossCents: 7990,
        refundCents: 2495,
        netCents: 5495,
        orderCount: 2,
      },
      {
        key: "last30Days",
        grossCents: 12985,
        refundCents: 2495,
        netCents: 10490,
        orderCount: 3,
        targetCents: REVENUE_MONTHLY_TARGET_CENTS,
      },
    ])
    expect(dashboard.paymentFriction).toMatchObject({
      activeCheckoutStageCount: 2,
      activeDraftCount: 1,
      checkoutFailedCount: 1,
      pendingPaymentCount: 1,
      staleCheckoutStageCount: 1,
    })
    expect(dashboard.refundWork).toMatchObject({
      eligibleRefunds: 1,
      failedRefunds: 1,
      openRefundWork: 2,
      totalRefunded30dCents: 2495,
    })
    expect(dashboard.serviceMix.map((service) => service.label)).toEqual([
      "Medical certificates",
      "ED consults",
      "Repeat prescriptions",
    ])
    expect(dashboard.recentPayments[0]).toMatchObject({
      id: "today-medcert",
      amountCents: 4995,
      label: "Medical certificates",
    })
  })

  it("surfaces no-purchase risk when demand exists without paid intakes", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [],
      refundRows: [],
      createdRows: [{ created_at: "2026-06-17T20:00:00.000Z" }],
      checkoutRows: [{ created_at: "2026-06-17T20:30:00.000Z", payment_status: "pending", status: "pending_payment" }],
      partialDraftRows: Array.from({ length: 10 }, (_, index) => ({
        updated_at: `2026-06-17T${String(10 + index).padStart(2, "0")}:00:00.000Z`,
      })),
      refundStats: { eligible: 0, failed: 0, totalRefunded: 0 },
    })

    expect(dashboard.status).toBe("critical")
    expect(dashboard.statusLabel).toBe("No purchases 48h")
    expect(dashboard.noPurchaseAlert?.severity).toBe("critical")
    expect(dashboard.noPurchaseWindows.warning.paidIntakes).toBe(0)
    expect(dashboard.noPurchaseWindows.critical.partialDrafts).toBe(10)
  })
})
