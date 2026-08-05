import type { BusinessReadModel } from "@/lib/admin/business-read-model"
import type {
  AdsDailySpendDay,
  DeliveredAdsAgentRunEvidence,
  RecentDeliveredAdsDailySpendRead,
} from "@/lib/ads-agent/runs"
import type {
  RevenueDashboard,
  RevenueDashboardDay,
  RevenueTrendPeriod,
} from "@/lib/data/revenue-dashboard"

// Re-exported so client components can take the trend types from one module
// without a runtime import of the server-only revenue read.
export type { RevenueTrendPeriod }

// The daily revenue series carries spare closed days (see DAILY_TREND_DAYS in
// revenue-dashboard.ts); the chart itself renders the latest 30 closed days
// plus today.
const CHART_DAYS = 31

interface BusinessTrendChartDay {
  dateKey: string
  label: string
  netCents: number
  orderCount: number
  isToday: boolean
  /** Delivered Google Ads spend for that closed Sydney day; null = no evidence. */
  spendCents: number | null
}

type BusinessProfitRowKey = "yesterday" | "last7Closed" | "adsRolling30"

export interface BusinessProfitRow {
  key: BusinessProfitRowKey
  label: string
  windowLabel: string
  netCents: number | null
  feeEstimateCents: number | null
  spendCents: number | null
  spendCoverage: { known: number; total: number } | null
  profitCents: number | null
  unavailableReason: string | null
}

export interface BusinessTrendsViewModel {
  availability: "available" | "unavailable"
  reason: string | null
  periods: RevenueTrendPeriod[]
  chart: {
    days: BusinessTrendChartDay[]
    maxNetCents: number
  }
  profit: {
    method: string
    rows: BusinessProfitRow[]
  }
  spendYesterdayCents: number | null
}

const PROFIT_METHOD =
  "Net retained − Google Ads spend − payment fees (actual where synced, est. 1.7% + $0.30 otherwise). Excludes fixed costs."

function formatSydneyDay(dateKey: string): string {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime())) return dateKey
  return parsed.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

function windowLabelFromKeys(startKey: string, endKey: string): string {
  return startKey === endKey
    ? formatSydneyDay(startKey)
    : `${formatSydneyDay(startKey)} – ${formatSydneyDay(endKey)}`
}

function unavailableRow(
  key: BusinessProfitRowKey,
  label: string,
  windowLabel: string,
  reason: string,
): BusinessProfitRow {
  return {
    key,
    label,
    windowLabel,
    netCents: null,
    feeEstimateCents: null,
    spendCents: null,
    spendCoverage: null,
    profitCents: null,
    unavailableReason: reason,
  }
}

function profitRowFromBuckets(args: {
  key: BusinessProfitRowKey
  label: string
  buckets: RevenueDashboardDay[]
  spendByDay: Map<string, number>
}): BusinessProfitRow {
  const { buckets } = args
  const windowLabel = windowLabelFromKeys(
    buckets[0]?.dateKey ?? "",
    buckets[buckets.length - 1]?.dateKey ?? "",
  )
  const netCents = buckets.reduce((sum, day) => sum + day.netCents, 0)
  const feeEstimateCents = buckets.reduce((sum, day) => sum + day.feeEstimateCents, 0)
  const knownSpendDays = buckets.filter((day) => args.spendByDay.has(day.dateKey))
  const spendCoverage = { known: knownSpendDays.length, total: buckets.length }

  // Partial spend evidence would understate costs and overstate profit, so a
  // profit figure requires spend for every day in the window.
  if (spendCoverage.known < spendCoverage.total) {
    return {
      ...unavailableRow(
        args.key,
        args.label,
        windowLabel,
        `Delivered Ads spend covers ${spendCoverage.known} of ${spendCoverage.total} days`,
      ),
      netCents,
      feeEstimateCents,
      spendCoverage,
    }
  }

  const spendCents = knownSpendDays.reduce(
    (sum, day) => sum + (args.spendByDay.get(day.dateKey) ?? 0),
    0,
  )

  return {
    key: args.key,
    label: args.label,
    windowLabel,
    netCents,
    feeEstimateCents,
    spendCents,
    spendCoverage,
    profitCents: netCents - feeEstimateCents - spendCents,
    unavailableReason: null,
  }
}

function adsRolling30Row(args: {
  business: BusinessReadModel
  closedBuckets: Map<string, RevenueDashboardDay>
  run: DeliveredAdsAgentRunEvidence | null
}): BusinessProfitRow {
  const label = "Ads 30-day window"
  if (!args.run) {
    return unavailableRow("adsRolling30", label, "—", "No delivered Ads report")
  }
  const window = args.run.snapshot.windows.rolling30
  const windowLabel = windowLabelFromKeys(window.startDate, window.endDate)
  const spendCents = args.business.economics.spendCents
  if (spendCents === null) {
    return unavailableRow(
      "adsRolling30",
      label,
      windowLabel,
      "Ads spend evidence is incomplete or stale",
    )
  }

  // Walk the run's own closed-day window over the revenue buckets so revenue
  // and spend describe the same days.
  const windowBuckets: RevenueDashboardDay[] = []
  for (
    let cursor = new Date(`${window.startDate}T00:00:00.000Z`);
    cursor.getTime() <= new Date(`${window.endDate}T00:00:00.000Z`).getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const dateKey = cursor.toISOString().slice(0, 10)
    const bucket = args.closedBuckets.get(dateKey)
    if (!bucket) {
      return unavailableRow(
        "adsRolling30",
        label,
        windowLabel,
        "Ads evidence window extends past the revenue series",
      )
    }
    windowBuckets.push(bucket)
  }
  if (windowBuckets.length === 0) {
    return unavailableRow("adsRolling30", label, windowLabel, "Ads evidence window is empty")
  }

  const netCents = windowBuckets.reduce((sum, day) => sum + day.netCents, 0)
  const feeEstimateCents = windowBuckets.reduce(
    (sum, day) => sum + day.feeEstimateCents,
    0,
  )

  return {
    key: "adsRolling30",
    label,
    windowLabel,
    netCents,
    feeEstimateCents,
    spendCents,
    spendCoverage: null,
    profitCents: netCents - feeEstimateCents - spendCents,
    unavailableReason: null,
  }
}

export function buildBusinessTrends(args: {
  business: BusinessReadModel
  revenue: RevenueDashboard | null
  run: DeliveredAdsAgentRunEvidence | null
  spendLedger: RecentDeliveredAdsDailySpendRead
}): BusinessTrendsViewModel {
  const revenueAvailable =
    args.revenue !== null && args.revenue.sourceAvailability.revenue === "available"
  if (!args.revenue || !revenueAvailable) {
    return {
      availability: "unavailable",
      reason: "Net-retained revenue is unavailable",
      periods: [],
      chart: { days: [], maxNetCents: 0 },
      profit: { method: PROFIT_METHOD, rows: [] },
      spendYesterdayCents: null,
    }
  }

  const spendByDay = new Map<string, number>(
    args.spendLedger.availability === "available"
      ? args.spendLedger.days.map((day: AdsDailySpendDay) => [day.dateKey, day.spendCents])
      : [],
  )

  const daily = args.revenue.daily
  const closedDays = daily.slice(0, -1)
  const today = daily[daily.length - 1] ?? null
  const closedBuckets = new Map(closedDays.map((day) => [day.dateKey, day]))
  const yesterdayBucket = closedDays[closedDays.length - 1] ?? null
  const last7Closed = closedDays.slice(-7)

  const chartDays = daily.slice(-CHART_DAYS).map((day): BusinessTrendChartDay => ({
    dateKey: day.dateKey,
    label: day.label,
    netCents: day.netCents,
    orderCount: day.orderCount,
    isToday: today !== null && day.dateKey === today.dateKey,
    spendCents: spendByDay.get(day.dateKey) ?? null,
  }))

  const rows: BusinessProfitRow[] = [
    yesterdayBucket
      ? profitRowFromBuckets({
          key: "yesterday",
          label: "Yesterday",
          buckets: [yesterdayBucket],
          spendByDay,
        })
      : unavailableRow("yesterday", "Yesterday", "—", "Revenue series is empty"),
    last7Closed.length === 7
      ? profitRowFromBuckets({
          key: "last7Closed",
          label: "Last 7 closed days",
          buckets: last7Closed,
          spendByDay,
        })
      : unavailableRow(
          "last7Closed",
          "Last 7 closed days",
          "—",
          "Revenue series is shorter than 7 days",
        ),
    adsRolling30Row({
      business: args.business,
      closedBuckets,
      run: args.run,
    }),
  ]

  return {
    availability: "available",
    reason: null,
    periods: args.revenue.trendPeriods,
    chart: {
      days: chartDays,
      maxNetCents: Math.max(0, ...chartDays.map((day) => Math.max(day.netCents, 0))),
    },
    profit: { method: PROFIT_METHOD, rows },
    spendYesterdayCents: yesterdayBucket
      ? spendByDay.get(yesterdayBucket.dateKey) ?? null
      : null,
  }
}
