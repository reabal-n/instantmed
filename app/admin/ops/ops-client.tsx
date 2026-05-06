"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  FileWarning,
  Mail,
  Pill,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Server,
  Users,
  Webhook,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { ADMIN_PATIENT_MERGE_AUDIT_HREF, ADMIN_STALE_INTAKES_HREF } from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

interface OpsData {
  webhooks: {
    failedCount: number
    recentFailed: Array<{
      id: string
      created_at: string
      status: string
      event_type: string
    }>
  }
  emails: {
    total: number
    sent: number
    failed: number
    pending: number
    successRate: number
  }
  errors: {
    count: number
    recent: Array<{
      id: string
      action: string
      created_at: string
      metadata: Record<string, unknown> | null
    }>
  }
  auditVolume: number
  patientIdentity: {
    rawProfileCount: number
    uniqueProfileCount: number
    duplicateProfileCount: number
    duplicateGroupCount: number
  }
  prescribingIdentity: {
    totalActive: number
    blockedCount: number
    readyCount: number
    topBlockers: Array<{ label: string; count: number }>
  }
  staleIntakes: number
  failureOverview: {
    openCount: number
    categories: Array<{
      id: string
      label: string
      count: number
      href: string
      severity: "critical" | "warning"
      emptyLabel: string
    }>
    recent: Array<{
      id: string
      categoryId: string
      title: string
      detail: string
      occurredAt: string
      href: string
      severity: "critical" | "warning"
    }>
  }
  systemStatus: {
    webhooksHealthy: boolean
    emailsHealthy: boolean
    intakesHealthy: boolean
    patientIdentityHealthy: boolean
    prescribingIdentityHealthy: boolean
    failureOverviewHealthy: boolean
  }
}

interface OpsDashboardClientProps {
  ops: OpsData
}

type FailureCategory = OpsData["failureOverview"]["categories"][number]
type FailureItem = OpsData["failureOverview"]["recent"][number]
type FailureSeverity = FailureCategory["severity"]

const categoryActionById: Record<string, string> = {
  stripe_webhooks: "Retry webhook",
  email_delivery: "Check email",
  checkout: "Recover checkout",
  incomplete_requests: "Recover request",
  certificate_delivery: "Resend cert",
  prescription_delivery: "Retry Parchment",
  stale_scripts: "Send script",
}

function getSeverityTone(severity: FailureSeverity) {
  if (severity === "critical") {
    return {
      card: "border-red-200 bg-red-50/70 hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-950/20 dark:hover:border-red-400/40",
      icon: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      pill: "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200",
      action: "border-red-600 bg-red-600 text-white group-hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:group-hover:bg-red-400 dark:text-red-950",
      text: "text-red-800 dark:text-red-200",
    }
  }

  return {
    card: "border-orange-200 bg-orange-50/80 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-950/20 dark:hover:border-orange-400/40",
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    pill: "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/50 dark:text-orange-200",
    action: "border-orange-500 bg-orange-500 text-white group-hover:bg-orange-600 dark:border-orange-400 dark:bg-orange-400 dark:group-hover:bg-orange-300 dark:text-orange-950",
    text: "text-orange-800 dark:text-orange-200",
  }
}

function SignalPill({
  tone,
  children,
  className,
}: {
  tone: "success" | "warning" | "critical" | "neutral"
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300",
        tone === "warning" && "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200",
        tone === "critical" && "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200",
        tone === "neutral" && "border-border/60 bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

function StatusIndicator({ healthy, label }: { healthy: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-full border px-3 py-2 transition-colors",
        healthy
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200",
      )}
    >
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          healthy ? "bg-emerald-500" : "bg-red-500",
        )}
      />
    </div>
  )
}

function FailureStatusPill({ category }: { category: FailureCategory }) {
  if (category.count === 0) {
    return <SignalPill tone="success">Clear</SignalPill>
  }

  return (
    <SignalPill tone={category.severity === "critical" ? "critical" : "warning"}>
      {category.count} open
    </SignalPill>
  )
}

function FailureActionPill({
  item,
  category,
}: {
  item?: FailureItem
  category?: FailureCategory
}) {
  const severity = item?.severity ?? category?.severity ?? "warning"
  const label = item
    ? categoryActionById[item.categoryId] || "Open fix"
    : category
      ? categoryActionById[category.id] || "Open fix"
      : "Open fix"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition-colors",
        severity === "critical"
          ? "border-red-600 bg-red-600 text-white group-hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:group-hover:bg-red-400 dark:text-red-950"
          : "border-orange-500 bg-orange-500 text-white group-hover:bg-orange-600 dark:border-orange-400 dark:bg-orange-400 dark:group-hover:bg-orange-300 dark:text-orange-950",
      )}
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </span>
  )
}

export function OpsDashboardClient({ ops }: OpsDashboardClientProps) {
  const { webhooks, emails, errors, auditVolume, patientIdentity, prescribingIdentity, staleIntakes, failureOverview, systemStatus } = ops

  const allHealthy = systemStatus.webhooksHealthy
    && systemStatus.emailsHealthy
    && systemStatus.intakesHealthy
    && systemStatus.patientIdentityHealthy
    && systemStatus.prescribingIdentityHealthy
    && systemStatus.failureOverviewHealthy
  const overallStatus = allHealthy ? "healthy" : "needs review"
  const categoryIconById: Record<string, typeof Webhook> = {
    stripe_webhooks: Webhook,
    email_delivery: Mail,
    checkout: ReceiptText,
    incomplete_requests: Clock,
    certificate_delivery: FileWarning,
    prescription_delivery: Pill,
    stale_scripts: Clock,
  }

  return (
    <div className="min-h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <DashboardPageHeader
          title="Operations Dashboard"
          description="System health and monitoring"
          backHref="/admin"
          backLabel="Admin"
          actions={
            <SignalPill tone={allHealthy ? "success" : "warning"} className="px-3 py-1.5">
              System {overallStatus}
            </SignalPill>
          }
        />

        {/* System Status */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">System Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <StatusIndicator healthy={systemStatus.webhooksHealthy} label="Payment webhooks" />
            <StatusIndicator healthy={systemStatus.emailsHealthy} label="Email Delivery" />
            <StatusIndicator healthy={systemStatus.intakesHealthy} label="Intake Processing" />
            <StatusIndicator healthy={systemStatus.patientIdentityHealthy} label="Patient Identity" />
            <StatusIndicator healthy={systemStatus.prescribingIdentityHealthy} label="Prescribing Identity" />
            <StatusIndicator healthy={systemStatus.failureOverviewHealthy} label="Failure Inbox" />
          </div>
        </div>

        {/* Failure Inbox */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("h-5 w-5", failureOverview.openCount > 0 ? "text-warning" : "text-success")} />
                <h3 className="text-base font-semibold text-foreground">Operational Failure Inbox</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                One place for payment, webhook, email, certificate, and script delivery failures.
              </p>
            </div>
            <SignalPill tone={failureOverview.openCount > 0 ? "warning" : "success"} className="px-3 py-1.5">
              {failureOverview.openCount} open
            </SignalPill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            {failureOverview.categories.map((category) => {
              const Icon = categoryIconById[category.id] || AlertTriangle
              const hasFailures = category.count > 0
              const tone = getSeverityTone(category.severity)
              return (
                <Link
                  key={category.id}
                  href={category.href}
                  className={cn(
                    "group flex min-h-28 flex-col justify-between rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-muted/60",
                    hasFailures && tone.card,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors",
                        hasFailures && tone.icon,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <FailureStatusPill category={category} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{category.label}</p>
                    <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums", hasFailures && tone.text)}>
                      {category.count}
                    </p>
                    <div className="mt-2">
                      {hasFailures ? (
                        <FailureActionPill category={category} />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground">
                          No action
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-5 border-t border-border/50 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Newest items</h4>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
            {failureOverview.recent.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                Nothing needs recovery right now.
              </div>
            ) : (
              <div className="divide-y divide-border/50 rounded-lg border border-border/50">
                {failureOverview.recent.slice(0, 6).map((item) => (
                  <Link
                    key={`${item.categoryId}-${item.id}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
                      item.severity === "critical" && "hover:bg-red-50/70 dark:hover:bg-red-950/20",
                      item.severity === "warning" && "hover:bg-orange-50/70 dark:hover:bg-orange-950/20",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {new Date(item.occurredAt).toLocaleString("en-AU")}
                      </span>
                      <SignalPill tone={item.severity === "critical" ? "critical" : "warning"}>
                        {item.severity}
                      </SignalPill>
                      <FailureActionPill item={item} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg shrink-0", webhooks.failedCount > 0 ? "bg-destructive-light" : "bg-success-light")}>
                <Webhook className={cn("h-5 w-5", webhooks.failedCount > 0 ? "text-destructive" : "text-success")} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment DLQ</p>
                <p className={cn("text-2xl font-semibold tabular-nums mt-0.5", webhooks.failedCount > 0 && "text-destructive")}>
                  {webhooks.failedCount}
                </p>
              </div>
            </div>
            {webhooks.failedCount > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/admin/webhook-dlq">Open DLQ →</Link>
              </Button>
            )}
          </div>

          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg shrink-0", emails.failed > 0 ? "bg-warning-light" : "bg-success-light")}>
                <Mail className={cn("h-5 w-5", emails.failed > 0 ? "text-warning" : "text-success")} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Success</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{emails.successRate}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{emails.total} sent today</p>
              </div>
            </div>
            {emails.failed > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/admin/emails/hub">View Queue →</Link>
              </Button>
            )}
          </div>

          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg shrink-0", staleIntakes > 0 ? "bg-warning-light" : "bg-success-light")}>
                <Clock className={cn("h-5 w-5", staleIntakes > 0 ? "text-warning" : "text-success")} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stale Intakes</p>
                <p className={cn("text-2xl font-semibold tabular-nums mt-0.5", staleIntakes > 0 && "text-warning")}>
                  {staleIntakes}
                </p>
                <p className="text-xs text-muted-foreground">Awaiting 2h+</p>
              </div>
            </div>
            {staleIntakes > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href={ADMIN_STALE_INTAKES_HREF}>Review stale intakes →</Link>
              </Button>
            )}
          </div>

          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info-light shrink-0">
                <ScrollText className="h-5 w-5 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audit Logs (24h)</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{auditVolume.toLocaleString()}</p>
              </div>
            </div>
            <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
              <Link href="/admin/audit">View Logs →</Link>
            </Button>
          </div>

          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg shrink-0", patientIdentity.duplicateProfileCount > 0 ? "bg-warning-light" : "bg-success-light")}>
                <Users className={cn("h-5 w-5", patientIdentity.duplicateProfileCount > 0 ? "text-warning" : "text-success")} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient Identity</p>
                <p className={cn("text-2xl font-semibold tabular-nums mt-0.5", patientIdentity.duplicateProfileCount > 0 && "text-warning")}>
                  {patientIdentity.duplicateProfileCount}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {patientIdentity.duplicateGroupCount} groups / {patientIdentity.rawProfileCount} raw
                </p>
              </div>
            </div>
            {patientIdentity.duplicateProfileCount > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href={ADMIN_PATIENT_MERGE_AUDIT_HREF}>Review duplicate profiles →</Link>
              </Button>
            )}
          </div>

          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg shrink-0", prescribingIdentity.blockedCount > 0 ? "bg-warning-light" : "bg-success-light")}>
                <CreditCard className={cn("h-5 w-5", prescribingIdentity.blockedCount > 0 ? "text-warning" : "text-success")} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rx Identity Blocks</p>
                <p className={cn("text-2xl font-semibold tabular-nums mt-0.5", prescribingIdentity.blockedCount > 0 && "text-warning")}>
                  {prescribingIdentity.blockedCount}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {prescribingIdentity.readyCount} ready / {prescribingIdentity.totalActive} active
                </p>
              </div>
            </div>
            {prescribingIdentity.blockedCount > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/admin/ops/prescribing-identity">Review Blocks →</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent payment DLQ events */}
          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Recent payment DLQ events</h3>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/webhook-dlq">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Open DLQ
                </Link>
              </Button>
            </div>
            {webhooks.recentFailed.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                <p>No failed webhooks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.recentFailed.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{webhook.event_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(webhook.created_at).toLocaleString("en-AU")}
                      </p>
                    </div>
                    <StatusBadge status="error" size="sm">{webhook.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Errors */}
          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">Recent Errors (7 days)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{errors.count} errors logged</p>
            {errors.recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                <p>No recent errors</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {errors.recent.slice(0, 10).map((error) => (
                  <div key={error.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{error.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(error.created_at).toLocaleString("en-AU")}
                      </p>
                    </div>
                    <XCircle className="w-4 h-4 text-destructive shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
