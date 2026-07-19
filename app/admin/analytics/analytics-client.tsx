"use client"

import {
  Activity,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Gauge,
  Headphones,
  MailCheck,
  Megaphone,
  MousePointerClick,
  Pill,
  Receipt,
  Send,
  SkipForward,
  Timer,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  UserPlus,
  WalletCards,
  Webhook,
} from "lucide-react"
import Link from "next/link"

import { GeographicBreakdownCard } from "@/components/admin/geographic-breakdown-card"
import { OperatorBriefPanel } from "@/components/admin/operator-brief"
import {
  DashboardCard,
  DashboardGrid,
  StatCard,
  type StatCardStatus,
  StatusBadge,
  type StatusBadgeStatus,
} from "@/components/dashboard"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Button } from "@/components/ui/button"
import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_REFUNDS_HREF,
  buildAdminIntakeHref,
  buildStaffEmailHubHref,
  buildStaffLedgerHref,
  STAFF_DASHBOARD_HREF,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import type { GeographicBreakdown } from "@/lib/data/analytics-geographic"
import { formatMinutes, formatTimeAgo } from "@/lib/format"
import { formatAudDollars } from "@/lib/format/aud"
import { cn } from "@/lib/utils"

import { type AnalyticsData } from "./analytics-helpers"
import { LiveRefresh } from "./live-refresh"

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
  geographic: GeographicBreakdown
}

const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" })

// Canonical AUD-from-cents formatter, matching the folded-in Payments dashboard.
function formatCents(cents: number | null | undefined): string {
  return cents == null ? "No data" : AUD.format(cents / 100)
}

function formatNullableTime(value: string | null): string {
  return value ? formatTimeAgo(value) : "Not recorded"
}

function formatRatio(value: number | null | undefined): string {
  return value == null ? "No data" : `${value.toFixed(2)}x`
}

function formatPercentValue(value: number | null | undefined): string {
  return value == null ? "No data" : `${value}%`
}

function formatStepId(stepId: string): string {
  return stepId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function uploadHealthStatus(analytics: AnalyticsData["googleAds"]): StatusBadgeStatus {
  if (analytics.configuration.severity === "error" || analytics.failed > 0 || analytics.retryPaused > 0) return "error"
  if (analytics.configuration.severity === "warning") return "warning"
  if (analytics.missingUpload > 0 || analytics.skipped > 0) return "warning"
  if (analytics.uploaded > 0) return "success"
  return "neutral"
}

function stageStatus({
  count,
  emailFailedCount,
  oldestMinutes,
  slaBreachedCount,
}: {
  count: number
  emailFailedCount: number
  oldestMinutes: number | null
  slaBreachedCount: number
}): StatusBadgeStatus {
  if (count === 0) return "success"
  if (emailFailedCount > 0 || slaBreachedCount > 0) return "error"
  if (oldestMinutes != null && oldestMinutes > 24 * 60) return "error"
  if (oldestMinutes != null && oldestMinutes > 4 * 60) return "warning"
  return "info"
}

function confirmationSourceLabel(source: AnalyticsData["prescriptionFulfilment"]["stages"][number]["items"][number]["confirmationSource"]) {
  if (source === "parchment_webhook") return "Webhook"
  if (source === "manual_or_pms") return "Manual/PMS"
  return null
}

function notificationStatusLabel(status: AnalyticsData["prescriptionFulfilment"]["stages"][number]["items"][number]["notificationStatus"]) {
  if (status === "sent") return "Email sent"
  if (status === "failed") return "Email failed"
  if (status === "pending") return "Email pending"
  return null
}

type BusinessScorecardStatus = NonNullable<AnalyticsData["businessScorecard"]>["rolling30DayNetRetainedCents"]["status"]

function scorecardStatus(status: BusinessScorecardStatus): StatCardStatus {
  if (status === "healthy") return "success"
  if (status === "watch") return "warning"
  if (status === "triggered") return "error"
  return "neutral"
}

function scorecardBadgeStatus(status: BusinessScorecardStatus): StatusBadgeStatus {
  if (status === "healthy") return "success"
  if (status === "watch") return "warning"
  if (status === "triggered") return "error"
  return "neutral"
}

type GoogleAdsReturnStatus = NonNullable<AnalyticsData["googleAdsReturn"]>["status"]

function adsReturnBadgeStatus(status: GoogleAdsReturnStatus): StatusBadgeStatus {
  if (status === "revenue_above_spend") return "success"
  if (status === "revenue_below_spend" || status === "no_local_orders") return "error"
  if (status === "unknown") return "warning"
  return "neutral"
}

function adsReturnStatusLabel(status: GoogleAdsReturnStatus): string {
  if (status === "revenue_above_spend") return "Revenue above ad spend"
  if (status === "revenue_below_spend") return "Revenue below ad spend"
  if (status === "no_local_orders") return "No local orders"
  if (status === "no_spend") return "No spend"
  return "Incomplete"
}

function intakeFunnelStatus(analytics: AnalyticsData["intakeFunnel"]): StatusBadgeStatus {
  if (!analytics.ok) return "warning"
  if (analytics.summary.totals.started === 0) return "neutral"
  if ((analytics.summary.totals.startToCheckoutRate ?? 0) < 40) return "warning"
  return "info"
}

// The single worst step: lowest continue-through rate among steps with enough
// volume to be signal, not a 2-view fluke. Powers the hero "biggest drop-off".
function pickWorstStep(summary: AnalyticsData["intakeFunnel"]["summary"]) {
  const rows = summary.stepFriction ?? []
  const meaningful = rows.filter((s) => s.viewed >= 8)
  const pool = meaningful.length > 0 ? meaningful : rows
  return (
    pool
      .slice()
      .sort((a, b) => (a.completionRate ?? 100) - (b.completionRate ?? 100))[0] ?? null
  )
}

export function AnalyticsDashboardClient({
  analytics,
  geographic,
}: AnalyticsDashboardClientProps) {
  const {
    aiAttribution,
    businessScorecard,
    funnel,
    generatedAt,
    googleAds,
    googleAdsReturn,
    heardAboutUs,
    intakeFunnel,
    operatorBrief,
    recoveryScorecard,
    prescriptionFulfilment,
    revenue,
    queueHealth,
  } = analytics

  const payRate = funnel.started > 0 ? Math.round((funnel.paid / funnel.started) * 100) : 0
  const completeRate = funnel.paid > 0 ? Math.round((funnel.completed / funnel.paid) * 100) : 0
  const googleAdsStatus = uploadHealthStatus(googleAds)
  const intakeFunnelSummary = intakeFunnel.summary
  const intakeFunnelBadge = intakeFunnelStatus(intakeFunnel)
  const worstStep = intakeFunnel.ok ? pickWorstStep(intakeFunnelSummary) : null
  const serverPayRate = intakeFunnelSummary.totals.serverCheckoutToPaidRate

  const answerRate =
    heardAboutUs.paidTotal > 0
      ? Math.round((heardAboutUs.answered / heardAboutUs.paidTotal) * 100)
      : 0
  const heardRows = heardAboutUs.rows.filter((r) => r.count > 0)
  const aiShare =
    aiAttribution.paidTotal > 0
      ? Math.round((aiAttribution.totalAiOrders / aiAttribution.paidTotal) * 100)
      : 0
  const maxWeeklyChatgpt = Math.max(1, ...aiAttribution.weekly.map((w) => w.chatgpt))

  // Revenue windows (Australia/Sydney, refund-adjusted net) from the canonical helper.
  const todayWindow = revenue.windows.find((w) => w.key === "today")
  const week = revenue.windows.find((w) => w.key === "last7Days")
  const month = revenue.windows.find((w) => w.key === "last30Days")
  const maxDailyNet = Math.max(1, revenue.maxDailyNetCents)
  const revenueDataAvailable = revenue.sourceAvailability.revenue === "available"
  const recoveryDataAvailable = revenue.sourceAvailability.recovery === "available"

  // Google Ads: at trivial spend, ROAS/"Losing" is noise. Present it calmly and
  // only sound the profit alarm once real money is going out.
  const adsReturnAvailable = googleAdsReturn?.returnMetricsAvailability === "available"
  const spendDollars = googleAdsReturn?.summary.spendAud ?? 0
  const adsMinimalSpend = adsReturnAvailable && spendDollars < 50
  const adsBadgeStatus: StatusBadgeStatus = !adsReturnAvailable
    ? "warning"
    : adsMinimalSpend
    ? "neutral"
    : adsReturnBadgeStatus(googleAdsReturn.status)
  const adsBadgeLabel = !adsReturnAvailable
    ? "Spend data unavailable"
    : adsMinimalSpend
    ? spendDollars > 0
      ? "Minimal spend"
      : "No recent spend"
    : adsReturnStatusLabel(googleAdsReturn!.status)
  const campaignStateLabel = googleAdsReturn?.campaignState === "enabled"
    ? "enabled"
    : googleAdsReturn?.campaignState === "paused"
      ? "paused"
      : googleAdsReturn?.campaignState === "mixed"
        ? "mixed"
        : "unverified"

  const notificationIssueHref = prescriptionFulfilment.firstNotificationIssueIntakeId
    ? buildStaffEmailHubHref({
        tab: "queue",
        intakeId: prescriptionFulfilment.firstNotificationIssueIntakeId,
      })
    : buildStaffEmailHubHref({ tab: "queue" })

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Overview"
        description="Your business at a glance — revenue, conversion, and where patients come from."
        backHref={STAFF_DASHBOARD_HREF}
        backLabel="Staff cockpit"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <LiveRefresh generatedAt={generatedAt} />
            <Button variant="outline" asChild>
              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PostHog
              </a>
            </Button>
          </div>
        }
      />

      <OperatorScrollArea>
        {/* ============================ ESSENTIALS ============================ */}

        <OperatorBriefPanel brief={operatorBrief} googleAdsReturn={googleAdsReturn} />

        {/* Revenue: refund-adjusted net + AOV + a 7-day net trend. */}
        <section aria-labelledby="revenue-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="revenue-heading" className="text-sm font-semibold text-foreground">Revenue</h2>
            <p className="text-xs text-muted-foreground">
              {revenueDataAvailable
                ? `Last paid ${revenue.lastPaidAt ? formatTimeAgo(revenue.lastPaidAt) : "—"}`
                : "Payment or refund data unavailable"}
              {revenueDataAvailable && week ? ` · ${week.orderCount} orders in 7d` : ""}
              {revenueDataAvailable && month ? ` · ${month.orderCount} in 30d` : ""}
            </p>
          </div>
          <DashboardGrid columns={4} gap="md">
            <StatCard
              label="Today"
              value={revenueDataAvailable ? formatCents(todayWindow?.netCents ?? 0) : "Unavailable"}
              icon={<DollarSign className="h-5 w-5" />}
              status={!revenueDataAvailable ? "warning" : (todayWindow?.netCents ?? 0) > 0 ? "success" : "neutral"}
            />
            <StatCard
              label="7 days"
              value={revenueDataAvailable ? formatCents(week?.netCents ?? 0) : "Unavailable"}
              icon={<TrendingUp className="h-5 w-5" />}
              status="info"
            />
            <StatCard
              label="30 days"
              value={revenueDataAvailable ? formatCents(month?.netCents ?? 0) : "Unavailable"}
              icon={<Receipt className="h-5 w-5" />}
              status="info"
            />
            <StatCard
              label="Avg order (30d)"
              value={!revenueDataAvailable ? "Unavailable" : month?.averageOrderCents == null ? "—" : formatCents(month.averageOrderCents)}
              icon={<WalletCards className="h-5 w-5" />}
              status="neutral"
            />
          </DashboardGrid>

          {revenueDataAvailable && revenue.daily.length > 0 ? (
            <DashboardCard padding="md">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.10em] text-muted-foreground">
                  Net revenue · last {revenue.daily.length} days
                </h3>
                <span className="text-xs text-muted-foreground">{formatCents(week?.netCents ?? 0)} this week</span>
              </div>
              <div className="flex items-end gap-1.5" style={{ height: 64 }}>
                {revenue.daily.map((day) => (
                  <div
                    key={day.dateKey}
                    className="flex flex-1 flex-col items-center justify-end gap-1"
                    title={`${day.label}: ${formatCents(day.netCents)} net · ${day.orderCount} order${day.orderCount === 1 ? "" : "s"}`}
                  >
                    <div
                      className={
                        day.netCents > 0
                          ? "w-full rounded-sm bg-primary/70"
                          : "w-full rounded-sm bg-muted-foreground/20"
                      }
                      style={{ height: `${Math.max(3, Math.round((Math.max(0, day.netCents) / maxDailyNet) * 52))}px` }}
                    />
                    <span className="text-[10px] tabular-nums text-muted-foreground">{day.orderCount}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          ) : null}
        </section>

        {/* Conversion: the funnel + the single biggest drop-off, named. */}
        <section aria-labelledby="conversion-heading" className="space-y-3">
          <h2 id="conversion-heading" className="text-sm font-semibold text-foreground">Conversion (30 days)</h2>
          <DashboardGrid columns={3} gap="md">
            <StatCard
              label="Started"
              value={funnel.started}
              icon={<Activity className="h-5 w-5" />}
              status="info"
            />
            <StatCard
              label="Paid"
              value={funnel.paid}
              icon={<CreditCard className="h-5 w-5" />}
              status="warning"
              trend={{ value: payRate, label: "of started" }}
            />
            <StatCard
              label="Approved"
              value={funnel.completed}
              icon={<CheckCircle className="h-5 w-5" />}
              status="success"
              trend={{ value: completeRate, label: "of paid" }}
            />
          </DashboardGrid>

          <DashboardCard padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Biggest drop-off</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Where the most intakes stall, from live PostHog step events.
                </p>
              </div>
              <StatusBadge status={intakeFunnelBadge} size="sm">
                {intakeFunnel.ok ? "PostHog live" : "No PostHog signal"}
              </StatusBadge>
            </div>

            {!intakeFunnel.ok ? (
              <div className="mt-4 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                {intakeFunnel.reason}
              </div>
            ) : worstStep ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">{formatStepId(worstStep.stepId)}</p>
                  <p className="text-xs text-muted-foreground">{worstStep.serviceLabel}</p>
                </div>
                <div className="text-sm">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {formatPercentValue(worstStep.completionRate)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    of {worstStep.viewed} who viewed it continue
                  </span>
                </div>
                {serverPayRate != null ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Pay → paid: <span className="font-medium text-foreground">{serverPayRate}%</span> (server-confirmed)
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                No step-level friction recorded in this window.
              </p>
            )}
          </DashboardCard>
        </section>

        {/* Where patients come from: self-reported + persisted AI-assistant UTM. */}
        <section aria-labelledby="acquisition-heading" className="space-y-3">
          <div>
            <h2 id="acquisition-heading" className="text-sm font-semibold text-foreground">
              Where patients came from
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Self-reported answers and persisted AI-assistant UTM signals.
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <DashboardCard padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">How did you hear about us? (30 days)</h3>
                </div>
                <StatusBadge status={heardAboutUs.answered > 0 ? "info" : "neutral"} size="sm">
                  {heardAboutUs.answered}/{heardAboutUs.paidTotal} answered
                </StatusBadge>
              </div>

              {heardAboutUs.answered === 0 ? (
                <p className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                  No self-reported answers yet.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {heardRows.map((row) => (
                    <div
                      key={row.value}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">{row.count}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">Answer rate: {answerRate}%</p>
                </div>
              )}
            </DashboardCard>

            <DashboardCard padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">AI assistants ({aiAttribution.weeks} weeks)</h3>
                </div>
                <StatusBadge status={aiAttribution.totalAiOrders > 0 ? "info" : "neutral"} size="sm">
                  {aiShare}% of paid
                </StatusBadge>
              </div>

              {aiAttribution.totalAiOrders === 0 ? (
                <p className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                  No AI-attributed paid orders yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    {aiAttribution.bySource.map((source) => (
                      <span key={source.label} className="inline-flex items-baseline gap-1.5">
                        <span className="font-semibold tabular-nums text-foreground">{source.count}</span>
                        <span className="text-muted-foreground">{source.label}</span>
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {aiAttribution.totalAiOrders}/{aiAttribution.paidTotal} paid orders
                    </span>
                  </div>

                  <div>
                    <div className="flex items-end gap-1.5">
                      {aiAttribution.weekly.map((weekly) => (
                        <div
                          key={weekly.weekStart}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`Week of ${weekly.weekStart}: ${weekly.chatgpt} ChatGPT order${weekly.chatgpt === 1 ? "" : "s"}`}
                        >
                          <div
                            className="w-full rounded-sm bg-primary/70"
                            style={{ height: `${Math.max(3, Math.round((weekly.chatgpt / maxWeeklyChatgpt) * 28))}px` }}
                          />
                          <span className="text-[10px] tabular-nums text-muted-foreground">{weekly.chatgpt}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">ChatGPT paid orders per week (oldest to newest)</p>
                  </div>
                </div>
              )}
            </DashboardCard>
          </div>
        </section>

        {/* Paid ads: compact + calm at trivial spend. Detail lives below. */}
        {googleAdsReturn ? (
          <section aria-labelledby="paid-ads-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 id="paid-ads-heading" className="text-sm font-semibold text-foreground">Google Ads</h2>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden="true" className={cn(
                    "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
                    googleAdsReturn.campaignState === "enabled" ? "bg-emerald-500" : "bg-amber-500",
                  )} />
                  {campaignStateLabel}
                </span>
              </div>
              <StatusBadge status={adsBadgeStatus} size="sm">
                {adsBadgeLabel}
              </StatusBadge>
            </div>

            <DashboardCard padding="md">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Spend {googleAdsReturn.range.days}d</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatAudDollars(googleAdsReturn.summary.spendAud)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Local orders</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{googleAdsReturn.summary.localOrders}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">CAC</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatAudDollars(googleAdsReturn.summary.costPerLocalOrderAud)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Net ROAS</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {formatRatio(googleAdsReturn.summary.localRoas)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Conversion uploads:{" "}
                  <span className="font-medium text-foreground">
                    {googleAdsStatus === "success"
                      ? "healthy"
                      : googleAdsStatus === "error"
                        ? "needs config"
                        : googleAdsStatus === "warning"
                          ? "watch"
                          : "no signal"}
                  </span>
                </span>
                <span>Last upload {formatNullableTime(googleAds.lastSuccessfulUploadAt)}</span>
                {adsMinimalSpend ? (
                  <span className="text-muted-foreground">ROAS is directional at this spend; keep the pilot bounded.</span>
                ) : null}
              </div>
            </DashboardCard>
          </section>
        ) : null}

        {/* ============================ DETAIL ============================ */}
        <details className="group rounded-xl border border-border/50 bg-white/60 dark:bg-card/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              Detailed metrics
              <span className="font-normal text-muted-foreground">
                — service mix, operating scorecard, campaigns, step friction, recovery, fulfilment
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          <div className="space-y-8 border-t border-border/50 px-4 py-5">
            {/* Revenue detail: service mix, payment pressure, recent orders. */}
            <section aria-labelledby="revenue-detail-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="revenue-detail-heading" className="text-sm font-semibold text-foreground">Revenue detail</h3>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link href={ADMIN_REFUNDS_HREF}>
                    Refunds
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <DashboardCard padding="md">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.10em] text-muted-foreground">Service mix (30d)</h4>
                    <span className="text-xs text-muted-foreground">By net revenue</span>
                  </div>
                  <div className="grid gap-2">
                    {!revenueDataAvailable ? (
                      <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Revenue data unavailable.</p>
                    ) : revenue.serviceMix.length > 0 ? (
                      revenue.serviceMix.map((service) => (
                        <div key={service.key} className="text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate font-medium text-foreground">{service.label}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {formatCents(service.netCents)} · {service.orderCount}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(2, Math.round(service.shareOfGross * 100))}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">No paid orders in this window.</p>
                    )}
                  </div>
                  {/* Monetisation readouts (2026-07-10 audit): the two levers
                      that were running blind — Express attach and the med-cert
                      duration mix behind the $27-AOV model target. */}
                  {revenueDataAvailable ? <div className="mt-4 space-y-2 border-t border-border/50 pt-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Express Review attach (30d)</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {revenue.monetisation.express.expressOrders}/{revenue.monetisation.express.paidOrders}
                        {" · "}
                        {revenue.monetisation.express.attachPct}%
                        {revenue.monetisation.express.feeGrossCents > 0
                          ? ` · ${formatCents(revenue.monetisation.express.feeGrossCents)}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Cert duration mix (30d)</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {revenue.monetisation.certDurationMix.length > 0
                          ? revenue.monetisation.certDurationMix
                              .map((tier) => `${tier.days}d ${tier.sharePct}%`)
                              .join(" · ")
                          : "No cert orders"}
                      </span>
                    </div>
                  </div> : null}
                </DashboardCard>

                <div className="space-y-3">
                  <DashboardGrid columns={2} gap="md">
                    <StatCard
                      label="Active drafts"
                      value={revenue.paymentFriction.activeDraftCount}
                      icon={<Activity className="h-5 w-5" />}
                      status={revenue.paymentFriction.activeDraftCount > 0 ? "info" : "neutral"}
                    />
                    <StatCard
                      label="Failed checkout"
                      value={revenue.paymentFriction.checkoutFailedCount}
                      icon={<AlertCircle className="h-5 w-5" />}
                      status={revenue.paymentFriction.checkoutFailedCount > 0 ? "error" : "success"}
                    />
                    <StatCard
                      label="Pending payment"
                      value={revenue.paymentFriction.pendingPaymentCount}
                      icon={<Clock className="h-5 w-5" />}
                      status={revenue.paymentFriction.pendingPaymentCount > 0 ? "warning" : "success"}
                    />
                    <StatCard
                      label="Refunded (30d)"
                      value={recoveryDataAvailable ? formatCents(revenue.refundWork.totalRefunded30dCents) : "Unavailable"}
                      icon={<Receipt className="h-5 w-5" />}
                      status={!recoveryDataAvailable ? "warning" : revenue.refundWork.failedRefunds > 0 ? "error" : "neutral"}
                    />
                  </DashboardGrid>

                  <DashboardCard padding="md">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.10em] text-muted-foreground">Recent paid orders</h4>
                    <div className="grid gap-1.5">
                      {!revenueDataAvailable ? (
                        <p className="text-xs text-muted-foreground">Revenue data unavailable.</p>
                      ) : revenue.recentPayments.length > 0 ? (
                        revenue.recentPayments.slice(0, 6).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate text-muted-foreground">
                              {payment.label} · {formatTimeAgo(payment.paidAt)}
                            </span>
                            <span className="shrink-0 tabular-nums text-foreground">{formatCents(payment.amountCents)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No recent paid orders.</p>
                      )}
                    </div>
                  </DashboardCard>
                </div>
              </div>
            </section>

            {businessScorecard ? (
              <section aria-labelledby="operating-scorecard-heading" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 id="operating-scorecard-heading" className="text-sm font-semibold text-foreground">Operating scorecard</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Live 30-day operations. Contribution stays blocked until active labour inputs are measured.</p>
                  </div>
                  <StatusBadge status={scorecardBadgeStatus(businessScorecard.capacityReviewState.status)} size="sm">
                    {businessScorecard.capacityReviewState.display}
                  </StatusBadge>
                </div>

                <DashboardGrid columns={4} gap="md">
                  <StatCard label="30d net retained" value={businessScorecard.rolling30DayNetRetainedCents.display} icon={<DollarSign className="h-5 w-5" />} status={scorecardStatus(businessScorecard.rolling30DayNetRetainedCents.status)} />
                  <StatCard label="Paid volume" value={businessScorecard.paidOrderVolume.display} icon={<CreditCard className="h-5 w-5" />} status={scorecardStatus(businessScorecard.paidOrderVolume.status)} />
                  <StatCard label="Refund rate" value={businessScorecard.refundRate.display} icon={<Receipt className="h-5 w-5" />} status={scorecardStatus(businessScorecard.refundRate.status)} />
                  <StatCard label="Chargeback rate" value={businessScorecard.chargebackRate.display} icon={<AlertCircle className="h-5 w-5" />} status={scorecardStatus(businessScorecard.chargebackRate.status)} />
                  <StatCard label="Support tickets/100 orders" value={businessScorecard.supportTicketsPer100Orders.display} icon={<Headphones className="h-5 w-5" />} status={scorecardStatus(businessScorecard.supportTicketsPer100Orders.status)} />
                  <StatCard label="Paid-to-decision average" value={businessScorecard.paidToDecisionMinutes.display} icon={<Clock className="h-5 w-5" />} status={scorecardStatus(businessScorecard.paidToDecisionMinutes.status)} />
                  <StatCard label="Doctor time per order" value={businessScorecard.doctorMinutesPerOrder.display} icon={<Timer className="h-5 w-5" />} status={scorecardStatus(businessScorecard.doctorMinutesPerOrder.status)} />
                  <StatCard label="Queue P95" value={businessScorecard.queueP95Minutes.display} icon={<Gauge className="h-5 w-5" />} status={scorecardStatus(businessScorecard.queueP95Minutes.status)} />
                </DashboardGrid>

                <DashboardCard padding="md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Contribution margin readiness</h4>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Paid-to-decision is elapsed clock time, including queue and waiting. It cannot stand in for hands-on doctor time.
                      </p>
                    </div>
                    <StatusBadge status="warning" size="sm">
                      {businessScorecard.contributionReadiness.display}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-xs font-medium text-foreground">
                    Do not scale paid acquisition from this metric yet.
                  </p>
                  <ul className="mt-2 grid gap-x-6 text-xs text-muted-foreground md:grid-cols-3">
                    {businessScorecard.contributionReadiness.blockers.map((blocker) => (
                      <li key={blocker} className="flex gap-2 border-t border-border/60 py-2">
                        <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{blocker}</span>
                      </li>
                    ))}
                  </ul>
                </DashboardCard>

                <DashboardCard padding="md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Capacity review</h4>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Tracks net-retained revenue, queue, and support conditions that require an operator capacity decision. Capacity state does not override the contribution block.
                      </p>
                    </div>
                    <StatusBadge status={scorecardBadgeStatus(businessScorecard.capacityReviewState.status)} size="sm">
                      {businessScorecard.capacityReviewState.display}
                    </StatusBadge>
                  </div>
                  {businessScorecard.capacityReviewState.triggeredBy.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                      {businessScorecard.capacityReviewState.triggeredBy.map((trigger) => (
                        <li key={trigger} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">{trigger}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">No capacity-review triggers active.</p>
                  )}
                </DashboardCard>
              </section>
            ) : null}

            {googleAdsReturn ? (
              <section aria-labelledby="google-ads-return-heading" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 id="google-ads-return-heading" className="text-sm font-semibold text-foreground">Paid acquisition revenue readout</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Google Ads spend joined to local net-retained paid-order revenue over {googleAdsReturn.range.days} days.</p>
                  </div>
                  <StatusBadge status={adsBadgeStatus} size="sm">{adsBadgeLabel}</StatusBadge>
                </div>

                <DashboardCard padding="md">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Local net revenue</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatAudDollars(googleAdsReturn.summary.localNetRevenueAud)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Paid intake revenue after local refund adjustments.</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">After refunds − ad spend</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatAudDollars(googleAdsReturn.summary.revenueAfterAdSpendAud)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Excludes payment fees and incremental doctor/support labour; not contribution or profit.</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Refunded</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatAudDollars(googleAdsReturn.summary.refundedAud)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Google-attributed refund amount in this window.</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-foreground">Campaigns by spend</h4>
                      <span className="text-xs text-muted-foreground">Local attribution only</span>
                    </div>
                    <div className="grid gap-2">
                      {googleAdsReturn.campaigns.length > 0 ? (
                        googleAdsReturn.campaigns.map((campaign) => (
                          <div key={campaign.campaignId} className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(80px,auto))]">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{campaign.campaignName}</p>
                              <p className="mt-1 truncate text-muted-foreground">{campaign.primaryServiceLabel}</p>
                            </div>
                            <div><p className="text-muted-foreground">Spend</p><p className="font-medium tabular-nums text-foreground">{formatAudDollars(campaign.spendAud)}</p></div>
                            <div><p className="text-muted-foreground">Orders</p><p className="font-medium tabular-nums text-foreground">{campaign.localOrders}</p></div>
                            <div><p className="text-muted-foreground">CAC</p><p className="font-medium tabular-nums text-foreground">{formatAudDollars(campaign.costPerLocalOrderAud)}</p></div>
                            <div><p className="text-muted-foreground">After ad spend</p><p className="font-medium tabular-nums text-foreground">{formatAudDollars(campaign.revenueAfterAdSpendAud)}</p></div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">No campaign spend rows in this window.</div>
                      )}
                    </div>
                  </div>
                </DashboardCard>
              </section>
            ) : null}

            {/* Full intake friction: per-service and per-step tables. */}
            <section aria-labelledby="intake-friction-heading" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="intake-friction-heading" className="text-sm font-semibold text-foreground">Intake friction</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Aggregate PostHog events over {intakeFunnelSummary.days} days.
                    {intakeFunnelSummary.totals.serverCheckoutToPaidRate != null ? (
                      <>
                        {" "}Trust <span className="font-medium text-foreground">Payment started (server) → Paid</span>{" "}
                        (<span className="font-medium text-foreground">{intakeFunnelSummary.totals.serverCheckoutToPaidRate}%</span>),
                        not checkout-viewed → paid ({intakeFunnelSummary.totals.checkoutToPaidRate ?? "–"}%).
                      </>
                    ) : null}
                  </p>
                </div>
                <StatusBadge status={intakeFunnelBadge} size="sm">
                  {intakeFunnel.ok ? "PostHog live" : "No PostHog signal"}
                </StatusBadge>
              </div>

              <DashboardCard padding="md">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {intakeFunnelSummary.stages.map((stage) => (
                    <div key={stage.key} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">{stage.label}</p>
                        <span className="text-xs text-muted-foreground">{stage.rateFromPrevious == null ? "baseline" : `${stage.rateFromPrevious}%`}</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{stage.count}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stage.dropOffFromPrevious == null ? "First recorded event." : `${stage.dropOffFromPrevious} drop-off from previous stage.`}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)]">
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.10em] text-muted-foreground">Services</h4>
                      <span className="text-xs text-muted-foreground">Start to checkout</span>
                    </div>
                    <div className="grid gap-2">
                      {intakeFunnelSummary.byService.slice(0, 5).length > 0 ? (
                        intakeFunnelSummary.byService.slice(0, 5).map((service) => (
                          <div key={`${service.serviceType}-${service.subtype ?? "base"}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-background/70 px-3 py-2 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{service.serviceLabel}</p>
                              <p className="mt-0.5 text-muted-foreground">{service.started} started, {service.checkoutViewed} checkout</p>
                            </div>
                            <p className="font-semibold tabular-nums text-foreground">{formatPercentValue(service.startToCheckoutRate)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">No service-level intake events in this window.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.10em] text-muted-foreground">Top step friction</h4>
                      <span className="text-xs text-muted-foreground">Viewed to completed</span>
                    </div>
                    <div className="grid gap-2">
                      {intakeFunnelSummary.stepFriction.slice(0, 5).length > 0 ? (
                        intakeFunnelSummary.stepFriction.slice(0, 5).map((step) => (
                          <div key={`${step.serviceType}-${step.subtype ?? "base"}-${step.stepId}-${step.stepIndex ?? "x"}`} className="grid gap-2 rounded-md bg-background/70 px-3 py-2 text-xs md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(62px,auto))]">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{formatStepId(step.stepId)}</p>
                              <p className="mt-0.5 truncate text-muted-foreground">{step.serviceLabel}</p>
                            </div>
                            <div><p className="text-muted-foreground">Viewed</p><p className="font-medium tabular-nums text-foreground">{step.viewed}</p></div>
                            <div><p className="text-muted-foreground">Continue</p><p className="font-medium tabular-nums text-foreground">{step.continueClicked}</p></div>
                            <div><p className="text-muted-foreground">Blocked</p><p className="font-medium tabular-nums text-foreground">{step.blocked}</p></div>
                            <div><p className="text-muted-foreground">Complete</p><p className="font-medium tabular-nums text-foreground">{formatPercentValue(step.completionRate)}</p></div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">No step-level friction rows in this window.</p>
                      )}
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </section>

            {recoveryScorecard ? (
              <section aria-labelledby="recovery-scorecard-heading" className="space-y-3">
                <div>
                  <h3 id="recovery-scorecard-heading" className="text-sm font-semibold text-foreground">Checkout recovery</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Partial-intake capture, recovery email coverage, and paid recovery over {recoveryScorecard.windowDays} days.</p>
                </div>

                <DashboardGrid columns={4} gap="md">
                  <StatCard label="Partial drafts" value={recoveryScorecard.captured} icon={<Activity className="h-5 w-5" />} status={recoveryScorecard.captured > 0 ? "info" : "neutral"} />
                  <StatCard label="Email capture" value={formatPercentValue(recoveryScorecard.emailCaptureRate)} icon={<MailCheck className="h-5 w-5" />} status={recoveryScorecard.emailCaptureRate == null ? "neutral" : recoveryScorecard.emailCaptureRate >= 60 ? "success" : "warning"} />
                  <StatCard label="Recovery sent" value={recoveryScorecard.emailed} icon={<Send className="h-5 w-5" />} status={recoveryScorecard.emailed > 0 ? "info" : "neutral"} />
                  <StatCard label="Recovered net" value={formatCents(recoveryScorecard.recoveredNetRevenueCents)} icon={<Receipt className="h-5 w-5" />} status={recoveryScorecard.recoveredNetRevenueCents > 0 ? "success" : "neutral"} />
                </DashboardGrid>
              </section>
            ) : null}

            {/* Google Ads upload health (full config detail). */}
            <section aria-labelledby="google-ads-health-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 id="google-ads-health-heading" className="text-sm font-semibold text-foreground">Google Ads upload health</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Server-side purchase uploads from paid Google-attributed intakes over {googleAds.lookbackDays} days.</p>
                </div>
                <StatusBadge status={googleAdsStatus} size="sm">
                  {googleAdsStatus === "success" ? "Uploading" : googleAdsStatus === "error" ? "Needs config" : googleAdsStatus === "warning" ? "Watch" : "No signal"}
                </StatusBadge>
              </div>

              <DashboardGrid columns={4} gap="md">
                <StatCard label="Captured" value={googleAds.captured} icon={<Megaphone className="h-5 w-5" />} status={googleAds.candidatesMissingClickId > 0 ? "warning" : "info"} trend={{ value: googleAds.captured > 0 ? Math.round((googleAds.candidatesWithClickId / googleAds.captured) * 100) : 0, label: "with click ID" }} />
                <StatCard label="Uploaded" value={googleAds.uploaded} icon={<UploadCloud className="h-5 w-5" />} status={googleAds.uploaded > 0 ? "success" : "neutral"} />
                <StatCard label="Skipped" value={googleAds.skipped} icon={<SkipForward className="h-5 w-5" />} status={googleAds.skipped > 0 ? "warning" : "success"} />
                <StatCard label="Failed" value={googleAds.failed} icon={<AlertCircle className="h-5 w-5" />} status={googleAds.failed > 0 ? "error" : "success"} />
              </DashboardGrid>

              <DashboardCard padding="md">
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Config check</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{googleAds.configuration.label}</p>
                    </div>
                    <StatusBadge status={googleAds.configuration.severity === "error" ? "error" : googleAds.configuration.severity === "warning" ? "warning" : "success"} size="sm">
                      {googleAds.configuration.severity}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{googleAds.configuration.detail}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">{googleAds.configuration.action}</p>
                </div>
              </DashboardCard>
            </section>

            {/* Prescription fulfilment (Parchment handoff). */}
            <section aria-labelledby="prescription-fulfilment-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 id="prescription-fulfilment-heading" className="text-sm font-semibold text-foreground">Prescription fulfilment</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Current Parchment handoff state for script-capable requests over {prescriptionFulfilment.lookbackDays} days.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={buildStaffLedgerHref({ status: "awaiting_script", workLane: "clinical" })}>
                      <Pill className="h-4 w-4" />
                      Script ledger
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={ADMIN_PARCHMENT_OPS_HREF}>
                      <ExternalLink className="h-4 w-4" />
                      Parchment ops
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-4">
                {prescriptionFulfilment.stages.map((stage) => {
                  const status = stageStatus({
                    count: stage.count,
                    emailFailedCount: stage.emailFailedCount,
                    oldestMinutes: stage.oldestMinutes,
                    slaBreachedCount: stage.slaBreachedCount,
                  })
                  const icon = {
                    approved_not_prescribed: <Pill className="h-4 w-4" />,
                    parchment_opened: <ExternalLink className="h-4 w-4" />,
                    webhook_received: <Webhook className="h-4 w-4" />,
                    patient_notified: <MailCheck className="h-4 w-4" />,
                  }[stage.key]

                  return (
                    <DashboardCard key={stage.key} padding="md" className="flex min-h-[250px] flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</span>
                            <h4 className="text-sm font-semibold text-foreground">{stage.label}</h4>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{stage.detail}</p>
                        </div>
                        <StatusBadge status={status} size="sm">{stage.count}</StatusBadge>
                      </div>

                      <div className="mt-4 border-t border-border/60 pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>Oldest: {formatMinutes(stage.oldestMinutes)}</span>
                          <span>SLA: {stage.slaMinutes == null ? "final" : formatMinutes(stage.slaMinutes)}</span>
                        </div>
                        {(stage.slaBreachedCount > 0 || stage.emailFailedCount > 0 || stage.emailPendingCount > 0) ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {stage.slaBreachedCount > 0 ? (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">{stage.slaBreachedCount} stale</span>
                            ) : null}
                            {stage.emailFailedCount > 0 ? (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">{stage.emailFailedCount} email failed</span>
                            ) : null}
                            {stage.emailPendingCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5" />
                                {stage.emailPendingCount} email pending
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-1 flex-col gap-2">
                        {stage.items.length > 0 ? (
                          stage.items.map((item) => {
                            const sourceLabel = confirmationSourceLabel(item.confirmationSource)
                            const notificationLabel = notificationStatusLabel(item.notificationStatus)

                            return (
                              <Link key={item.id} href={buildAdminIntakeHref(item.id)} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/50">
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                  <span className="min-w-0 truncate font-mono text-xs text-foreground">{item.referenceNumber}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{item.serviceLabel}</span>
                                  <span aria-hidden="true">/</span>
                                  <span>{item.stageAt ? formatTimeAgo(item.stageAt) : item.status || "No timestamp"}</span>
                                </div>
                                {(sourceLabel || notificationLabel) ? (
                                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    {sourceLabel ? (
                                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-blue-500 ring-1 ring-inset ring-black/5" />
                                        {sourceLabel}
                                      </span>
                                    ) : null}
                                    {notificationLabel ? (
                                      item.notificationStatus === "failed" ? (
                                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">{notificationLabel}</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                          <span aria-hidden="true" className={item.notificationStatus === "pending" ? "h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5" : "h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-1 ring-inset ring-black/5"} />
                                          {notificationLabel}
                                        </span>
                                      )
                                    ) : null}
                                  </div>
                                ) : null}
                              </Link>
                            )
                          })
                        ) : (
                          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">No cases in this state.</div>
                        )}
                      </div>
                    </DashboardCard>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{prescriptionFulfilment.total} fulfilment request{prescriptionFulfilment.total === 1 ? "" : "s"} in scope.</span>
                <span>{prescriptionFulfilment.webhookConfirmationCount} webhook confirmed.</span>
                <span>{prescriptionFulfilment.manualConfirmationCount} manual/PMS confirmed.</span>
                {prescriptionFulfilment.notificationFailedCount > 0 ? (
                  <span className="font-medium text-destructive">{prescriptionFulfilment.notificationFailedCount} script email failed.</span>
                ) : null}
                {prescriptionFulfilment.notificationPendingCount > 0 ? (
                  <span className="font-medium text-amber-700 dark:text-amber-300">{prescriptionFulfilment.notificationPendingCount} script email pending.</span>
                ) : null}
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link href={notificationIssueHref}>
                    <Send className="h-3 w-3" />
                    {prescriptionFulfilment.firstNotificationIssueStatus === "failed" ? "Open failed script email" : prescriptionFulfilment.firstNotificationIssueStatus === "pending" ? "Open pending script email" : "Email queue"}
                  </Link>
                </Button>
              </div>
            </section>

            <GeographicBreakdownCard breakdown={geographic} />

            <section aria-labelledby="queue-detail-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="queue-detail-heading" className="text-sm font-semibold text-foreground">Queue health</h3>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link href={STAFF_OPS_HREF}>Recovery ops <ExternalLink className="h-3 w-3" /></Link>
                </Button>
              </div>
              <DashboardGrid columns={3} gap="md">
                <StatCard label="Queue size" value={queueHealth.queueSize} icon={<Activity className="h-5 w-5" />} status={queueHealth.queueSize > 10 ? "error" : queueHealth.queueSize > 5 ? "warning" : "success"} />
                <StatCard label="Avg review" value={formatMinutes(queueHealth.avgReviewTimeMinutes)} icon={<Clock className="h-5 w-5" />} status={queueHealth.avgReviewTimeMinutes && queueHealth.avgReviewTimeMinutes > 120 ? "error" : "info"} />
                <StatCard label="Oldest waiting" value={formatMinutes(queueHealth.oldestInQueueMinutes)} icon={<Clock className="h-5 w-5" />} status={queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 240 ? "error" : queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 120 ? "warning" : "success"} />
              </DashboardGrid>
            </section>
          </div>
        </details>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
