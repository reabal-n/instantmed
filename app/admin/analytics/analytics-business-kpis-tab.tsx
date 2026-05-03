"use client"

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  LifeBuoy,
  Mail,
  Megaphone,
  Repeat2,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"

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

  return (
    <div className="space-y-6">
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

      <DashboardCard tier="elevated" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Acquisition Tracking
              </h3>
              <Badge
                variant={data.acquisition.healthy ? "success" : "destructive"}
                className="ml-1"
              >
                {data.acquisition.healthy ? "Healthy" : "Attention"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Paid conversion attribution over the last{" "}
              {data.acquisition.windowDays} days
            </p>
          </div>

          {data.acquisition.alerts.length > 0 && (
            <div className="flex max-w-2xl flex-wrap gap-2">
              {data.acquisition.alerts.map((alert) => (
                <Badge key={alert} variant="outline" className="text-xs">
                  {formatAcquisitionAlert(alert)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-5">
          <AcquisitionStat
            label="Paid intakes"
            value={data.acquisition.paidIntakes.toLocaleString()}
          />
          <AcquisitionStat
            label="Paid revenue"
            value={formatAUD(data.acquisition.paidRevenue)}
          />
          <AcquisitionStat
            label="Google click IDs"
            value={data.acquisition.paidWithGoogleClickId.toLocaleString()}
          />
          <AcquisitionStat
            label="UTM sourced"
            value={data.acquisition.paidWithUtmSource.toLocaleString()}
          />
          <AcquisitionStat
            label="Unknown paid"
            value={data.acquisition.unknownPaidIntakes.toLocaleString()}
            tone={data.acquisition.unknownPaidIntakes > 0 ? "risk" : "normal"}
          />
        </div>

        {data.acquisition.googleAds && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm">
            <span className="text-muted-foreground">
              Google Ads clicks:{" "}
              <strong className="font-semibold text-foreground">
                {data.acquisition.googleAds.clicks.toLocaleString()}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Impressions:{" "}
              <strong className="font-semibold text-foreground">
                {data.acquisition.googleAds.impressions.toLocaleString()}
              </strong>
            </span>
            <span className="text-muted-foreground">
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
      </DashboardCard>

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
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "risk" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function formatAcquisitionAlert(alert: string) {
  const labels: Record<string, string> = {
    acquisition_health_unavailable: "Acquisition health unavailable",
    google_ads_clicks_but_no_paid_click_ids:
      "Google Ads clicks missing paid click IDs",
    google_ads_reporting_not_configured: "Google Ads reporting not configured",
    google_ads_reporting_unavailable: "Google Ads reporting unavailable",
    paid_attribution_unknown_over_50_percent:
      "Unknown paid attribution over 50%",
  }

  return labels[alert] || alert.replaceAll("_", " ")
}
