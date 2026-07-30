"use client"

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  Gauge,
  MailCheck,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"

import { ReviewRequestFunnelCard } from "@/components/admin/review-request-funnel-card"
import {
  DashboardCard,
  StatusBadge,
  type StatusBadgeStatus,
} from "@/components/dashboard"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Button } from "@/components/ui/button"
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

function formatCount(value: number | null): string {
  return value === null ? "Unavailable" : value.toLocaleString("en-AU")
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

export function AnalyticsDashboardClient({ data }: { data: BusinessPageData }) {
  const { business, intakeFunnel, recordedAttribution, heardAboutUs, reviewRequestFunnel } = data
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
          <div className="grid divide-y divide-border/60 md:grid-cols-4 md:divide-y-0">
            <Metric
              label="30d net retained"
              value={formatAud(business.rolling30NetRetainedCents)}
              detail="Refund-adjusted paid orders"
              icon={<CircleDollarSign className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.rolling30NetRetainedCents)}
            />
            <Metric
              label="Paid orders"
              value={formatCount(business.paidOrders)}
              detail="Same rolling 30-day window"
              icon={<CreditCard className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.paidOrders)}
            />
            <Metric
              label="First-order contribution"
              value={formatAud(business.economics.firstOrderContributionCents)}
              detail="Ads-attributed net retained − Stripe fees − spend"
              icon={<BarChart3 className="h-3.5 w-3.5" aria-hidden />}
              tone={metricTone(business.economics.firstOrderContributionCents, true)}
            />
            <Metric
              label="Gate issues"
              value={business.reasonCodes.length.toLocaleString("en-AU")}
              detail="Truth or approval conditions"
              icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
              tone={business.reasonCodes.length > 0 ? "text-amber-700 dark:text-amber-300" : "text-foreground"}
            />
          </div>
          <div className="mt-1 grid gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-2 xl:grid-cols-5">
            <span><span className="text-muted-foreground">Ads diagnostic</span> <strong className="ml-1 text-foreground">{business.trackingState ?? "Unavailable"}</strong></span>
            <span><span className="text-muted-foreground">Spend</span> <strong className="ml-1 text-foreground">{formatAud(business.economics.spendCents)}</strong></span>
            <span><span className="text-muted-foreground">Stripe fees</span> <strong className="ml-1 text-foreground">{formatAud(business.economics.stripeFeeCents)}</strong></span>
            <span><span className="text-muted-foreground">CPA</span> <strong className="ml-1 text-foreground">{formatAud(business.economics.cpaCents)}</strong></span>
            <span><span className="text-muted-foreground">Net-retained ROAS</span> <strong className="ml-1 text-foreground">{formatRatio(business.economics.netRetainedRoas)}</strong></span>
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
