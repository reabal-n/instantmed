"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CheckCircle,
  Eye,
  MousePointer,
  Globe,
  ExternalLink,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

interface AnalyticsData {
  funnel: {
    visits: number
    started: number
    paid: number
    completed: number
  }
  dailyData: {
    date: string
    visits: number
    started: number
    paid: number
    completed: number
  }[]
  serviceTypes: {
    type: string
    count: number
  }[]
  sources: {
    source: string
    count: number
  }[]
}

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Medical Certificates",
    repeat_rx: "Repeat Prescriptions",
    consults: "Consultations",
    referrals: "Referrals",
    unknown: "Other",
  }
  return labels[type] || type
}

function _TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const change = ((current - previous) / previous) * 100
  const isPositive = change > 0

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      )}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}
      {change.toFixed(1)}%
    </div>
  )
}

export function AnalyticsDashboardClient({ analytics }: AnalyticsDashboardClientProps) {
  const { funnel, dailyData, serviceTypes, sources } = analytics

  // Calculate conversion rates
  const startRate = funnel.visits > 0 ? ((funnel.started / funnel.visits) * 100).toFixed(1) : "0"
  const payRate = funnel.started > 0 ? ((funnel.paid / funnel.started) * 100).toFixed(1) : "0"
  const _completeRate = funnel.paid > 0 ? ((funnel.completed / funnel.paid) * 100).toFixed(1) : "0"
  const overallRate = funnel.visits > 0 ? ((funnel.completed / funnel.visits) * 100).toFixed(1) : "0"

  // Funnel data for chart
  const funnelData = [
    { name: "Visits", value: funnel.visits, fill: "#3b82f6" },
    { name: "Started", value: funnel.started, fill: "#8b5cf6" },
    { name: "Paid", value: funnel.paid, fill: "#f59e0b" },
    { name: "Completed", value: funnel.completed, fill: "#10b981" },
  ]

  // Format daily data for chart
  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Started: d.started,
    Paid: d.paid,
    Completed: d.completed,
  }))

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/50 to-white">
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
              <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">Conversion funnel and traffic analysis</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open PostHog
            </a>
          </Button>
        </div>

        {/* Funnel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Page Visits</p>
                  <p className="text-2xl font-semibold">{funnel.visits.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-50">
                  <MousePointer className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Started Intake</p>
                  <p className="text-2xl font-semibold">{funnel.started.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{startRate}% of visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-2xl font-semibold">{funnel.paid.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{payRate}% of started</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold">{funnel.completed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{overallRate}% overall</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion Funnel</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Intake Trend</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Started" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Paid" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Service Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Service Type</CardTitle>
              <CardDescription>Distribution of intakes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceTypes.map((s) => ({
                        name: formatServiceType(s.type),
                        value: s.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {serviceTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Traffic Sources</CardTitle>
                  <CardDescription>Where patients come from</CardDescription>
                </div>
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No UTM data available. Add UTM parameters to track traffic sources.
                  </p>
                ) : (
                  sources
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8)
                    .map((source, index) => {
                      const percentage = funnel.started > 0 ? (source.count / funnel.started) * 100 : 0
                      return (
                        <div key={source.source} className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">{source.source}</span>
                              <span className="text-sm text-muted-foreground">{source.count}</span>
                            </div>
                            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: COLORS[index % COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
