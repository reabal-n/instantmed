"use client"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Mail,
  MousePointer,
  Send,
  XCircle,
} from "lucide-react"
import Link from "next/link"

import {
  Bar,
  CartesianGrid,
  LazyBarChart as BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/charts/lazy-charts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTimeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

interface EmailAnalytics {
  summary: {
    totalAccepted: number
    totalFailed: number
    delivered: number
    bounced: number
    complained: number
    opened: number
    clicked: number
    sendSuccessRate: number | null
    deliveryRate: number | null
    openRate: number | null
    clickRate: number | null
  }
  templateStats: {
    template: string
    accepted: number
    failed: number
    delivered: number
    bounced: number
    complained: number
    opened: number
    clicked: number
    deliveryRate: number | null
  }[]
  recentEmails: {
    id: string
    template: string
    recipient: string
    status: string
    deliveryStatus: string | null
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

function formatRate(rate: number | null): string {
  return rate === null ? "No events" : `${rate.toFixed(1)}%`
}

function getStatusBadge(status: string) {
  if (status === "failed") {
    return (
      <Badge className="bg-destructive-light text-destructive gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }
  if (status === "sent") {
    return (
      <Badge className="bg-success-light text-success gap-1">
        <CheckCircle className="h-3 w-3" />
        Sent
      </Badge>
    )
  }
  if (status === "pending" || status === "claimed") {
    return (
      <Badge className="bg-warning-light text-warning gap-1">
        <Clock className="h-3 w-3" />
        {status === "claimed" ? "Processing" : "Pending"}
      </Badge>
    )
  }
  return (
    <Badge className="bg-muted text-foreground gap-1">
      <Send className="h-3 w-3" />
      {status}
    </Badge>
  )
}

export function EmailAnalyticsClient({ analytics }: EmailAnalyticsClientProps) {
  const { summary, templateStats, recentEmails } = analytics
  const deliveryRateHealthy = summary.deliveryRate === null || summary.deliveryRate >= 95

  // Prepare chart data
  const chartData = templateStats
    .sort((a, b) => b.accepted - a.accepted)
    .slice(0, 8)
    .map((t) => ({
      name: formatTemplateName(t.template).slice(0, 15),
      Accepted: t.accepted,
      Delivered: t.delivered,
      Failed: t.failed,
      Bounced: t.bounced + t.complained,
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
            <Heading level="h2" className="!text-xl flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Analytics
            </Heading>
            <p className="text-sm text-muted-foreground mt-1">
              Send, delivery, open, and click metrics from the last 30 days.
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
                <p className="text-2xl font-semibold">{summary.totalAccepted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRate(summary.sendSuccessRate)} send success
                </p>
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
                <p className="text-2xl font-semibold mt-1">
                  {formatRate(summary.openRate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.opened} opened
                </p>
              </div>
              <Eye className="h-8 w-8 text-info/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-semibold mt-1">
                  {formatRate(summary.clickRate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.clicked} clicked
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={!deliveryRateHealthy || summary.totalFailed > 0 ? "border-destructive-border" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className={cn(
                  "text-2xl font-semibold",
                  deliveryRateHealthy ? "text-success" : "text-destructive"
                )}>
                  {formatRate(summary.deliveryRate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.delivered} delivered, {summary.bounced + summary.complained} bounced/complained
                </p>
              </div>
              {!deliveryRateHealthy ? (
                <AlertTriangle className="h-8 w-8 text-destructive/50" />
              ) : (
                <CheckCircle className="h-8 w-8 text-success/50" />
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
                  <Bar dataKey="Accepted" fill="#6b7280" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Delivered" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Bounced" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
            Delivery metrics per email template from email_outbox webhook status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Delivery Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateStats.length > 0 ? (
                  templateStats
                    .sort((a, b) => b.accepted - a.accepted)
                    .map((template) => {
                      const deliveryRate = template.deliveryRate
                      return (
                        <TableRow key={template.template}>
                          <TableCell className="font-medium">
                            {formatTemplateName(template.template)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {template.accepted.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {template.delivered.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            {template.failed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={cn(
                                deliveryRate === null
                                  ? "bg-muted text-foreground"
                                  : deliveryRate >= 98
                                  ? "bg-success-light text-success"
                                  : deliveryRate >= 95
                                  ? "bg-warning-light text-warning"
                                  : "bg-destructive-light text-destructive"
                              )}
                            >
                              {formatRate(deliveryRate)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                  <TableHead>Delivery</TableHead>
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
                        {email.deliveryStatus ? (
                          <Badge variant="outline" className="capitalize">
                            {email.deliveryStatus}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Pending webhook</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">{email.sentAt ? formatTimeAgo(email.sentAt) : "Not sent"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
