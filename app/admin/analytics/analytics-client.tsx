"use client"

import { Button } from "@/components/ui/button"
import { GlassStatCard, DashboardGrid, DashboardHeader } from "@/components/dashboard"
import {
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
    <div className="min-h-screen dashboard-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <DashboardHeader
          title="Analytics Dashboard"
          description="Conversion funnel and traffic analysis"
          backHref="/admin"
          backLabel="Admin"
          actions={
            <Button variant="outline" asChild>
              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PostHog
              </a>
            </Button>
          }
        />

        {/* Funnel Stats */}
        <DashboardGrid columns={4} gap="md">
          <GlassStatCard
            label="Page Visits"
            value={funnel.visits}
            icon={<Eye className="h-5 w-5" />}
            status="info"
          />
          <GlassStatCard
            label="Started Intake"
            value={funnel.started}
            icon={<MousePointer className="h-5 w-5" />}
            status="info"
            trend={{ value: Number(startRate), label: "of visits" }}
          />
          <GlassStatCard
            label="Paid"
            value={funnel.paid}
            icon={<CreditCard className="h-5 w-5" />}
            status="warning"
            trend={{ value: Number(payRate), label: "of started" }}
          />
          <GlassStatCard
            label="Completed"
            value={funnel.completed}
            icon={<CheckCircle className="h-5 w-5" />}
            status="success"
            trend={{ value: Number(overallRate), label: "overall" }}
          />
        </DashboardGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="dashboard-card rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Conversion Funnel</h3>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </div>
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
          </div>

          {/* Daily Trend */}
          <div className="dashboard-card rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Daily Intake Trend</h3>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </div>
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
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Service Type */}
          <div className="dashboard-card rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">By Service Type</h3>
              <p className="text-sm text-muted-foreground">Distribution of intakes</p>
            </div>
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
          </div>

          {/* Traffic Sources */}
          <div className="dashboard-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Traffic Sources</h3>
                <p className="text-sm text-muted-foreground">Where patients come from</p>
              </div>
              <Globe className="h-5 w-5 text-muted-foreground" />
            </div>
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
          </div>
        </div>
      </div>
    </div>
  )
}
