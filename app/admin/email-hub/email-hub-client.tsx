"use client"

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Edit,
  Eye,
  Loader2,
  Mail,
  MailCheck,
  MailOpen,
  RefreshCw,
  Send,
  Settings,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import type { EmailStats, RecentEmailActivity } from "@/app/actions/email-stats"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTimeAgo } from "@/lib/format"

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
  templateCounts: { active: number; total: number }
  yesterdayEmailCount: number
}

export function EmailHubClient({ initialStats, initialActivity, templateCounts, yesterdayEmailCount }: EmailHubClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats] = useState(initialStats)
  const [activity] = useState(initialActivity)
  const [isRefreshing, startRefresh] = useTransition()
  const router = useRouter()

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh()
    })
  }

  // Calculate real trend: compare today vs yesterday
  const emailTrendPct = yesterdayEmailCount > 0
    ? Math.round(((stats.emailsSentToday - yesterdayEmailCount) / yesterdayEmailCount) * 100)
    : stats.emailsSentToday > 0 ? 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1" className="!text-2xl flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Hub
          </Heading>
          <p className="text-sm text-muted-foreground mt-1">
            Central management for all email templates, sending, and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stats.deliveryRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.emailsSentWeek} sent this week
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
              <Link href="/admin/email-hub">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Email Queue
                  </CardTitle>
                  <CardDescription>
                    Monitor email sending queue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {stats.pendingEmails} pending
                    </span>
                    <Badge variant="secondary">Monitor</Badge>
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

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/email-hub">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MailOpen className="h-5 w-5" />
                    Email Outbox
                  </CardTitle>
                  <CardDescription>
                    View sent email history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Full email log
                    </span>
                    <Badge variant="secondary">History</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/settings/templates">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Template Settings
                  </CardTitle>
                  <CardDescription>
                    Configure email settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      SMTP & delivery settings
                    </span>
                    <Badge variant="secondary">Configure</Badge>
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
                            {sanitizeEmail(item.toEmail)} • {formatTimeAgo(item.createdAt)}
                          </p>
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
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Link href="/admin/email-hub">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Activity
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates Management</CardTitle>
              <CardDescription>
                Edit, preview, and manage all email templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Template Management</h3>
                <p className="text-muted-foreground mb-4">
                  Full template management interface
                </p>
                <Link href="/admin/emails">
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Templates
                  </Button>
                </Link>
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
                <div className="text-2xl font-semibold">{stats.deliveryRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.emailsSentWeek} delivered this week
                </p>
              </CardContent>
            </Card>
          </div>

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
                      No recent failures -- all emails delivered successfully.
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
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Links to detailed views */}
          <div className="flex gap-3">
            <Link href="/admin/email-hub">
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Failed Certificate Queue
              </Button>
            </Link>
            <Link href="/admin/email-hub">
              <Button variant="outline">
                <MailOpen className="h-4 w-4 mr-2" />
                Full Email Outbox
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Analytics</CardTitle>
              <CardDescription>
                Comprehensive email performance metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Email Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed email performance analysis
                </p>
                <Link href="/admin/emails/analytics">
                  <Button>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Configure email delivery, SMTP, and template settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Email Configuration</h3>
                <p className="text-muted-foreground mb-4">
                  Manage email settings and preferences
                </p>
                <Link href="/admin/settings/templates">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Email Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
