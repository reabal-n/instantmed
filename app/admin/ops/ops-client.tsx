"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Webhook,
  Mail,
  Clock,
  RefreshCw,
  ScrollText,
  Server,
  Zap,
} from "lucide-react"
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
  staleIntakes: number
  systemStatus: {
    webhooksHealthy: boolean
    emailsHealthy: boolean
    intakesHealthy: boolean
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
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-red-500" />
      )}
    </div>
  )
}

export function OpsDashboardClient({ ops }: OpsDashboardClientProps) {
  const { webhooks, emails, errors, auditVolume, staleIntakes, systemStatus } = ops

  const allHealthy = systemStatus.webhooksHealthy && systemStatus.emailsHealthy && systemStatus.intakesHealthy
  const overallStatus = allHealthy ? "healthy" : "degraded"

  return (
    <div className="min-h-screen admin-page-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Operations Dashboard</h1>
              <p className="text-sm text-muted-foreground">System health and monitoring</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-sm px-3 py-1",
              allHealthy
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full mr-2",
                allHealthy ? "bg-emerald-500" : "bg-red-500 animate-pulse"
              )}
            />
            System {overallStatus}
          </Badge>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">System Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatusIndicator healthy={systemStatus.webhooksHealthy} label="Webhooks" />
              <StatusIndicator healthy={systemStatus.emailsHealthy} label="Email Delivery" />
              <StatusIndicator healthy={systemStatus.intakesHealthy} label="Intake Processing" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-lg", webhooks.failedCount > 0 ? "bg-red-50" : "bg-emerald-50")}>
                <Webhook className={cn("h-5 w-5", webhooks.failedCount > 0 ? "text-red-600" : "text-emerald-600")} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Webhooks</p>
                <p className={cn("text-2xl font-semibold tracking-tight", webhooks.failedCount > 0 && "text-red-600")}>
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

          <div className="stat-card p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-lg", emails.failed > 0 ? "bg-amber-50" : "bg-emerald-50")}>
                <Mail className={cn("h-5 w-5", emails.failed > 0 ? "text-amber-600" : "text-emerald-600")} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Success</p>
                <p className="text-2xl font-semibold tracking-tight">{emails.successRate}%</p>
                <p className="text-xs text-muted-foreground">{emails.total} sent today</p>
              </div>
            </div>
            {emails.failed > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/admin/email-queue">View Queue →</Link>
              </Button>
            )}
          </div>

          <div className="stat-card p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-lg", staleIntakes > 0 ? "bg-amber-50" : "bg-emerald-50")}>
                <Clock className={cn("h-5 w-5", staleIntakes > 0 ? "text-amber-600" : "text-emerald-600")} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stale Intakes</p>
                <p className={cn("text-2xl font-semibold tracking-tight", staleIntakes > 0 && "text-amber-600")}>
                  {staleIntakes}
                </p>
                <p className="text-xs text-muted-foreground">Awaiting 2h+</p>
              </div>
            </div>
            {staleIntakes > 0 && (
              <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
                <Link href="/doctor/queue">View Queue →</Link>
              </Button>
            )}
          </div>

          <div className="stat-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50">
                <ScrollText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Audit Logs (24h)</p>
                <p className="text-2xl font-semibold tracking-tight">{auditVolume.toLocaleString()}</p>
              </div>
            </div>
            <Button variant="link" size="sm" className="mt-3 p-0 h-auto text-xs" asChild>
              <Link href="/admin/audit">View Logs →</Link>
            </Button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Webhook Failures */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Recent Webhook Failures</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/webhook-dlq">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.recentFailed.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
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
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {webhook.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Recent Errors (7 days)</CardTitle>
              </div>
              <CardDescription>{errors.count} errors logged</CardDescription>
            </CardHeader>
            <CardContent>
              {errors.recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
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
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href="/admin/webhook-dlq">Webhook DLQ</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/email-queue">Email Queue</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/audit">Audit Logs</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/doctor/queue">Doctor Queue</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/refunds">Refunds</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
