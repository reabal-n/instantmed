"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Edit,
  Loader2,
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
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_EMAIL_SUPPRESSION_HREF,
  ADMIN_EMAIL_TEMPLATE_EDITOR_HREF,
  buildAdminIntakeHref,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import { EMAIL_SEQUENCES } from "@/lib/email/sequence-registry"
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
  issueActivity: RecentEmailActivity[]
  outboxRows: EmailOutboxLedgerRow[]
  outboxTotal: number
  initialOutboxQuery?: string
  templateCounts: { active: number; total: number }
  yesterdayEmailCount: number
  authEmailHookStatus: {
    configured: boolean
    hasResendKey: boolean
    hasSupabaseHookSecret: boolean
    devPreviewAvailable: boolean
  }
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
  issueActivity,
  outboxRows,
  outboxTotal,
  initialOutboxQuery = "",
  templateCounts,
  yesterdayEmailCount,
  authEmailHookStatus,
}: EmailHubClientProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "queue" ? "queue" : "overview")
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [outboxQuery, setOutboxQuery] = useState(initialOutboxQuery)
  const [outboxStatus, setOutboxStatus] = useState<"all" | EmailOutboxLedgerRow["status"]>("all")
  const [isRefreshing, startRefresh] = useTransition()
  const [isSendingTest, startTestEmail] = useTransition()
  const router = useRouter()
  const stats = initialStats
  const activity = initialActivity
  const emailIssues = issueActivity

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
    router.replace(params.toString() ? `${ADMIN_EMAIL_HUB_HREF}?${params}` : ADMIN_EMAIL_HUB_HREF, { scroll: false })
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
  const authRecoveryChecks = [
    { label: "Forgot password route", ready: true },
    { label: "Verification code template", ready: authEmailHookStatus.configured },
    { label: "Magic link template", ready: authEmailHookStatus.configured },
    { label: "Password reset template", ready: authEmailHookStatus.configured },
  ]

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
    <OperatorPage>
      <OperatorPageHeader
        title="Email delivery"
        description="Queue recovery, template edits, suppression, and delivery checks."
        backHref={STAFF_OPS_HREF}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSendOpsTestEmail} disabled={isSendingTest}>
            {isSendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send test
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Link href={ADMIN_EMAIL_TEMPLATE_EDITOR_HREF}>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </Link>
          </div>
        }
      />

      <OperatorScrollArea>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MailCheck className="h-5 w-5" />
                Sequence ownership
              </CardTitle>
              <CardDescription>
                Active email automations and retired sequences. This is intentionally small: one owner, one trigger, one guard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 lg:grid-cols-2">
                {EMAIL_SEQUENCES.map((sequence) => (
                  <div
                    key={sequence.id}
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      sequence.status === "active"
                        ? "border-border/60 bg-background"
                        : "border-dashed border-muted-foreground/25 bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{sequence.name}</p>
                          <Badge variant={sequence.status === "active" ? "default" : "secondary"} className="text-[10px] uppercase">
                            {sequence.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sequence.owner} · {sequence.cadence}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p><span className="font-medium text-foreground">Trigger:</span> {sequence.trigger}</p>
                      <p><span className="font-medium text-foreground">Guard:</span> {sequence.guard}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href={ADMIN_EMAIL_TEMPLATE_EDITOR_HREF}>
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
              <Link href={ADMIN_EMAIL_SUPPRESSION_HREF}>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {authEmailHookStatus.configured ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                  Auth recovery health
                </CardTitle>
                <CardDescription>
                  Magic links, password resets, and account recovery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {authEmailHookStatus.configured ? "Branded recovery emails ready" : "Recovery email setup incomplete"}
                  </span>
                  <Badge variant={authEmailHookStatus.configured ? "default" : "secondary"}>
                    {authEmailHookStatus.configured ? "Ready" : "Check env"}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {authRecoveryChecks.map((check) => (
                    <div key={check.label} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 text-xs">
                      <span className="font-medium text-foreground">{check.label}</span>
                      <Badge variant={check.ready ? "default" : "secondary"} className="text-[10px]">
                        {check.ready ? "Ready" : "Check"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    Resend {authEmailHookStatus.hasResendKey ? "set" : "missing"}
                  </Badge>
                  <Badge variant="outline">
                    Supabase hook {authEmailHookStatus.hasSupabaseHookSecret ? "set" : "missing"}
                  </Badge>
                </div>
                {authEmailHookStatus.devPreviewAvailable && (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/email-preview/verification-code"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Preview verification code
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/email-preview/magic-link"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Preview magic link
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/email-preview/magic-link-recovery"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Preview reset email
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </CardContent>
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
                              <Link href={buildAdminIntakeHref(row.intake_id)}>
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
                if (emailIssues.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No failed or pending email issues.
                    </p>
                  )
                }
                return (
                  <div className="space-y-3">
                    {emailIssues.map((item) => (
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
            <Link href={ADMIN_EMAIL_SUPPRESSION_HREF}>
              <Button variant="outline">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Suppression List
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
