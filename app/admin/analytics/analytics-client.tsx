"use client"

import {
  Activity,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Gauge,
  Headphones,
  MailCheck,
  Megaphone,
  Pill,
  Receipt,
  Send,
  SkipForward,
  Timer,
  TrendingUp,
  UploadCloud,
  UserPlus,
  WalletCards,
  Webhook,
} from "lucide-react"
import Link from "next/link"

import { GeographicBreakdownCard } from "@/components/admin/geographic-breakdown-card"
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
  buildAdminIntakeHref,
  buildStaffEmailHubHref,
  buildStaffLedgerHref,
  STAFF_DASHBOARD_HREF,
} from "@/lib/dashboard/routes"
import type { GeographicBreakdown } from "@/lib/data/analytics-geographic"
import { formatCurrency, formatMinutes, formatTimeAgo } from "@/lib/format"

import { type AnalyticsData } from "./analytics-helpers"

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
  geographic: GeographicBreakdown
}

function formatNullableTime(value: string | null): string {
  return value ? formatTimeAgo(value) : "Not recorded"
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

type BusinessScorecardStatus = NonNullable<AnalyticsData["businessScorecard"]>["monthlyGrossCents"]["status"]

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

export function AnalyticsDashboardClient({
  analytics,
  geographic,
}: AnalyticsDashboardClientProps) {
  const { businessScorecard, funnel, googleAds, prescriptionFulfilment, revenue, queueHealth } = analytics
  const payRate = funnel.started > 0 ? Math.round((funnel.paid / funnel.started) * 100) : 0
  const completeRate = funnel.paid > 0 ? Math.round((funnel.completed / funnel.paid) * 100) : 0
  const googleAdsStatus = uploadHealthStatus(googleAds)
  const notificationIssueHref = prescriptionFulfilment.firstNotificationIssueIntakeId
    ? buildStaffEmailHubHref({
        tab: "queue",
        intakeId: prescriptionFulfilment.firstNotificationIssueIntakeId,
      })
    : buildStaffEmailHubHref({ tab: "queue" })

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Analytics"
        description="Revenue, conversion, and queue health. Deeper product analysis stays in PostHog."
        backHref={STAFF_DASHBOARD_HREF}
        backLabel="Staff cockpit"
        actions={
          <Button variant="outline" asChild>
            <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open PostHog
            </a>
          </Button>
        }
      />

      <OperatorScrollArea>
        <section aria-labelledby="revenue-heading" className="space-y-3">
          <h2 id="revenue-heading" className="text-sm font-semibold text-foreground">Revenue</h2>
          <DashboardGrid columns={3} gap="md">
            <StatCard
              label="Today"
              value={formatCurrency(revenue.today)}
              icon={<DollarSign className="h-5 w-5" />}
              status="success"
            />
            <StatCard
              label="7 days"
              value={formatCurrency(revenue.thisWeek)}
              icon={<TrendingUp className="h-5 w-5" />}
              status="info"
            />
            <StatCard
              label="30 days"
              value={formatCurrency(revenue.thisMonth)}
              icon={<Receipt className="h-5 w-5" />}
              status="info"
            />
          </DashboardGrid>
        </section>

        {businessScorecard ? (
          <section aria-labelledby="operating-scorecard-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="operating-scorecard-heading" className="text-sm font-semibold text-foreground">
                  Operating scorecard
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Live 30-day commercial and capacity gates before paid-ramp decisions.
                </p>
              </div>
              <StatusBadge status={scorecardBadgeStatus(businessScorecard.hireTriggerState.status)} size="sm">
                {businessScorecard.hireTriggerState.display}
              </StatusBadge>
            </div>

            <DashboardGrid columns={4} gap="md">
              <StatCard
                label="Monthly gross"
                value={businessScorecard.monthlyGrossCents.display}
                icon={<DollarSign className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.monthlyGrossCents.status)}
              />
              <StatCard
                label="Paid volume"
                value={businessScorecard.paidOrderVolume.display}
                icon={<CreditCard className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.paidOrderVolume.status)}
              />
              <StatCard
                label="CAC ceiling"
                value={businessScorecard.cacCeilingCents.display}
                icon={<WalletCards className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.cacCeilingCents.status)}
              />
              <StatCard
                label="Refund rate"
                value={businessScorecard.refundRate.display}
                icon={<Receipt className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.refundRate.status)}
              />
              <StatCard
                label="Chargeback rate"
                value={businessScorecard.chargebackRate.display}
                icon={<AlertCircle className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.chargebackRate.status)}
              />
              <StatCard
                label="Support tickets/100 orders"
                value={businessScorecard.supportTicketsPer100Orders.display}
                icon={<Headphones className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.supportTicketsPer100Orders.status)}
              />
              <StatCard
                label="Doctor minutes/order"
                value={businessScorecard.doctorMinutesPerOrder.display}
                icon={<Timer className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.doctorMinutesPerOrder.status)}
              />
              <StatCard
                label="Queue P95"
                value={businessScorecard.queueP95Minutes.display}
                icon={<Gauge className="h-5 w-5" />}
                status={scorecardStatus(businessScorecard.queueP95Minutes.status)}
              />
            </DashboardGrid>

            <DashboardCard padding="md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Hire trigger state</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Tracks the revenue, queue, support, and workload thresholds that should block paid ramp until staffing or process capacity catches up.
                  </p>
                </div>
                <StatusBadge status={scorecardBadgeStatus(businessScorecard.hireTriggerState.status)} size="sm">
                  {businessScorecard.hireTriggerState.display}
                </StatusBadge>
              </div>
              {businessScorecard.hireTriggerState.triggeredBy.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  {businessScorecard.hireTriggerState.triggeredBy.map((trigger) => (
                    <li key={trigger} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      {trigger}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  No hire triggers active.
                </p>
              )}
            </DashboardCard>
          </section>
        ) : null}

        <section aria-labelledby="conversion-heading" className="space-y-3">
          <h2 id="conversion-heading" className="text-sm font-semibold text-foreground">Conversion</h2>
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
        </section>

        <GeographicBreakdownCard breakdown={geographic} />

        <section aria-labelledby="google-ads-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="google-ads-heading" className="text-sm font-semibold text-foreground">Google Ads health</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Server-side purchase uploads from paid Google-attributed intakes over {googleAds.lookbackDays} days.
              </p>
            </div>
            <StatusBadge status={googleAdsStatus} size="sm">
              {googleAdsStatus === "success"
                ? "Uploading"
                : googleAdsStatus === "error"
                  ? "Needs config"
                  : googleAdsStatus === "warning"
                    ? "Watch"
                    : "No signal"}
            </StatusBadge>
          </div>

          <DashboardGrid columns={4} gap="md">
            <StatCard
              label="Captured"
              value={googleAds.captured}
              icon={<Megaphone className="h-5 w-5" />}
              status={googleAds.candidatesMissingClickId > 0 ? "warning" : "info"}
              trend={{
                value: googleAds.captured > 0
                  ? Math.round((googleAds.candidatesWithClickId / googleAds.captured) * 100)
                  : 0,
                label: "with click ID",
              }}
            />
            <StatCard
              label="Uploaded"
              value={googleAds.uploaded}
              icon={<UploadCloud className="h-5 w-5" />}
              status={googleAds.uploaded > 0 ? "success" : "neutral"}
            />
            <StatCard
              label="Skipped"
              value={googleAds.skipped}
              icon={<SkipForward className="h-5 w-5" />}
              status={googleAds.skipped > 0 ? "warning" : "success"}
            />
            <StatCard
              label="Failed"
              value={googleAds.failed}
              icon={<AlertCircle className="h-5 w-5" />}
              status={googleAds.failed > 0 ? "error" : "success"}
            />
          </DashboardGrid>

          <DashboardCard padding="md">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">
                  Latest error
                </p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">
                  {googleAds.latestErrorCode || "None"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNullableTime(googleAds.latestErrorAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">
                  Last successful upload
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatNullableTime(googleAds.lastSuccessfulUploadAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {googleAds.missingUpload} paid Google intake
                  {googleAds.missingUpload === 1 ? "" : "s"} still missing an upload record.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">
                  Click ID coverage
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {googleAds.clickIdCoveragePercent}% uploadable
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {googleAds.uploadable} of {googleAds.captured} captured intake
                  {googleAds.captured === 1 ? "" : "s"} include gclid, gbraid, or wbraid.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">
                  Retry state
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {googleAds.retryPaused > 0
                    ? `${googleAds.retryPaused} paused by non-retryable Ads config error`
                    : "No paused retries"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fix the Google Ads conversion action before forcing the backfill.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">
                    Config check
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{googleAds.configuration.label}</p>
                </div>
                <StatusBadge
                  status={
                    googleAds.configuration.severity === "error"
                      ? "error"
                      : googleAds.configuration.severity === "warning"
                        ? "warning"
                        : "success"
                  }
                  size="sm"
                >
                  {googleAds.configuration.severity}
                </StatusBadge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{googleAds.configuration.detail}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{googleAds.configuration.action}</p>
            </div>
          </DashboardCard>
        </section>

        <section aria-labelledby="prescription-fulfilment-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="prescription-fulfilment-heading" className="text-sm font-semibold text-foreground">
                Prescription fulfilment
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current Parchment handoff state for script-capable requests over{" "}
                {prescriptionFulfilment.lookbackDays} days.
              </p>
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
                        <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                          {icon}
                        </span>
                        <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{stage.detail}</p>
                    </div>
                    <StatusBadge status={status} size="sm">
                      {stage.count}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Oldest: {formatMinutes(stage.oldestMinutes)}</span>
                      <span>
                        SLA: {stage.slaMinutes == null ? "final" : formatMinutes(stage.slaMinutes)}
                      </span>
                    </div>
                    {(stage.slaBreachedCount > 0 || stage.emailFailedCount > 0 || stage.emailPendingCount > 0) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {stage.slaBreachedCount > 0 ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            {stage.slaBreachedCount} stale
                          </span>
                        ) : null}
                        {stage.emailFailedCount > 0 ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            {stage.emailFailedCount} email failed
                          </span>
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
                          <Link
                            key={item.id}
                            href={buildAdminIntakeHref(item.id)}
                            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/50"
                          >
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
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                                      {notificationLabel}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                      <span
                                        aria-hidden="true"
                                        className={
                                          item.notificationStatus === "pending"
                                            ? "h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5"
                                            : "h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-1 ring-inset ring-black/5"
                                        }
                                      />
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
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                        No cases in this state.
                      </div>
                    )}
                  </div>
                </DashboardCard>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {prescriptionFulfilment.total} fulfilment request
              {prescriptionFulfilment.total === 1 ? "" : "s"} in scope.
            </span>
            <span>
              {prescriptionFulfilment.webhookConfirmationCount} webhook confirmed.
            </span>
            <span>
              {prescriptionFulfilment.manualConfirmationCount} manual/PMS confirmed.
            </span>
            {prescriptionFulfilment.notificationFailedCount > 0 ? (
              <span className="font-medium text-destructive">
                {prescriptionFulfilment.notificationFailedCount} script email failed.
              </span>
            ) : null}
            {prescriptionFulfilment.notificationPendingCount > 0 ? (
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {prescriptionFulfilment.notificationPendingCount} script email pending.
              </span>
            ) : null}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link href={notificationIssueHref}>
                <Send className="h-3 w-3" />
                {prescriptionFulfilment.firstNotificationIssueStatus === "failed"
                  ? "Open failed script email"
                  : prescriptionFulfilment.firstNotificationIssueStatus === "pending"
                    ? "Open pending script email"
                    : "Email queue"}
              </Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="queue-heading" className="space-y-3">
          <h2 id="queue-heading" className="text-sm font-semibold text-foreground">Queue health</h2>
          <DashboardGrid columns={3} gap="md">
            <StatCard
              label="Queue size"
              value={queueHealth.queueSize}
              icon={<Activity className="h-5 w-5" />}
              status={queueHealth.queueSize > 10 ? "error" : queueHealth.queueSize > 5 ? "warning" : "success"}
            />
            <StatCard
              label="Avg review"
              value={formatMinutes(queueHealth.avgReviewTimeMinutes)}
              icon={<Clock className="h-5 w-5" />}
              status={
                queueHealth.avgReviewTimeMinutes && queueHealth.avgReviewTimeMinutes > 120
                  ? "error"
                  : "info"
              }
            />
            <StatCard
              label="Oldest waiting"
              value={formatMinutes(queueHealth.oldestInQueueMinutes)}
              icon={<Clock className="h-5 w-5" />}
              status={
                queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 240
                  ? "error"
                  : queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 120
                    ? "warning"
                    : "success"
              }
            />
          </DashboardGrid>
        </section>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
