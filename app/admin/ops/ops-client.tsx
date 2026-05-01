"use client"

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Mail,
  RefreshCw,
  ScrollText,
  Server,
  Users,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react"
import Link from "next/link"

import { DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { DOCTOR_QUEUE_REVIEW_HREF } from "@/lib/dashboard/routes"
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
  systemStatus: {
    webhooksHealthy: boolean
    emailsHealthy: boolean
    intakesHealthy: boolean
    patientIdentityHealthy: boolean
    prescribingIdentityHealthy: boolean
  }
}

interface OpsDashboardClientProps {
  ops: OpsData
}

function StatusIndicator({ healthy, label }: { healthy: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-3 h-3 rounded-full",
          healthy ? "bg-emerald-500" : "bg-red-500",
          healthy ? "" : "animate-pulse"
        )}
      />
      <span className="text-sm">{label}</span>
      {healthy ? (
        <CheckCircle className="w-4 h-4 text-success" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-destructive" />
      )}
    </div>
  )
}

export function OpsDashboardClient({ ops }: OpsDashboardClientProps) {
  const { webhooks, emails, errors, auditVolume, patientIdentity, prescribingIdentity, staleIntakes, systemStatus } = ops

  const allHealthy = systemStatus.webhooksHealthy
    && systemStatus.emailsHealthy
    && systemStatus.intakesHealthy
    && systemStatus.patientIdentityHealthy
    && systemStatus.prescribingIdentityHealthy
  const overallStatus = allHealthy ? "healthy" : "degraded"

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
            <StatusBadge status={allHealthy ? "success" : "error"}>
              System {overallStatus}
            </StatusBadge>
          }
        />

        {/* System Status */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">System Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <StatusIndicator healthy={systemStatus.webhooksHealthy} label="Webhooks" />
            <StatusIndicator healthy={systemStatus.emailsHealthy} label="Email Delivery" />
            <StatusIndicator healthy={systemStatus.intakesHealthy} label="Intake Processing" />
            <StatusIndicator healthy={systemStatus.patientIdentityHealthy} label="Patient Identity" />
            <StatusIndicator healthy={systemStatus.prescribingIdentityHealthy} label="Prescribing Identity" />
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed Webhooks</p>
                <p className={cn("text-2xl font-semibold tabular-nums mt-0.5", webhooks.failedCount > 0 && "text-destructive")}>
                  {webhooks.failedCount}
                </p>
              </div>
            </div>
            {webhooks.failedCount > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/admin/webhook-dlq">View DLQ →</Link>
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
                <Link href={DOCTOR_QUEUE_REVIEW_HREF}>View Queue →</Link>
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
                  {patientIdentity.uniqueProfileCount} unique / {patientIdentity.rawProfileCount} raw
                </p>
              </div>
            </div>
            {patientIdentity.duplicateProfileCount > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/doctor/patients">Review Patients →</Link>
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
          {/* Recent Webhook Failures */}
          <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Recent Webhook Failures</h3>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/webhook-dlq">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry All
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

        {/* Quick Actions */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">Quick Actions</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/admin/webhook-dlq">Webhook DLQ</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/emails/hub">Email Queue</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/audit">Audit Logs</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={DOCTOR_QUEUE_REVIEW_HREF}>Doctor Queue</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/ops/sla">SLA Monitor</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/ops/prescribing-identity">Rx Identity Blocks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/ops/patient-merge-audit">Merge Audit</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/refunds">Refunds</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
