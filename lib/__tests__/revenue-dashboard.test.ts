import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  buildRevenueDashboard,
  buildTrendPeriods,
  computeNetChangePct,
  estimateStripeFeeCents,
  getRevenueDashboard,
  resolveRevenueDashboardSourceAvailability,
  REVENUE_ACTIVE_MILESTONE_CENTS,
} from "@/lib/data/revenue-dashboard"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

const NOW = new Date("2026-06-18T02:00:00.000Z")

type QueryCall = {
  args: unknown[]
  method: string
  table: string
}

function queryResult(
  result: { data: unknown[] | null; error: { message: string } | null },
  table: string,
  calls?: QueryCall[],
) {
  const query = new Proxy({}, {
    get: (_target, property) => {
      if (property === "then") {
        return (
          resolve: (value: typeof result) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject)
      }
      return (...args: unknown[]) => {
        calls?.push({ args, method: String(property), table })
        return query
      }
    },
  })
  return query
}

function revenueDashboardClient(
  results: Array<{ data: unknown[] | null; error: { message: string } | null }>,
  tables?: string[],
  calls?: QueryCall[],
) {
  let index = 0
  return {
    from: (table: string) => {
      tables?.push(table)
      return queryResult(results[index++] ?? { data: [], error: null }, table, calls)
    },
  } as unknown as SupabaseClient
}

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
    id: "intake-paid",
    amount_cents: 4995,
    refund_amount_cents: 2495,
    refund_status: "succeeded",
    refunded_at: "2026-06-18T01:30:00.000Z",
    ...overrides,
  }
}

describe("revenue dashboard read model", () => {
  it("marks incomplete revenue unavailable and partial recovery data degraded", () => {
    const sourceAvailability = resolveRevenueDashboardSourceAvailability({
      paidRowsAvailable: true,
      refundRowsAvailable: false,
      disputeRowsAvailable: true,
      refundStatsAvailable: true,
      createdRowsAvailable: true,
      checkoutRowsAvailable: true,
      partialDraftRowsAvailable: true,
    })

    expect(sourceAvailability).toEqual({
      revenue: "unavailable",
      recovery: "degraded",
    })

    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [],
      refundRows: [],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 0, totalRefunded: 0 },
      sourceAvailability,
    })

    expect(dashboard.sourceAvailability).toEqual(sourceAvailability)

    expect(resolveRevenueDashboardSourceAvailability({
      paidRowsAvailable: true,
      refundRowsAvailable: true,
      disputeRowsAvailable: true,
      refundStatsAvailable: true,
      createdRowsAvailable: true,
      checkoutRowsAvailable: false,
      partialDraftRowsAvailable: true,
    })).toEqual({
      revenue: "available",
      recovery: "degraded",
    })
  })

  it("preserves query failure quality through the live revenue loader", async () => {
    const dashboard = await getRevenueDashboard(revenueDashboardClient([
      { data: [], error: null },
      { data: null, error: { message: "refund read unavailable" } },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]), NOW)

    expect(dashboard.sourceAvailability).toEqual({
      revenue: "unavailable",
      recovery: "degraded",
    })
  })

  it("fails revenue closed when the Stripe dispute ledger cannot be read", async () => {
    const tables: string[] = []
    const dashboard = await getRevenueDashboard(revenueDashboardClient([
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: { message: "dispute ledger unavailable" } },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ], tables), NOW)

    expect(tables).toContain("stripe_disputes")
    expect(dashboard.sourceAvailability.revenue).toBe("unavailable")
    expect(REVENUE_PURCHASE_PAYMENT_STATUSES).toContain("disputed")
  })

  it("loads a reinstatement for an older dispute by either durable cash timestamp", async () => {
    const calls: QueryCall[] = []
    const dashboard = await getRevenueDashboard(revenueDashboardClient([
      { data: [], error: null },
      { data: [], error: null },
      {
        data: [{
          amount: 4995,
          created_at: "2026-05-01T01:00:00.000Z",
          funds_reinstated_at: "2026-06-18T01:30:00.000Z",
          funds_reinstated_cents: 4995,
          funds_withdrawn_at: "2026-05-02T01:30:00.000Z",
          funds_withdrawn_cents: 4995,
          intake_id: "won-dispute",
          intake: {
            id: "won-dispute",
            amount_cents: 4995,
            exclude_from_reporting: false,
            patient_id: "patient-1",
            refund_amount_cents: 0,
            refund_status: null,
            refunded_at: null,
          },
        }],
        error: null,
      },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ], undefined, calls), NOW)

    expect(dashboard.windows.find((window) => window.key === "today")).toMatchObject({
      disputeCents: -4995,
      netCents: 4995,
    })
    expect(calls).toContainEqual(expect.objectContaining({
      args: [expect.stringContaining("funds_withdrawn_at.gte.")],
      method: "or",
      table: "stripe_disputes",
    }))
  })

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
        refundRow({ id: "today-medcert" }),
        refundRow({
          refund_amount_cents: 0,
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
        targetCents: null,
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
        targetCents: REVENUE_ACTIVE_MILESTONE_CENTS,
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

  it("preserves a succeeded refund across every dashboard readout after a failed retry", () => {
    const recordedRefundAfterFailedRetry = {
      id: "partially-refunded-medcert",
      amount_cents: 4995,
      refund_amount_cents: 995,
      refund_status: "failed",
      refunded_at: "2026-06-18T01:30:00.000Z",
    }
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({
          payment_status: "partially_refunded",
          ...recordedRefundAfterFailedRetry,
        }),
      ],
      refundRows: [recordedRefundAfterFailedRetry],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 1, totalRefunded: 995 },
    })

    expect(dashboard.windows.find((window) => window.key === "today")).toMatchObject({
      grossCents: 4995,
      netCents: 4000,
      refundCents: 995,
    })
    expect(dashboard.daily.at(-1)).toMatchObject({
      grossCents: 4995,
      netCents: 4000,
      refundCents: 995,
    })
    expect(dashboard.refundWork.totalRefunded30dCents).toBe(995)
    expect(dashboard.serviceMix[0]).toMatchObject({
      grossCents: 4995,
      netCents: 4000,
    })
  })

  it("timestamps a dispute cash withdrawal and caps the combined loss at the order amount", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({
          id: "disputed-medcert",
          payment_status: "disputed",
          refund_amount_cents: 995,
          refund_status: "succeeded",
          refunded_at: "2026-06-18T01:15:00.000Z",
        }),
      ],
      refundRows: [
        {
          id: "disputed-medcert",
          amount_cents: 4995,
          refund_amount_cents: 995,
          refund_status: "succeeded",
          refunded_at: "2026-06-18T01:15:00.000Z",
        },
      ],
      disputeRows: [
        {
          intake_id: "disputed-medcert",
          funds_reinstated_at: null,
          funds_reinstated_cents: 0,
          funds_withdrawn_at: "2026-06-18T01:30:00.000Z",
          funds_withdrawn_cents: 4995,
          order_amount_cents: 4995,
        },
      ],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 0, totalRefunded: 995 },
    })

    expect(dashboard.windows.find((window) => window.key === "today")).toMatchObject({
      disputeCents: 4000,
      grossCents: 4995,
      netCents: 0,
      refundCents: 995,
    })
    expect(dashboard.daily.at(-1)).toMatchObject({
      disputeCents: 4000,
      grossCents: 4995,
      netCents: 0,
      refundCents: 995,
    })
    expect(dashboard.serviceMix[0]).toMatchObject({
      grossCents: 4995,
      netCents: 0,
    })
  })

  it("timestamps won-dispute funds when Stripe reinstates them", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({
          id: "won-dispute",
          paid_at: "2026-05-01T01:00:00.000Z",
        }),
      ],
      refundRows: [],
      disputeRows: [
        {
          category: "consult",
          intake_id: "won-dispute",
          funds_reinstated_at: "2026-06-18T01:30:00.000Z",
          funds_reinstated_cents: 4995,
          funds_withdrawn_at: "2026-05-18T01:30:00.000Z",
          funds_withdrawn_cents: 4995,
          order_amount_cents: 4995,
          subtype: "ed",
        },
      ],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 0, totalRefunded: 0 },
    })

    expect(dashboard.windows.find((window) => window.key === "today")).toMatchObject({
      disputeCents: -4995,
      grossCents: 0,
      netCents: 4995,
      refundCents: 0,
    })
    expect(dashboard.daily.at(-1)).toMatchObject({
      disputeCents: -4995,
      grossCents: 0,
      netCents: 4995,
      refundCents: 0,
    })
    expect(dashboard.serviceMix).toEqual([
      expect.objectContaining({
        grossCents: 0,
        label: "ED consults",
        netCents: 4995,
      }),
    ])
  })

  it("keeps future payment and refund events out of revenue windows", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({ id: "current-payment" }),
        paidRow({
          id: "future-payment",
          amount_cents: 9995,
          paid_at: "2026-06-19T01:00:00.000Z",
        }),
      ],
      refundRows: [
        refundRow({}),
        refundRow({
          refund_amount_cents: 9995,
          refunded_at: "2026-06-19T01:30:00.000Z",
        }),
      ],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 0, totalRefunded: 2495 },
    })

    expect(dashboard.windows.find((window) => window.key === "last30Days")).toMatchObject({
      averageOrderCents: 2500,
      grossCents: 4995,
      netCents: 2500,
      orderCount: 1,
      refundCents: 2495,
    })
  })

  it("builds trend periods with prior-window deltas and same-time-yesterday pacing", () => {
    // NOW = Sydney 18 Jun, 12:00 AEST. todayStart = 17 Jun 14:00Z.
    const paidRows = [
      paidRow({ id: "today", amount_cents: 4995, paid_at: "2026-06-18T01:00:00.000Z" }),
      // Yesterday 08:00 Sydney — inside the same-time pacing window (< 12:00).
      paidRow({ id: "yesterday-morning", amount_cents: 2995, paid_at: "2026-06-16T22:00:00.000Z" }),
      // Yesterday 15:00 Sydney — after the pacing cutoff, still in the full day.
      paidRow({ id: "yesterday-afternoon", amount_cents: 2495, paid_at: "2026-06-17T05:00:00.000Z" }),
      paidRow({ id: "day-before", amount_cents: 1995, paid_at: "2026-06-16T01:00:00.000Z" }),
    ]

    const periods = buildTrendPeriods(paidRows, [], NOW)
    const byKey = new Map(periods.map((period) => [period.key, period]))

    expect(byKey.get("today")).toMatchObject({
      netCents: 4995,
      orderCount: 1,
      priorNetCents: 2995,
      netChangePct: 67,
      comparisonLabel: "vs same time yesterday",
    })
    expect(byKey.get("yesterday")).toMatchObject({
      netCents: 5490,
      orderCount: 2,
      priorNetCents: 1995,
      netChangePct: 175,
    })
    expect(byKey.get("last7Days")).toMatchObject({
      netCents: 12480,
      orderCount: 4,
      priorNetCents: 0,
      netChangePct: null,
    })
    expect(byKey.get("last30Days")?.netChangePct).toBeNull()
  })

  it("snaps the prior-7-day boundary to a true Sydney midnight across the AEDT transition", () => {
    // Sydney 15 Oct 2026, 13:00 AEDT — daylight saving began 4 Oct, so the
    // prior week crosses the transition. Flat 7-day subtraction from
    // last7DaysStart lands at 23:00 local on 1 Oct; the snapped boundary is
    // midnight 2 Oct AEST (2026-10-01T14:00Z).
    const dstNow = new Date("2026-10-15T02:00:00.000Z")
    const periods = buildTrendPeriods([
      // 23:30 Sydney on 1 Oct — before the prior window. The unsnapped flat
      // boundary would wrongly include it.
      paidRow({ id: "before-boundary", amount_cents: 9_995, paid_at: "2026-10-01T13:30:00.000Z" }),
      // 00:30 Sydney on 2 Oct — first orders of the prior week.
      paidRow({ id: "after-boundary", amount_cents: 4_995, paid_at: "2026-10-01T14:30:00.000Z" }),
      paidRow({ id: "current-week", amount_cents: 2_995, paid_at: "2026-10-14T22:00:00.000Z" }),
    ], [], dstNow)

    expect(periods.find((period) => period.key === "last7Days")).toMatchObject({
      netCents: 2_995,
      priorNetCents: 4_995,
    })
  })

  it("compares 30d against the prior 30d while keeping other readouts scoped to 30d", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({ id: "current-window", amount_cents: 10_000, paid_at: "2026-05-25T01:00:00.000Z" }),
        paidRow({
          id: "prior-window-ed",
          amount_cents: 5_000,
          category: "consult",
          subtype: "ed",
          paid_at: "2026-05-10T01:00:00.000Z",
        }),
      ],
      refundRows: [
        refundRow({ refund_amount_cents: 3_000, refunded_at: "2026-05-12T01:00:00.000Z" }),
        refundRow({ refund_amount_cents: 2_495, refunded_at: "2026-06-17T01:00:00.000Z" }),
      ],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 0, totalRefunded: 0 },
    })

    const last30 = dashboard.trendPeriods.find((period) => period.key === "last30Days")
    // Prior-30d rows power the comparison, and refunds leave the prior window
    // by refunded_at just as they do the current one: 5,000 gross − 3,000.
    expect(last30?.priorNetCents).toBe(2_000)
    expect(last30?.netChangePct).toBe(computeNetChangePct(last30!.netCents, 2_000))
    // …but never leak into 30d-scoped readouts.
    expect(dashboard.serviceMix.map((service) => service.label)).toEqual([
      "Medical certificates",
    ])
    expect(dashboard.monetisation.express.paidOrders).toBe(1)
    expect(dashboard.refundWork.totalRefunded30dCents).toBe(2_495)
  })

  it("builds a 33-day daily series ending today with cached-or-estimated fees", () => {
    const dashboard = buildRevenueDashboard({
      now: NOW,
      paidRows: [
        paidRow({ id: "with-cached-fee", amount_cents: 4995, stripe_fee_cents: 111 }),
        paidRow({ id: "without-cached-fee", amount_cents: 4995 }),
      ],
      refundRows: [],
      createdRows: [],
      checkoutRows: [],
      partialDraftRows: [],
      refundStats: { eligible: 0, failed: 0, totalRefunded: 0 },
    })

    expect(dashboard.daily).toHaveLength(33)
    const todayBucket = dashboard.daily[dashboard.daily.length - 1]
    expect(todayBucket.dateKey).toBe("2026-06-18")
    expect(todayBucket.orderCount).toBe(2)
    expect(estimateStripeFeeCents(4995)).toBe(115)
    expect(todayBucket.feeEstimateCents).toBe(111 + 115)
  })

  it("computeNetChangePct guards zero priors and carries negative swings", () => {
    expect(computeNetChangePct(5_000, 0)).toBeNull()
    expect(computeNetChangePct(5_000, -100)).toBeNull()
    expect(computeNetChangePct(2_500, 5_000)).toBe(-50)
    expect(computeNetChangePct(-500, 1_000)).toBe(-150)
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
