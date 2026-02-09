"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Mail,
  Eye,
  MousePointer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
} from "lucide-react"
import {
  LazyBarChart as BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "@/components/charts/lazy-charts"
import { cn } from "@/lib/utils"

interface EmailAnalytics {
  summary: {
    totalSent: number
    totalFailed: number
    deliveryRate: number
  }
  templateStats: {
    template: string
    sent: number
    failed: number
  }[]
  recentEmails: {
    id: string
    template: string
    recipient: string
    status: string
    sentAt: string
    error: string | null
  }[]
}

interface EmailAnalyticsClientProps {
  analytics: EmailAnalytics
}

function formatTemplateName(template: string): string {
  return template
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function getStatusBadge(status: string) {
  if (status === "failed") {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }
  if (status === "sent") {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
        <CheckCircle className="h-3 w-3" />
        Sent
      </Badge>
    )
  }
  if (status === "pending" || status === "claimed") {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
        <Clock className="h-3 w-3" />
        {status === "claimed" ? "Processing" : "Pending"}
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 gap-1">
      <Send className="h-3 w-3" />
      {status}
    </Badge>
  )
}

export function EmailAnalyticsClient({ analytics }: EmailAnalyticsClientProps) {
  const { summary, templateStats, recentEmails } = analytics

  // Prepare chart data
  const chartData = templateStats
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 8)
    .map((t) => ({
      name: formatTemplateName(t.template).slice(0, 15),
      Sent: t.sent,
      Failed: t.failed,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/emails">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Email Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Delivery metrics (last 30 days). Open/click tracking available in Resend dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{summary.totalSent.toLocaleString()}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  Tracking via Resend
                </p>
                <p className="text-xs text-muted-foreground">
                  View in Resend dashboard
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  Tracking via Resend
                </p>
                <p className="text-xs text-muted-foreground">
                  View in Resend dashboard
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={summary.totalFailed > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summary.deliveryRate < 95 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                )}>
                  {summary.deliveryRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.totalFailed} failed
                </p>
              </div>
              {summary.deliveryRate < 95 ? (
                <AlertTriangle className="h-8 w-8 text-red-500/50" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Template</CardTitle>
            <CardDescription>Top templates by volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Sent" fill="#6b7280" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Breakdown</CardTitle>
          <CardDescription>
            Delivery metrics per email template. Open/click tracking is available in the Resend dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Delivery Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateStats.length > 0 ? (
                  templateStats
                    .sort((a, b) => b.sent - a.sent)
                    .map((template) => {
                      const deliveryRate = template.sent > 0
                        ? ((template.sent - template.failed) / template.sent) * 100
                        : 0
                      return (
                        <TableRow key={template.template}>
                          <TableCell className="font-medium">
                            {formatTemplateName(template.template)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {template.sent.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                            {template.failed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={cn(
                                deliveryRate >= 98
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : deliveryRate >= 95
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              )}
                            >
                              {deliveryRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No email data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Emails</CardTitle>
          <CardDescription>Last 50 emails sent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEmails.length > 0 ? (
                  recentEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">
                        {formatTemplateName(email.template || "unknown")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {email.recipient?.replace(/(.{3}).*@/, "$1***@") || "—"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(email.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">{formatTimeAgo(email.sentAt)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No recent emails
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
