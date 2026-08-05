"use client"

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Crosshair,
  Database,
  Gauge,
  MailCheck,
  Megaphone,
  Minus,
  MousePointer2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { ReviewRequestFunnelCard } from "@/components/admin/review-request-funnel-card"
import {
  DashboardCard,
  StatusBadge,
  type StatusBadgeStatus,
} from "@/components/dashboard"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Button } from "@/components/ui/button"
import type {
  BusinessProfitRow,
  BusinessTrendsViewModel,
  RevenueTrendPeriod,
} from "@/lib/admin/business-trends"
import { STAFF_OPS_HREF } from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

import type { BusinessPageData } from "./analytics-helpers"
import { LiveRefresh } from "./live-refresh"

const AUD = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  maximumFractionDigits: 0,
  style: "currency",
})

const DECISION_COPY = {
  ACTION: {
    detail: "A specific Ads change is ready for operator approval.",
    label: "Approval required",
    status: "warning" as const,
  },
  CHECK: {
    detail: "Resolve the named evidence issue before proposing a change.",
    label: "Investigate",
    status: "warning" as const,
  },
  HOLD: {
    detail: "Keep campaign settings unchanged until the truth gate clears.",
    label: "Hold changes",
    status: "neutral" as const,
  },
}

const REASON_COPY: Record<string, string> = {
  ADS_EVIDENCE_INVALID_RECORD: "Delivered Ads evidence could not be validated",
  ADS_EVIDENCE_NOT_FOUND: "No delivered Ads Agent report is available",
  ADS_EVIDENCE_QUERY_FAILED: "Delivered Ads evidence could not be read",
  ADS_EVIDENCE_STALE: "Ads economics evidence is older than 36 hours",
  ECONOMICS_UNAVAILABLE: "Spend, Stripe fees, or attributed revenue is incomplete",
  REVENUE_UNAVAILABLE: "Net-retained revenue is unavailable",
  TRACKING_NOT_GREEN: "Tracking health is not green",
}

function formatAud(cents: number | null): string {
  return cents === null ? "Unavailable" : AUD.format(cents / 100)
}

function formatPercent(value: number | null): string {
  return value === null ? "Unavailable" : `${value}%`
}

function formatRatio(value: number | null): string {
  return value === null ? "Unavailable" : `${value.toFixed(2)}x`
}

function reasonLabel(reason: string): string {
  return REASON_COPY[reason] ?? reason
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase())
}

function funnelBadgeStatus(
  availability: BusinessPageData["intakeFunnel"]["summary"]["availability"],
): StatusBadgeStatus {
  if (availability === "available") return "success"
  if (availability === "insufficient_coverage") return "warning"
  return "neutral"
}

function metricTone(value: number | null, negativeIsBad = false): string {
  if (value === null) return "text-muted-foreground"
  if (negativeIsBad && value < 0) return "text-destructive"
  return "text-foreground"
}

function Metric({
  detail,
  icon,
  label,
  tone,
  value,
}: {
  detail: string
  icon: React.ReactNode
  label: string
  tone?: string
  value: string
}) {
  return (
    <div className="min-w-0 px-4 py-3.5 first:pl-0 last:pr-0 md:border-l md:border-border/60 md:first:border-l-0">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", tone)}>{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}

function DeltaBadge({ comparisonLabel, pct }: { comparisonLabel: string; pct: number | null }) {
  if (pct === null) {
    return <span className="text-[11px] text-muted-foreground">no prior period</span>
  }
  const direction = pct === 0 ? "flat" : pct > 0 ? "up" : "down"
  const Icon = direction === "flat" ? Minus : direction === "up" ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        direction === "flat" && "text-muted-foreground",
        direction === "up" && "text-emerald-700 dark:text-emerald-400",
        direction === "down" && "text-destructive",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {pct > 0 ? `+${pct}%` : `${pct}%`}
      <span className="sr-only">{comparisonLabel}</span>
    </span>
  )
}

function PeriodTile({ period }: { period: RevenueTrendPeriod }) {
  return (
    <div className="min-w-0 px-4 py-3.5 first:pl-0 last:pr-0 md:border-l md:border-border/60 md:first:border-l-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{period.label}</span>
        <DeltaBadge pct={period.netChangePct} comparisonLabel={period.comparisonLabel} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {AUD.format(period.netCents / 100)}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {period.orderCount.toLocaleString("en-AU")} order{period.orderCount === 1 ? "" : "s"}
        {period.averageOrderCents !== null ? ` · ${AUD.format(period.averageOrderCents / 100)} avg` : ""}
        {" · "}
        {period.comparisonLabel}
      </p>
    </div>
  )
}

function DailyRevenueChart({ chart }: { chart: BusinessTrendsViewModel["chart"] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const days = chart.days
  if (days.length === 0) return null
  const active = days.find((day) => day.dateKey === activeKey) ?? days[days.length - 1]
  const maxNetCents = Math.max(chart.maxNetCents, 1)

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-medium text-muted-foreground">Daily net retained · last 30 days + today</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          <strong className="text-foreground">
            {active.label}
            {active.isToday ? " (today so far)" : ""}
          </strong>
          {" "}
          {AUD.format(active.netCents / 100)} · {active.orderCount.toLocaleString("en-AU")} order{active.orderCount === 1 ? "" : "s"}
          {active.spendCents !== null ? ` · ${AUD.format(active.spendCents / 100)} ads spend` : ""}
        </p>
      </div>
      <div
        role="img"
        aria-label={`Daily net retained bar chart for the last ${days.length} days. Peak day ${AUD.format(chart.maxNetCents / 100)}. Full values in the table that follows.`}
        className="mt-3 flex h-24 items-end gap-[3px]"
        onMouseLeave={() => setActiveKey(null)}
      >
        {days.map((day) => (
          <div
            key={day.dateKey}
            aria-hidden
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setActiveKey(day.dateKey)}
          >
            <div
              className={cn(
                "w-full rounded-t-[3px] transition-colors",
                day.netCents <= 0
                  ? "h-[2px] rounded-none bg-border"
                  : day.isToday
                    ? "bg-primary/45"
                    : day.dateKey === active.dateKey
                      ? "bg-primary"
                      : "bg-primary/75",
              )}
              style={
                day.netCents > 0
                  ? { height: `${Math.max((Math.max(day.netCents, 0) / maxNetCents) * 100, 3)}%` }
                  : undefined
              }
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" aria-hidden>
        <span>{days[0].label}</span>
        <span>{days[days.length - 1].label}</span>
      </div>
      {/* sr-only lives on the wrapper: a clipped <table> still reports its
          intrinsic width and widens mobile scrollWidth when clipped directly. */}
      <div className="sr-only">
      <table>
        <caption>Daily net retained revenue, paid orders, and delivered Google Ads spend</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Net retained</th>
            <th scope="col">Orders</th>
            <th scope="col">Ads spend</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.dateKey}>
              <th scope="row">{day.label}{day.isToday ? " (today so far)" : ""}</th>
              <td>{AUD.format(day.netCents / 100)}</td>
              <td>{day.orderCount}</td>
              <td>{day.spendCents === null ? "No delivered evidence" : AUD.format(day.spendCents / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function ProfitCell({ row }: { row: BusinessProfitRow }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{row.label}</p>
        <span className="text-[11px] tabular-nums text-muted-foreground">{row.windowLabel}</span>
      </div>
      {row.profitCents !== null ? (
        <>
          <p
            className={cn(
              "mt-1 text-xl font-semibold tabular-nums",
              row.profitCents < 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {AUD.format(row.profitCents / 100)}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            {AUD.format((row.netCents ?? 0) / 100)} net − {AUD.format((row.feeEstimateCents ?? 0) / 100)} fees − {AUD.format((row.spendCents ?? 0) / 100)} ads
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.unavailableReason}</p>
          {row.netCents !== null ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {AUD.format(row.netCents / 100)} net − {AUD.format((row.feeEstimateCents ?? 0) / 100)} fees − ads unknown
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

export function AnalyticsDashboardClient({ data }: { data: BusinessPageData }) {
  const { business, intakeFunnel, recordedAttribution, heardAboutUs, reviewRequestFunnel, trends } = data
  const decision = DECISION_COPY[business.scaleDecision]
  const summary = intakeFunnel.summary
  const recordedRows = [
    ...recordedAttribution.rows.filter(
      ({ count, group }) => count > 0 && group !== "direct" && group !== "unknown",
    ).slice(0, 4),
    ...recordedAttribution.rows.filter(({ group }) => group === "direct" || group === "unknown"),
  ]
  const selfReportedRows = heardAboutUs.rows.filter(({ count }) => count > 0).slice(0, 4)
  const selfReportCoverage =
    heardAboutUs.answered !== null && heardAboutUs.paidTotal !== null
      ? heardAboutUs.paidTotal > 0
        ? Math.round((heardAboutUs.answered / heardAboutUs.paidTotal) * 1_000) / 10
        : 0
      : null

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Business"
        description="Revenue, fee-aware contribution, conversion, and acquisition truth."
        badge={<StatusBadge status={decision.status} size="sm">{decision.label}</StatusBadge>}
        actions={(
          <>
            <LiveRefresh generatedAt={data.generatedAt} />
            <Button variant="outline" size="sm" asChild>
              <Link href={STAFF_OPS_HREF}>Operations <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </>
        )}
      />

      <OperatorScrollArea className="space-y-3 pb-1">
        <DashboardCard padding="md" tier="elevated">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                  business.scaleDecision === "ACTION"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                )}>
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Scale gate</p>
                  <p className="text-base font-semibold text-foreground">{business.scaleDecision} · {decision.label}</p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{decision.detail}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Evidence {business.evidenceAgeHours === null ? "unavailable" : `${business.evidenceAgeHours}h old`}
                {business.trackingState ? ` · ${business.trackingState} tracking` : " · tracking unavailable"}
              </p>
              {business.reasonCodes.length > 0 ? (
                <ul className="mt-3 grid gap-1.5 text-xs text-foreground">
                  {business.reasonCodes.slice(0, 3).map((reason) => (
                    <li key={reason} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                      <span>{reasonLabel(reason)}</span>
                    </li>
                  ))}
                  {business.reasonCodes.length > 3 ? (
                    <li className="pl-[22px] text-muted-foreground">
                      +{business.reasonCodes.length - 3} more open conditions
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Evidence inputs are complete.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
              {business.milestone ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active milestone</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{business.milestone.activeMilestone.label}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-primary">{business.milestone.progressPercent}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                      style={{ width: `${business.milestone.progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">{business.milestone.progressLabel}</span>
                    <span className="text-muted-foreground">{business.milestone.activeHorizonLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{business.milestone.nextRungLabel}</p>
                </>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Database className="h-4 w-4" aria-hidden /> Revenue milestone unavailable until the revenue read recovers.
                </div>
              )}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Revenue &amp; profit</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Net retained by Sydney calendar day. Purchases enter when paid; refunds leave on the day they land.
              </p>
            </div>
            <StatusBadge status={trends.availability === "available" ? "info" : "warning"} size="sm">
              {trends.availability === "available"
                ? `30d net retained ${formatAud(business.rolling30NetRetainedCents)}`
                : "Unavailable"}
            </StatusBadge>
          </div>

          {trends.availability === "available" ? (
            <>
              <div className="mt-2 grid divide-y divide-border/60 md:grid-cols-4 md:divide-y-0">
                {trends.periods.map((period) => (
                  <PeriodTile key={period.key} period={period} />
                ))}
              </div>

              <DailyRevenueChart chart={trends.chart} />

              <div className="mt-4 border-t border-border/60 pt-3">
                <p className="text-xs font-medium text-muted-foreground">≈ Profit after ads &amp; payment fees</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {trends.profit.rows.map((row) => (
                    <ProfitCell key={row.key} row={row} />
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{trends.profit.method}</p>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {trends.reason ?? "Revenue trends are unavailable."}
            </p>
          )}
        </DashboardCard>

        <DashboardCard padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Ads performance</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest delivered Ads Agent evidence · rolling 30 days · read-only.
              </p>
            </div>
            <StatusBadge
              status={business.trackingState === "GREEN" ? "success" : business.trackingState ? "warning" : "neutral"}
              size="sm"
            >
              {business.trackingState ? `${business.trackingState} tracking` : "Tracking unavailable"}
            </StatusBadge>
          </div>

          <div className="mt-2 grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-5">
            <Metric
              label="Spend"
              value={formatAud(business.economics.spendCents)}
              detail="Google Ads · rolling 30 days"
              icon={<CircleDollarSign className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.economics.spendCents)}
            />
            <Metric
              label="CPA"
              value={formatAud(business.economics.cpaCents)}
              detail="Spend ÷ ads-attributed orders"
              icon={<Crosshair className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.economics.cpaCents)}
            />
            <Metric
              label="CPC"
              value={formatAud(business.economics.cpcCents)}
              detail={
                business.economics.clicksTotal !== null
                  ? `Spend ÷ ${business.economics.clicksTotal.toLocaleString("en-AU")} clicks`
                  : "Awaiting a delivered run with click data"
              }
              icon={<MousePointer2 className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.economics.cpcCents)}
            />
            <Metric
              label="Net-retained ROAS"
              value={formatRatio(business.economics.netRetainedRoas)}
              detail="Ads net retained ÷ spend"
              icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.economics.netRetainedRoas)}
            />
            <Metric
              label="First-order contribution"
              value={formatAud(business.economics.firstOrderContributionCents)}
              detail="Ads net retained − Stripe fees − spend"
              icon={<BarChart3 className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.economics.firstOrderContributionCents, true)}
            />
          </div>

          <div className="mt-1 grid gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <span><span className="text-muted-foreground">Ads net retained</span> <strong className="ml-1 tabular-nums text-foreground">{formatAud(business.economics.adsNetRetainedCents)}</strong></span>
            <span><span className="text-muted-foreground">Stripe fees (ads orders)</span> <strong className="ml-1 tabular-nums text-foreground">{formatAud(business.economics.stripeFeeCents)}</strong></span>
            <span><span className="text-muted-foreground">Spend yesterday</span> <strong className="ml-1 tabular-nums text-foreground">{formatAud(trends.spendYesterdayCents)}</strong></span>
            <span><span className="text-muted-foreground">Evidence age</span> <strong className="ml-1 tabular-nums text-foreground">{business.evidenceAgeHours === null ? "Unavailable" : `${business.evidenceAgeHours}h`}</strong></span>
          </div>
        </DashboardCard>

        <DashboardCard padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Canonical 30-day start cohort</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Same flow ID, ordered stages, and a fixed 24-hour observation window.</p>
            </div>
            <StatusBadge status={funnelBadgeStatus(summary.availability)} size="sm">
              {summary.availability === "available"
                ? `${formatPercent(summary.startToPaidRate)} start to paid`
                : summary.availability === "insufficient_coverage"
                  ? "Rates withheld"
                  : "Unavailable"}
            </StatusBadge>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {summary.stages.map((stage) => (
              <div key={stage.key} className="rounded-lg border border-border/60 bg-muted/25 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground">{stage.label}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {stage.rateFromPrevious === null ? (stage.key === "started" ? "cohort" : "withheld") : `${stage.rateFromPrevious}%`}
                  </span>
                </div>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stage.count.toLocaleString("en-AU")}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            <span>Minimum event coverage: <strong className="text-foreground">{formatPercent(summary.coveragePercent)}</strong></span>
            <span>Required: <strong className="text-foreground">{summary.requiredCoveragePercent}%</strong></span>
            <span>Late payments reported separately: <strong className="text-foreground">{summary.latePayments}</strong></span>
            {!intakeFunnel.ok ? <span className="text-amber-700 dark:text-amber-300">{intakeFunnel.reason}</span> : null}
          </div>
        </DashboardCard>

        <DashboardCard padding="none">
          <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-border/60">
            <section aria-labelledby="recorded-attribution-heading" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="recorded-attribution-heading" className="text-sm font-semibold text-foreground">Recorded acquisition</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Code-side signals on paid orders. Direct and Unknown stay explicit.</p>
                </div>
                <StatusBadge status={recordedAttribution.availability === "available" ? "info" : "warning"} size="sm">
                  {recordedAttribution.availability === "available" ? `${formatPercent(recordedAttribution.coveragePercent)} known` : "Unavailable"}
                </StatusBadge>
              </div>
              <div className="mt-3 grid gap-1.5">
                {recordedRows.map((row) => (
                  <div key={row.group} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-xs">
                    <span className={cn("text-foreground", !row.known && "text-muted-foreground")}>{row.label}</span>
                    <strong className="tabular-nums text-foreground">{row.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="self-report-heading" className="border-t border-border/60 p-4 lg:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="self-report-heading" className="text-sm font-semibold text-foreground">Self-reported discovery</h2>
                  <p className="mt-1 text-xs text-muted-foreground">A separate dark-traffic check; never merged into recorded attribution.</p>
                </div>
                <StatusBadge status={heardAboutUs.availability === "available" ? "info" : "warning"} size="sm">
                  {heardAboutUs.availability === "available" ? `${formatPercent(selfReportCoverage)} answered` : "Unavailable"}
                </StatusBadge>
              </div>
              <div className="mt-3 grid gap-1.5">
                {selfReportedRows.length > 0 ? selfReportedRows.map((row) => (
                  <div key={row.value} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-foreground">{row.label}</span>
                    <strong className="tabular-nums text-foreground">{row.count}</strong>
                  </div>
                )) : (
                  <p className="rounded-md bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                    {heardAboutUs.availability === "available" ? "No answers in this window." : "Self-report data unavailable."}
                  </p>
                )}
              </div>
            </section>
          </div>

          <details className="group border-t border-border/60">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
              <span className="flex items-center gap-2">
                <MailCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                Measurement checkpoints
                <span className="hidden text-xs font-normal text-muted-foreground sm:inline">Review requests, external reviews, and self-report coverage</span>
              </span>
              <span className="text-xs text-muted-foreground group-open:hidden">Open</span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">Close</span>
            </summary>
            <div className="border-t border-border/60 bg-muted/15 p-3">
              <ReviewRequestFunnelCard snapshot={reviewRequestFunnel} />
            </div>
          </details>
        </DashboardCard>

        <p className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden /> Business is decision support only. Every Google Ads mutation still requires exact operator approval.
        </p>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
