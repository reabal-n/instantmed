"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  LifeBuoy,
  Mail,
  Repeat2,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import type { BusinessKPIData } from "@/lib/data/business-kpi"
import { formatAUD, formatCurrency, formatMinutes } from "@/lib/format"
import { cn } from "@/lib/utils"

const readinessLabels: Record<string, string> = {
  hasRevenue: "Revenue flowing",
  hasCertificates: "Certificates issuing",
  slaHealthy: "No SLA breaches",
  emailHealthy: "Email delivery 95%+",
  doctorsActive: "Doctors active",
  queueManageable: "Queue under control",
  refundRateLow: "Refund rate < 10%",
  acquisitionTracked: "Acquisition tracked",
  chargebackRateLow: "Chargebacks < 0.5%",
  supportLoadHealthy: "Support load <= 5/100 orders",
}

const ANNUAL_GROSS_TARGET = 1_000_000
const MONTHLY_GROSS_TARGET = Math.round(ANNUAL_GROSS_TARGET / 12)

const scaleGateLabels: Record<
  keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"],
  {
    actionHref: string
    actionLabel: string
    label: string
    target: string
  }
> = {
  unknownAttributionRate: {
    actionHref: "#scorecard-attribution",
    actionLabel: "Review attribution",
    label: "Unknown attribution",
    target: "<= 20%",
  },
  refundRate: {
    actionHref: "/admin/refunds",
    actionLabel: "Open refunds",
    label: "Refund rate",
    target: "< 8%",
  },
  chargebackRate: {
    actionHref: "/admin/finance",
    actionLabel: "Open finance",
    label: "Chargeback rate",
    target: "< 0.5%",
  },
  aov: {
    actionHref: "/admin/services",
    actionLabel: "Review services",
    label: "AOV",
    target: ">= $35",
  },
  grossRevenue: {
    actionHref: "/admin/analytics?tab=revenue",
    actionLabel: "Open revenue",
    label: "30d gross",
    target: ">= $10k",
  },
}

const scaleGateActionLabels: Record<
  keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"],
  string
> = {
  unknownAttributionRate:
    "Fix UTM, landing-page, and click-ID capture before adding spend.",
  refundRate: "Find the service or promise causing refund pressure.",
  chargebackRate: "Triage disputes before testing higher acquisition volume.",
  aov: "Shift mix toward scripts, consults, and priority add-ons before scaling.",
  grossRevenue: "Keep organic and direct demand moving until the baseline is stronger.",
}

/**
 * Business KPIs tab inside /admin/analytics.
 *
 * Phase 4 of the doctor + admin portal rebuild (2026-04-29). Lifted
 * from the standalone /admin/business-kpi page so the Analytics Hub
 * is the single canonical entry for business intelligence. The old
 * route now redirects to /admin/analytics?tab=business-kpis.
 *
 * Differs from the old standalone page in two ways:
 *   1. No outer Heading/Refresh — the analytics-client wrapper
 *      provides those at the page level.
 *   2. Cards use the canonical <DashboardCard> primitive instead of
 *      shadcn <Card>, matching the rest of the analytics tabs.
 */
export function AnalyticsBusinessKPIsTab({ data }: { data: BusinessKPIData }) {
  const scaleScore = data.scorecard.scaleReadiness.score
  const scaleGateEntries = Object.entries(
    data.scorecard.scaleReadiness.gates,
  ) as Array<
    [
      keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"],
      BusinessKPIData["scorecard"]["scaleReadiness"]["gates"][keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"]],
    ]
  >
  const failedScaleGates = scaleGateEntries.filter(([, gate]) => !gate.passed)
  const scoreStatus =
    scaleScore >= 80
      ? "Ready to test"
      : scaleScore >= 60
        ? "Tighten first"
        : "Do not scale yet"
  const topService = data.scorecard.paidOrdersByService[0]
  const reviewP95Risk = (data.scorecard.reviewTime.p95Minutes || 0) > 120

  const readinessColor =
    data.launchReadiness.score >= 85
      ? "text-success"
      : data.launchReadiness.score >= 60
        ? "text-warning"
        : "text-destructive"

  const readinessBg =
    data.launchReadiness.score >= 85
      ? "bg-success-light border-success-border/40"
      : data.launchReadiness.score >= 60
        ? "bg-warning-light border-warning-border/40"
        : "bg-destructive/10 border-destructive/30"
  const annualizedGrossRunRate = data.revenue.thisMonth * 12
  const runRateProgress = Math.min(
    100,
    Math.round((annualizedGrossRunRate / ANNUAL_GROSS_TARGET) * 100),
  )
  const monthlyGap = Math.max(0, MONTHLY_GROSS_TARGET - data.revenue.thisMonth)
  const targetStatus =
    annualizedGrossRunRate >= ANNUAL_GROSS_TARGET
      ? "On $1M+ run-rate"
      : annualizedGrossRunRate >= ANNUAL_GROSS_TARGET * 0.6
        ? "Closing the gap"
        : "Too early to scale hard"

  return (
    <div className="space-y-6">
      <DashboardCard id="one-million-run-rate" tier="elevated" padding="lg">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={runRateProgress >= 100 ? "success" : "warning"}>
                Founder target
              </Badge>
              <span className="text-sm font-medium text-muted-foreground">
                $1M annual gross run-rate
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {formatAUD(annualizedGrossRunRate)}
              </p>
              <p className="pb-1 text-sm text-muted-foreground">
                annualized from the last 30 days
              </p>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  runRateProgress >= 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${Math.max(runRateProgress, 2)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {targetStatus}. Current 30-day gross is {formatAUD(data.revenue.thisMonth)}.
              Monthly target is {formatAUD(MONTHLY_GROSS_TARGET)}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <RunRateMetric
              label="Run-rate progress"
              value={`${runRateProgress}%`}
              detail="Against $1M annual gross"
              tone={runRateProgress >= 100 ? "success" : "normal"}
            />
            <RunRateMetric
              label="Monthly gap"
              value={formatAUD(monthlyGap)}
              detail={monthlyGap === 0 ? "Target covered" : "More 30-day gross needed"}
              tone={monthlyGap === 0 ? "success" : "risk"}
            />
            <RunRateMetric
              label="Orders this month"
              value={data.unitEconomics.paidOrdersMonth.toLocaleString()}
              detail={`AOV ${formatCurrency(Math.round(data.unitEconomics.aov * 100))}`}
            />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        id="business-scorecard"
        tier="elevated"
        padding="lg"
        className="scroll-mt-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Daily Business Scorecard
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              30-day growth gates, daily sales, attribution, and fulfilment in
              one operator view
            </p>
          </div>
          <div className="border-t border-border/60 pt-4 lg:min-w-56 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="text-sm text-muted-foreground">Scale readiness</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className={cn(
                  "text-3xl font-semibold tabular-nums tracking-tight",
                  scaleScore >= 80
                    ? "text-success"
                    : scaleScore >= 60
                      ? "text-warning"
                      : "text-destructive",
                )}
              >
                {scaleScore}%
              </span>
              <Badge variant={scaleScore >= 80 ? "success" : "warning"}>
                {scoreStatus}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Serious paid scaling only after the gates are stable.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-muted/40 p-4 dark:bg-white/[0.04]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScorecardMetric
              label="Today"
              value={formatAUD(data.scorecard.today.grossRevenue)}
              detail={`${data.scorecard.today.paidOrders.toLocaleString()} paid orders`}
            />
            <ScorecardMetric
              label="Today AOV"
              value={formatCurrency(Math.round(data.scorecard.today.aov * 100))}
              detail="Same-day order quality"
            />
            <ScorecardMetric
              label="30d gross"
              value={formatAUD(data.revenue.thisMonth)}
              detail="Target before scaling: $10k"
            />
            <ScorecardMetric
              label="Top service"
              value={
                topService
                  ? formatServiceLabel(topService.category, topService.subtype)
                  : "No paid orders"
              }
              detail={
                topService
                  ? `${topService.paidOrders} paid in 30d`
                  : "Current window"
              }
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">30-day growth gates</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  The few numbers that decide whether acquisition should scale.
                </p>
              </div>
              {failedScaleGates.length > 0 && (
                <Badge variant="outline" className="shrink-0">
                  {failedScaleGates.length} to fix
                </Badge>
              )}
            </div>
            <div className="mt-4 divide-y divide-border/50">
              {scaleGateEntries.map(([key, gate]) => (
                <ScaleGateRow key={key} gateKey={key} gate={gate} />
              ))}
            </div>
          </section>

          <section className="border-t border-border/60 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h4 className="text-sm font-semibold text-foreground">What needs attention</h4>
            {failedScaleGates.length === 0 ? (
              <p className="mt-3 rounded-lg bg-success-light px-3 py-2 text-sm text-success dark:bg-success/10">
                All scale gates are passing. Keep spend controlled and watch
                tomorrow&apos;s refund and attribution movement.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {failedScaleGates.slice(0, 3).map(([key, gate]) => (
                  <div
                    key={key}
                    className="rounded-lg bg-destructive/5 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {scaleGateLabels[key].label}:{" "}
                      <span className="tabular-nums text-destructive">
                        {formatGateValue(key, gate.value)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {scaleGateActionLabels[key]}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <MiniMetric
                label="Review P95"
                value={formatMinutes(data.scorecard.reviewTime.p95Minutes)}
                tone={reviewP95Risk ? "risk" : "normal"}
              />
              <MiniMetric
                label="Fulfilled"
                value={`${data.scorecard.fulfillment.fulfillmentRate}%`}
                tone={
                  data.scorecard.fulfillment.missingOrders > 0
                    ? "risk"
                    : "normal"
                }
              />
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 border-t border-border/60 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <ScorecardPanel title="Paid orders by service">
            {data.scorecard.paidOrdersByService.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No paid orders in the current window.
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {data.scorecard.paidOrdersByService.slice(0, 6).map((service) => (
                  <div
                    key={`${service.category}:${service.subtype || ""}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium capitalize text-foreground">
                        {formatServiceLabel(service.category, service.subtype)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Today {service.paidOrdersToday} paid · AOV{" "}
                        {formatCurrency(Math.round(service.aov * 100))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-foreground">
                        {service.paidOrders}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAUD(service.grossRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScorecardPanel>

          <div className="space-y-6">
            <ScorecardPanel title="Attribution quality" id="scorecard-attribution">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <MiniMetric
                  label="Unknown"
                  value={`${data.scorecard.attribution.unknownRate}%`}
                  tone={
                    data.scorecard.attribution.unknownRate > 20
                      ? "risk"
                      : "normal"
                  }
                />
                <MiniMetric
                  label="UTM"
                  value={data.scorecard.attribution.utmSourcedOrders.toLocaleString()}
                />
                <MiniMetric
                  label="Click IDs"
                  value={data.scorecard.attribution.clickIdOrders.toLocaleString()}
                />
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Top source</p>
                <p className="truncate text-sm font-medium text-foreground">
                  {data.scorecard.attribution.topSources[0]
                    ? `${data.scorecard.attribution.topSources[0].source} · ${data.scorecard.attribution.topSources[0].paidOrders} paid`
                    : "No source data"}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Top landing page
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                  {data.scorecard.attribution.topLandingPages[0]
                    ? `${data.scorecard.attribution.topLandingPages[0].landingPage} · ${data.scorecard.attribution.topLandingPages[0].paidOrders} paid`
                    : "No landing-page data"}
                </p>
              </div>
            </ScorecardPanel>

            <details
              id="acquisition-diagnostics"
              className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm dark:bg-white/[0.04]"
            >
              <summary className="cursor-pointer font-medium text-foreground">
                Attribution diagnostics
              </summary>
              {data.acquisition.alerts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.acquisition.alerts.map((alert) => (
                    <Badge key={alert} variant="outline" className="text-xs">
                      {formatAcquisitionAlert(alert)}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <AcquisitionStat
                  label="Paid intakes"
                  value={data.acquisition.paidIntakes.toLocaleString()}
                />
                <AcquisitionStat
                  label="Paid revenue"
                  value={formatAUD(data.acquisition.paidRevenue)}
                />
                <AcquisitionStat
                  label="UTM sourced"
                  value={data.acquisition.paidWithUtmSource.toLocaleString()}
                />
                <AcquisitionStat
                  label="Stored source"
                  value={data.acquisition.paidWithReferrerOrLandingPage.toLocaleString()}
                />
                <AcquisitionStat
                  label="Google click IDs"
                  value={data.acquisition.paidWithGoogleClickId.toLocaleString()}
                />
                <AcquisitionStat
                  label="Google missing IDs"
                  value={data.acquisition.paidLikelyGoogleWithoutClickId.toLocaleString()}
                  tone={
                    data.acquisition.paidLikelyGoogleWithoutClickId > 0
                      ? "risk"
                      : "normal"
                  }
                />
                <AcquisitionStat
                  label="Unknown paid"
                  value={data.acquisition.unknownPaidIntakes.toLocaleString()}
                  tone={
                    data.acquisition.unknownPaidIntakes > 0 ? "risk" : "normal"
                  }
                />
              </div>
              {data.acquisition.googleAds && (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>
                    Google Ads clicks:{" "}
                    <strong className="font-semibold text-foreground">
                      {data.acquisition.googleAds.clicks.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Cost:{" "}
                    <strong className="font-semibold text-foreground">
                      {formatAUD(data.acquisition.googleAds.cost)}
                    </strong>
                  </span>
                  {data.acquisition.googleAds.error && (
                    <span className="font-medium text-destructive">
                      {formatAcquisitionAlert(data.acquisition.googleAds.error)}
                    </span>
                  )}
                </div>
              )}
            </details>

            <ScorecardPanel title="Ops conversion health">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <MiniMetric
                  label="Review median"
                  value={formatMinutes(data.scorecard.reviewTime.medianMinutes)}
                />
                <MiniMetric
                  label="Review P95"
                  value={formatMinutes(data.scorecard.reviewTime.p95Minutes)}
                  tone={reviewP95Risk ? "risk" : "normal"}
                />
                <MiniMetric
                  label="Fulfilled"
                  value={`${data.scorecard.fulfillment.fulfillmentRate}%`}
                  tone={
                    data.scorecard.fulfillment.missingOrders > 0
                      ? "risk"
                      : "normal"
                  }
                />
                <MiniMetric
                  label="Repeat customers"
                  value={`${data.scorecard.repeatCustomers.repeatCustomerRate}%`}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {data.scorecard.fulfillment.fulfilledOrders}/
                {data.scorecard.fulfillment.eligiblePaidOrders} paid cert/script
                orders fulfilled · {data.scorecard.repeatCustomers.repeatCustomers}
                /{data.scorecard.repeatCustomers.currentCustomers} current
                customers repeat
              </p>
            </ScorecardPanel>
          </div>
        </div>
      </DashboardCard>

      {/* Launch Readiness Scorecard */}
      <div
        className={cn(
          "rounded-xl border p-6",
          readinessBg,
        )}
      >
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-foreground" aria-hidden />
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Launch Readiness
          </h3>
          <span
            className={cn(
              "ml-auto text-3xl font-semibold tabular-nums",
              readinessColor,
            )}
          >
            {data.launchReadiness.score}%
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          System health aggregation across operator scale indicators
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(data.launchReadiness.checks).map(([key, passed]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              {passed ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span
                className={
                  passed ? "text-muted-foreground" : "font-medium text-foreground"
                }
              >
                {readinessLabels[key] || key}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue (30d)"
          value={formatAUD(data.revenue.thisMonth)}
          icon={DollarSign}
          footer={
            <>
              <div className="flex items-center gap-1 text-xs">
                {data.revenue.weeklyTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span
                  className={
                    data.revenue.weeklyTrend >= 0 ? "text-success" : "text-destructive"
                  }
                >
                  {data.revenue.weeklyTrend >= 0 ? "+" : ""}
                  {data.revenue.weeklyTrend}%
                </span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Today: {formatAUD(data.revenue.today)} · Week:{" "}
                {formatAUD(data.revenue.thisWeek)}
              </p>
            </>
          }
        />

        <KpiCard
          label="Med Certs Issued"
          value={data.certs.thisWeek.toLocaleString()}
          icon={FileText}
          footer={
            <>
              <p className="text-xs text-muted-foreground">This week</p>
              <p className="text-xs text-muted-foreground">
                Today: {data.certs.today}
              </p>
            </>
          }
        />

        <KpiCard
          label="Avg Payment to Delivery"
          value={formatMinutes(data.sla.avgMinutes) ?? "—"}
          icon={Clock}
          footer={
            <>
              <p className="text-xs">
                {data.sla.breaches > 0 ? (
                  <span className="font-medium text-destructive">
                    {data.sla.breaches} SLA breach
                    {data.sla.breaches !== 1 ? "es" : ""}
                  </span>
                ) : (
                  <span className="text-success">No SLA breaches</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.sla.queueSize} in queue
              </p>
            </>
          }
        />

        <KpiCard
          label="Doctor Utilization"
          value={`${data.doctors.utilizationRate}%`}
          icon={Users}
          footer={
            <>
              <p className="text-xs text-muted-foreground">
                {data.doctors.active} active doctor
                {data.doctors.active !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.doctors.reviewsThisWeek} reviews this week
              </p>
            </>
          }
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Email Delivery Rate"
          value={`${data.email.deliveryRate}%`}
          icon={Mail}
          footer={
            <p className="text-xs text-muted-foreground">
              {data.email.sentThisWeek} sent this week
              {data.email.failedThisWeek > 0 && (
                <span className="text-destructive">
                  {" "}
                  · {data.email.failedThisWeek} failed
                </span>
              )}
            </p>
          }
        />

        <KpiCard
          label="Intake → Payment Rate"
          value={`${data.funnel.conversionRate}%`}
          icon={Target}
          footer={
            <p className="text-xs text-muted-foreground">
              {data.funnel.paid} paid of {data.funnel.started} started (30d)
            </p>
          }
        />

        <KpiCard
          label="Refund Rate"
          value={`${data.refunds.rate}%`}
          icon={AlertTriangle}
          footer={
            <p className="text-xs text-muted-foreground">
              {formatAUD(data.refunds.totalMonth)} refunded this month
            </p>
          }
        />
      </div>

      {/* Unit economics + scale risk */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="AOV"
          value={formatCurrency(Math.round(data.unitEconomics.aov * 100))}
          icon={CreditCard}
          footer={
            <p className="text-xs text-muted-foreground">
              {data.unitEconomics.paidOrdersMonth} paid orders in 30d
            </p>
          }
        />

        <KpiCard
          label="Chargeback Rate"
          value={`${data.risk.chargebackRate}%`}
          icon={Shield}
          footer={
            <p className="text-xs text-muted-foreground">
              {data.risk.chargebacksMonth} dispute
              {data.risk.chargebacksMonth !== 1 ? "s" : ""} in 30d
              {data.risk.activeDisputes > 0 && (
                <span className="text-destructive">
                  {" "}
                  · {data.risk.activeDisputes} active
                </span>
              )}
            </p>
          }
        />

        <KpiCard
          label="Support Load"
          value={`${data.risk.supportTicketsPer100Orders}/100`}
          icon={LifeBuoy}
          footer={
            <p className="text-xs text-muted-foreground">
              {data.risk.supportTicketsMonth} tickets in 30d
              {data.risk.openSupportTickets > 0 && (
                <span>
                  {" "}
                  · {data.risk.openSupportTickets} open
                </span>
              )}
              {data.risk.highPrioritySupportTickets > 0 && (
                <span className="text-destructive">
                  {" "}
                  · {data.risk.highPrioritySupportTickets} high priority
                </span>
              )}
            </p>
          }
        />

        <KpiCard
          label="Repeat Paid Orders"
          value={`${data.unitEconomics.repeatOrderRate}%`}
          icon={Repeat2}
          footer={
            <p className="text-xs text-muted-foreground">
              {data.unitEconomics.repeatPaidOrders} repeat paid order
              {data.unitEconomics.repeatPaidOrders !== 1 ? "s" : ""} in 30d
            </p>
          }
        />
      </div>

      {/* Revenue Trend + Conversion Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard tier="elevated" padding="lg">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Daily Revenue (30 days)
            </h3>
          </div>
          <div className="space-y-1">
            {data.revenue.daily.map((day) => {
              const maxRevenue = Math.max(
                ...data.revenue.daily.map((d) => d.revenue),
                1,
              )
              const pct = (day.revenue / maxRevenue) * 100
              const label = day.date.slice(5)
              return (
                <div
                  key={day.date}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="w-12 shrink-0 text-muted-foreground">
                    {label}
                  </span>
                  <div className="h-3 flex-1 rounded-full bg-secondary">
                    <div
                      className="h-3 rounded-full bg-success transition-[width]"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-muted-foreground">
                    {day.revenue > 0 ? formatAUD(day.revenue) : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        </DashboardCard>

        <DashboardCard tier="elevated" padding="lg">
          <div className="mb-1 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Conversion Funnel (30 days)
            </h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            From page views to approved certificates
          </p>
          <div className="space-y-4">
            {[
              { step: "Page Views / Sessions", value: data.funnel.pageViews },
              { step: "Intakes Started", value: data.funnel.started },
              { step: "Payment Completed", value: data.funnel.paid },
              { step: "Doctor Approved", value: data.funnel.approved },
            ].map((item, idx, arr) => {
              const maxVal = Math.max(arr[0].value, 1)
              const pct = (item.value / maxVal) * 100
              const dropOff =
                idx > 0 && arr[idx - 1].value > 0
                  ? Math.round(
                      ((arr[idx - 1].value - item.value) / arr[idx - 1].value) *
                        100,
                    )
                  : 0
              return (
                <div key={item.step} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.step}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">
                        {item.value.toLocaleString()}
                      </span>
                      {idx > 0 && dropOff > 0 && (
                        <span className="text-xs text-destructive">
                          -{dropOff}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-full bg-secondary">
                    <div
                      className="h-3 rounded-full bg-primary transition-[width]"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </DashboardCard>
      </div>

      {/* Top Referral Sources */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard tier="elevated" padding="lg">
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Top Referral Sources (30 days)
            </h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Where your paid intakes are coming from
          </p>
          {data.referrals.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No UTM-tagged traffic recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {data.referrals.map((ref, idx) => {
                const maxCount = data.referrals[0]?.count || 1
                const pct = (ref.count / maxCount) * 100
                return (
                  <div key={ref.source} className="flex items-center gap-3">
                    <span className="w-6 text-right text-sm text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <span className="w-32 truncate text-sm font-medium text-foreground">
                      {ref.source}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {ref.count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard tier="elevated" padding="lg">
          <div className="mb-1 flex items-center gap-2">
            <Repeat2 className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Repeat Usage by Service (30 days)
            </h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Repeat paid orders inside the current 30-day window
          </p>
          {data.serviceRepeatUsage.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No paid service usage recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {data.serviceRepeatUsage.map((service) => (
                <div key={service.category} className="flex items-center gap-3">
                  <span className="w-36 truncate text-sm font-medium capitalize text-foreground">
                    {service.category.replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(service.repeatRate, 2)}%` }}
                    />
                  </div>
                  <div className="w-28 text-right text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {service.repeatRate}%
                    </span>{" "}
                    ({service.repeatPaidOrders}/{service.paidOrders})
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  footer?: React.ReactNode
}

function KpiCard({ label, value, icon: Icon, footer }: KpiCardProps) {
  return (
    <DashboardCard tier="standard" padding="md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {footer && <div className="mt-2 space-y-0.5">{footer}</div>}
    </DashboardCard>
  )
}

function ScorecardPanel({
  children,
  id,
  title,
}: {
  children: React.ReactNode
  id?: string
  title: string
}) {
  return (
    <div id={id} className={id ? "scroll-mt-6" : undefined}>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function ScorecardMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function RunRateMetric({
  detail,
  label,
  tone = "normal",
  value,
}: {
  detail: string
  label: string
  tone?: "normal" | "risk" | "success"
  value: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 dark:bg-white/[0.04]">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "risk"
            ? "text-destructive"
            : tone === "success"
              ? "text-success"
              : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function ScaleGateRow({
  gate,
  gateKey,
}: {
  gateKey: keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"]
  gate: BusinessKPIData["scorecard"]["scaleReadiness"]["gates"][keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"]]
}) {
  const meta = scaleGateLabels[gateKey]

  return (
    <div className="grid gap-3 py-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="flex items-start gap-3">
        {gate.passed ? (
          <CheckCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-success"
            aria-hidden
          />
        ) : (
          <XCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden
          />
        )}
        <div>
          <p className="font-medium text-foreground">{meta.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Target {meta.target}
          </p>
        </div>
      </div>
      <p
        className={cn(
          "tabular-nums sm:text-right",
          gate.passed
            ? "font-medium text-foreground"
            : "font-semibold text-destructive",
        )}
      >
        {formatGateValue(gateKey, gate.value)}
      </p>
      {gate.passed ? (
        <Badge variant="success" className="w-fit">
          On track
        </Badge>
      ) : (
        <Link
          href={meta.actionHref}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {meta.actionLabel}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  )
}

function MiniMetric({
  label,
  tone = "normal",
  value,
}: {
  label: string
  tone?: "normal" | "risk"
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "risk" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function AcquisitionStat({
  label,
  value,
  tone = "normal",
}: {
  label: string
  value: string
  tone?: "normal" | "risk"
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums tracking-tight",
          tone === "risk" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function formatServiceLabel(category: string, subtype: string | null) {
  const base = category.replace(/_/g, " ")
  return subtype ? `${base} / ${subtype.replace(/_/g, " ")}` : base
}

function formatGateValue(
  gateKey: keyof BusinessKPIData["scorecard"]["scaleReadiness"]["gates"],
  value: number,
) {
  if (gateKey === "aov" || gateKey === "grossRevenue") {
    return formatCurrency(Math.round(value * 100))
  }

  return `${value}%`
}

function formatAcquisitionAlert(alert: string) {
  const labels: Record<string, string> = {
    acquisition_health_unavailable: "Acquisition health unavailable",
    google_ads_clicks_but_no_paid_click_ids:
      "Google Ads clicks missing paid click IDs",
    paid_google_attribution_missing_click_ids:
      "Google-sourced paid rows missing click IDs",
    google_ads_reporting_not_configured: "Google Ads reporting not configured",
    google_ads_reporting_unavailable: "Google Ads reporting unavailable",
    paid_attribution_unknown_over_50_percent:
      "Unknown paid attribution over 50%",
  }

  return labels[alert] || alert.replaceAll("_", " ")
}
