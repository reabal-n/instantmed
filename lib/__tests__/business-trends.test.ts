import { describe, expect, it } from "vitest"

import type { BusinessReadModel } from "@/lib/admin/business-read-model"
import { buildBusinessTrends } from "@/lib/admin/business-trends"
import type {
  AdsDailySpendDay,
  DeliveredAdsAgentRunEvidence,
  RecentDeliveredAdsDailySpendRead,
} from "@/lib/ads-agent/runs"
import type { RevenueDashboard, RevenueDashboardDay } from "@/lib/data/revenue-dashboard"

const DAY_MS = 24 * 60 * 60 * 1000
const TODAY_KEY = "2026-08-05"

function dateKey(offsetDaysBack: number): string {
  return new Date(new Date(`${TODAY_KEY}T00:00:00.000Z`).getTime() - offsetDaysBack * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

function revenueDay(key: string, overrides: Partial<RevenueDashboardDay> = {}): RevenueDashboardDay {
  return {
    dateKey: key,
    label: key.slice(5),
    grossCents: 10_000,
    refundCents: 0,
    netCents: 10_000,
    orderCount: 3,
    feeEstimateCents: 300,
    ...overrides,
  }
}

// 33 buckets: 32 closed days then today, matching DAILY_TREND_DAYS.
function revenueStub(): RevenueDashboard {
  const daily = Array.from({ length: 33 }, (_, index) => revenueDay(dateKey(32 - index)))
  return {
    sourceAvailability: { revenue: "available", recovery: "available" },
    daily,
    trendPeriods: [],
  } as unknown as RevenueDashboard
}

function businessStub(spendCents: number | null): BusinessReadModel {
  return { economics: { spendCents } } as unknown as BusinessReadModel
}

function runStub(startDate: string, endDate: string): DeliveredAdsAgentRunEvidence {
  return {
    snapshot: { windows: { rolling30: { startDate, endDate } } },
  } as unknown as DeliveredAdsAgentRunEvidence
}

function ledger(days: AdsDailySpendDay[]): RecentDeliveredAdsDailySpendRead {
  return { availability: "available", days }
}

function spendDay(key: string, spendCents: number): AdsDailySpendDay {
  return {
    clicks: null,
    dateKey: key,
    deliveredAt: `${key}T23:30:00.000Z`,
    reportDate: key,
    spendCents,
  }
}

// Full ledger for the 7 closed days before today (offsets 1..7).
function fullWeekLedger(spendCentsPerDay = 4_000): AdsDailySpendDay[] {
  return Array.from({ length: 7 }, (_, index) => spendDay(dateKey(index + 1), spendCentsPerDay))
}

describe("buildBusinessTrends", () => {
  it("computes closed-window profit rows when spend evidence fully covers the window", () => {
    const trends = buildBusinessTrends({
      business: businessStub(140_000),
      revenue: revenueStub(),
      run: runStub(dateKey(30), dateKey(1)),
      spendLedger: ledger(fullWeekLedger()),
    })

    expect(trends.availability).toBe("available")
    const byKey = new Map(trends.profit.rows.map((row) => [row.key, row]))

    expect(byKey.get("yesterday")).toMatchObject({
      netCents: 10_000,
      feeEstimateCents: 300,
      spendCents: 4_000,
      profitCents: 10_000 - 300 - 4_000,
      unavailableReason: null,
    })
    expect(byKey.get("last7Closed")).toMatchObject({
      netCents: 70_000,
      feeEstimateCents: 2_100,
      spendCents: 28_000,
      profitCents: 70_000 - 2_100 - 28_000,
      spendCoverage: { known: 7, total: 7 },
    })
    // 30 window days × (10,000 net − 300 fees) − 140,000 spend.
    expect(byKey.get("adsRolling30")).toMatchObject({
      netCents: 300_000,
      feeEstimateCents: 9_000,
      spendCents: 140_000,
      profitCents: 300_000 - 9_000 - 140_000,
    })
    expect(trends.spendYesterdayCents).toBe(4_000)
  })

  it("withholds profit on partial spend coverage instead of overstating it", () => {
    const trends = buildBusinessTrends({
      business: businessStub(140_000),
      revenue: revenueStub(),
      run: runStub(dateKey(30), dateKey(1)),
      spendLedger: ledger(fullWeekLedger().slice(1)),
    })

    const week = trends.profit.rows.find((row) => row.key === "last7Closed")
    expect(week?.profitCents).toBeNull()
    expect(week?.unavailableReason).toBe("Delivered Ads spend covers 6 of 7 days")
    // Revenue-side figures stay visible so the operator still sees the week.
    expect(week?.netCents).toBe(70_000)

    const yesterday = trends.profit.rows.find((row) => row.key === "yesterday")
    expect(yesterday?.profitCents).toBeNull()
    expect(yesterday?.unavailableReason).toBe("Delivered Ads spend covers 0 of 1 days")
  })

  it("names the reason when the ads window outruns the revenue series or evidence is missing", () => {
    const outrun = buildBusinessTrends({
      business: businessStub(140_000),
      revenue: revenueStub(),
      run: runStub(dateKey(40), dateKey(11)),
      spendLedger: ledger(fullWeekLedger()),
    })
    expect(outrun.profit.rows.find((row) => row.key === "adsRolling30")).toMatchObject({
      profitCents: null,
      unavailableReason: "Ads evidence window extends past the revenue series",
    })

    const noRun = buildBusinessTrends({
      business: businessStub(null),
      revenue: revenueStub(),
      run: null,
      spendLedger: { availability: "unavailable", days: [], reason: "query_failed" },
    })
    expect(noRun.profit.rows.find((row) => row.key === "adsRolling30")?.unavailableReason).toBe(
      "No delivered Ads report",
    )

    const staleSpend = buildBusinessTrends({
      business: businessStub(null),
      revenue: revenueStub(),
      run: runStub(dateKey(30), dateKey(1)),
      spendLedger: ledger([]),
    })
    expect(staleSpend.profit.rows.find((row) => row.key === "adsRolling30")?.unavailableReason).toBe(
      "Ads spend evidence is incomplete or stale",
    )
  })

  it("slices the chart to 31 days ending today and overlays known spend", () => {
    const trends = buildBusinessTrends({
      business: businessStub(140_000),
      revenue: revenueStub(),
      run: runStub(dateKey(30), dateKey(1)),
      spendLedger: ledger(fullWeekLedger()),
    })

    expect(trends.chart.days).toHaveLength(31)
    const last = trends.chart.days[trends.chart.days.length - 1]
    expect(last).toMatchObject({ dateKey: TODAY_KEY, isToday: true, spendCents: null })
    expect(trends.chart.days.filter((day) => day.spendCents !== null)).toHaveLength(7)
    expect(trends.chart.maxNetCents).toBe(10_000)
  })

  it("goes unavailable as a whole when the revenue read is down", () => {
    const trends = buildBusinessTrends({
      business: businessStub(140_000),
      revenue: {
        ...revenueStub(),
        sourceAvailability: { revenue: "unavailable", recovery: "available" },
      },
      run: runStub(dateKey(30), dateKey(1)),
      spendLedger: ledger(fullWeekLedger()),
    })

    expect(trends.availability).toBe("unavailable")
    expect(trends.reason).toBe("Net-retained revenue is unavailable")
    expect(trends.periods).toEqual([])
    expect(trends.chart.days).toEqual([])
  })
})
