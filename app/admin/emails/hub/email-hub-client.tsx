"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Loader2,
  Mail,
  MailCheck,
  MailOpen,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { sendOpsTestEmailAction } from "@/app/actions/email-ops"
import { retryOutboxEmail } from "@/app/actions/email-retry"
import type { EmailStats, RecentEmailActivity } from "@/app/actions/email-stats"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTimeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

// Email type display names
const emailTypeLabels: Record<string, string> = {
  med_cert_patient: "Medical Certificate - Patient",
  med_cert_employer: "Medical Certificate - Employer",
  welcome: "Welcome Email",
  script_sent: "Script Sent",
  request_declined: "Request Declined",
  needs_more_info: "Needs More Info",
  payment_confirmed: "Payment Confirmed",
  payment_received: "Payment Received",
  payment_failed: "Payment Failed",
  refund_notification: "Refund Notification",
  repeat_rx_reminder: "Repeat Rx Reminder",
  prescription_approved: "Prescription Approved",
  ed_approved: "ED Treatment Approved",
  hair_loss_approved: "Hair Loss Treatment Approved",
  womens_health_approved: "Women's Health Approved",
  weight_loss_approved: "Weight Loss Approved",
  consult_approved: "Consult Approved",
  guest_complete_account: "Complete Account (Guest)",
  generic: "Generic Email",
  ops_test: "Ops Test",
}

// Sanitize email for display
function sanitizeEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  return `${local.slice(0, 3)}***@${domain}`
}

interface EmailHubClientProps {
  initialStats: EmailStats
  initialActivity: RecentEmailActivity[]
  outboxRows: EmailOutboxLedgerRow[]
  outboxTotal: number
  templateCounts: { active: number; total: number }
  yesterdayEmailCount: number
}

interface EmailOutboxLedgerRow {
  id: string
  email_type: string
  to_email: string
  subject: string
  status: "pending" | "sending" | "sent" | "failed" | "skipped_e2e"
  provider_message_id: string | null
  error_message: string | null
  retry_count: number
  last_attempt_at: string | null
  delivery_status: string | null
  delivery_status_updated_at: string | null
  intake_id: string | null
  created_at: string
  sent_at: string | null
}

function EmailStatusPill({
  status,
  deliveryStatus,
}: {
  status: EmailOutboxLedgerRow["status"] | string
  deliveryStatus?: string | null
}) {
  const resolvedStatus = deliveryStatus === "bounced" || deliveryStatus === "complained"
    ? deliveryStatus
    : status

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none capitalize",
        ["sent", "skipped_e2e", "delivered", "opened", "clicked"].includes(resolvedStatus)
          && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300",
        ["pending", "sending"].includes(resolvedStatus)
          && "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200",
        ["failed", "bounced", "complained"].includes(resolvedStatus)
          && "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200",
      )}
    >
      {resolvedStatus === "skipped_e2e" ? "sent (test)" : resolvedStatus.replace("_", " ")}
    </span>
  )
}

export function EmailHubClient({
  initialStats,
  initialActivity,
  outboxRows,
  outboxTotal,
  templateCounts,
  yesterdayEmailCount,
}: EmailHubClientProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "queue" ? "queue" : "overview")
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [outboxQuery, setOutboxQuery] = useState("")
  const [outboxStatus, setOutboxStatus] = useState<"all" | EmailOutboxLedgerRow["status"]>("all")
  const [isRefreshing, startRefresh] = useTransition()
  const [isSendingTest, startTestEmail] = useTransition()
  const router = useRouter()
  const stats = initialStats
  const activity = initialActivity

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh()
    })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "queue") {
      params.set("tab", "queue")
    } else {
      params.delete("tab")
    }
    router.replace(params.toString() ? `/admin/emails/hub?${params}` : "/admin/emails/hub", { scroll: false })
  }

  const handleSendOpsTestEmail = () => {
    startTestEmail(async () => {
      const result = await sendOpsTestEmailAction()
      if (result.success) {
        toast.success("Test email sent to your admin address")
        router.refresh()
        return
      }

      toast.error(result.error || "Test email failed")
    })
  }

  const handleRetry = async (outboxId: string) => {
    setRetryingId(outboxId)
    try {
      const result = await retryOutboxEmail(outboxId)
      if (result.success) {
        toast.success("Email retry queued")
        router.refresh()
      } else {
        toast.error(result.error || "Email retry failed")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email retry failed")
    } finally {
      setRetryingId(null)
    }
  }

  // Calculate real trend: compare today vs yesterday
  const emailTrendPct = yesterdayEmailCount > 0
    ? Math.round(((stats.emailsSentToday - yesterdayEmailCount) / yesterdayEmailCount) * 100)
    : stats.emailsSentToday > 0 ? 100 : 0

  const filteredOutboxRows = useMemo(() => {
    const normalizedQuery = outboxQuery.trim().toLowerCase()
    return outboxRows.filter((row) => {
      const matchesStatus = outboxStatus === "all" || row.status === outboxStatus
      if (!matchesStatus) return false
      if (!normalizedQuery) return true

      return [
        row.email_type,
        row.subject,
        row.to_email,
        row.intake_id || "",
        row.provider_message_id || "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [outboxQuery, outboxRows, outboxStatus])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h2" className="!text-xl flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Hub
          </Heading>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational dashboard for email volume, delivery, and recent activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSendOpsTestEmail} disabled={isSendingTest}>
            {isSendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send test
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Link href="/admin/emails">
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent Today</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats.emailsSentToday.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {emailTrendPct >= 0 ? "+" : ""}{emailTrendPct}% from yesterday ({yesterdayEmailCount})
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Send Success</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {stats.sendSuccessRate === null ? "No sends" : `${stats.sendSuccessRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.deliveryRate === null ? "Awaiting delivery events" : `${stats.deliveryRate}% delivered`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats.pendingEmails}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingEmails === 0 ? "Queue clear" : "Awaiting delivery"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats.failedEmails}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Edit and manage email templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {templateCounts.active} of {templateCounts.total} active
                    </span>
                    <Badge variant="secondary">Manage</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails/preview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview & Test
                  </CardTitle>
                  <CardDescription>
                    Preview templates and send test emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Live preview available
                    </span>
                    <Badge variant="secondary">Test</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails/suppression">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Suppression List
                  </CardTitle>
                  <CardDescription>
                    Recover blocked patient addresses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Bounces and complaints
                    </span>
                    <Badge variant="secondary">Review</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/emails/analytics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Email Analytics
                  </CardTitle>
                  <CardDescription>
                    View email performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {stats.emailsSentWeek.toLocaleString()} sent this week
                    </span>
                    <Badge variant="secondary">Analyze</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Email Activity
              </CardTitle>
              <CardDescription>
                Latest email sending activity and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent email activity</p>
                ) : (
                  activity.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          item.status === 'sent' ? 'bg-success-light' :
                          item.status === 'failed' ? 'bg-destructive-light' :
                          'bg-yellow-100'
                        }`}>
                          {item.status === 'sent' || item.status === 'skipped_e2e' ? (
                            <MailCheck className="h-4 w-4 text-success" />
                          ) : item.status === 'failed' ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{emailTypeLabels[item.emailType] || item.emailType}</p>
                          <p className="text-xs text-muted-foreground">
                            {sanitizeEmail(item.toEmail)} - {formatTimeAgo(item.createdAt)}
                          </p>
                          {item.deliveryStatus && (
                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                              Delivery: {item.deliveryStatus}
                            </p>
                          )}
                          {item.errorMessage && (
                            <p className="text-xs text-destructive mt-1">{item.errorMessage}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.intakeId && (
                          <Badge variant="outline" className="text-xs">
                            {item.intakeId.slice(0, 8)}...
                          </Badge>
                        )}
                        <Badge 
                          variant={
                            item.status === 'sent' || item.status === 'skipped_e2e' ? 'default' :
                            item.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {item.status === 'skipped_e2e' ? 'sent (test)' : item.status}
                        </Badge>
                        {["failed", "pending"].includes(item.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(item.id)}
                            disabled={retryingId === item.id}
                          >
                            {retryingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTabChange("queue")}
                >
                  View Delivery Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab -- delivery tracking summary */}
        <TabsContent value="queue" className="space-y-6">
          {/* Delivery Health Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats.pendingEmails}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingEmails === 0 ? "All clear" : "Awaiting delivery"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed (7d)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats.failedEmails}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.failedEmails === 0 ? "No failures" : "Needs attention"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {stats.deliveryRate === null ? "No events" : `${stats.deliveryRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.deliveredEmails} delivered, {stats.bouncedEmails + stats.complainedEmails} bounced/complained
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MailOpen className="h-5 w-5" />
                    Outgoing email ledger
                  </CardTitle>
                  <CardDescription>
                    Latest {outboxRows.length} of {outboxTotal.toLocaleString()} outbox rows with send, delivery, and retry state.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    size="sm"
                    value={outboxQuery}
                    onChange={(event) => setOutboxQuery(event.target.value)}
                    placeholder="Search recipient, subject, intake..."
                    startContent={<Search className="h-3.5 w-3.5" />}
                    className="w-full sm:w-72"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", "failed", "pending", "sending", "sent"] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={outboxStatus === status ? "default" : "outline"}
                        size="sm"
                        className="h-9 px-2.5 text-xs capitalize"
                        onClick={() => setOutboxStatus(status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOutboxRows.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                  No outgoing emails match this view.
                </div>
              ) : (
                <div className="divide-y divide-border/50 rounded-lg border border-border/50">
                  {filteredOutboxRows.slice(0, 50).map((row) => {
                    const canRetry = ["failed", "pending"].includes(row.status)
                    return (
                      <div
                        key={row.id}
                        className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.7fr)_minmax(170px,0.55fr)_auto] lg:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {emailTypeLabels[row.email_type] || row.email_type}
                            </p>
                            <EmailStatusPill status={row.status} deliveryStatus={row.delivery_status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{row.subject}</p>
                          {row.error_message ? (
                            <p className="mt-1 truncate text-xs text-destructive">{row.error_message}</p>
                          ) : null}
                        </div>
                        <div className="min-w-0 text-xs text-muted-foreground">
                          <p className="truncate">{sanitizeEmail(row.to_email)}</p>
                          <p className="truncate">
                            {row.intake_id ? `Intake ${row.intake_id.slice(0, 8)}` : "No linked intake"}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>{formatTimeAgo(row.sent_at || row.last_attempt_at || row.created_at)}</p>
                          <p>{row.retry_count} retries</p>
                        </div>
                        <div className="flex justify-start lg:justify-end">
                          {canRetry ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 px-2.5 text-xs"
                              onClick={() => handleRetry(row.id)}
                              disabled={retryingId === row.id}
                            >
                              {retryingId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Retry
                            </Button>
                          ) : row.intake_id ? (
                            <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5 text-xs" asChild>
                              <Link href={`/admin/intakes/${row.intake_id}`}>
                                Open
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent failed emails from activity feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Failures
              </CardTitle>
              <CardDescription>
                Failed emails from the last 7 days that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const failures = activity.filter((a) => a.status === "failed")
                if (failures.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent failures. All emails delivered successfully.
                    </p>
                  )
                }
                return (
                  <div className="space-y-3">
                    {failures.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                        <div>
                          <p className="font-medium text-sm">{emailTypeLabels[item.emailType] || item.emailType}</p>
                          <p className="text-xs text-muted-foreground">
                            {sanitizeEmail(item.toEmail)} -- {formatTimeAgo(item.createdAt)}
                          </p>
                          {item.errorMessage && (
                            <p className="text-xs text-destructive mt-1 truncate max-w-md">{item.errorMessage}</p>
                          )}
                        </div>
                        {item.intakeId && (
                          <Badge variant="outline" className="text-xs">
                            {item.intakeId.slice(0, 8)}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                        >
                          {retryingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          )}
                          Retry
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleTabChange("overview")}>
              <MailOpen className="mr-2 h-4 w-4" />
              Back to overview
            </Button>
            <Link href="/admin/emails/suppression">
              <Button variant="outline">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Suppression List
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
