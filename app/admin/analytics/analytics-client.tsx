"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GlassStatCard, DashboardGrid, DashboardHeader } from "@/components/dashboard"
import {
  TrendingUp,
  CreditCard,
  CheckCircle,
  Eye,
  MousePointer,
  Globe,
  ExternalLink,
  DollarSign,
  Clock,
  Activity,
  Users,
  FileText,
  XCircle,
  Send,
  AlertTriangle,
  Zap,
} from "lucide-react"
import {
  LazyLineChart as LineChart,
  LazyBarChart as BarChart,
  LazyPieChart as PieChart,
  LazyAreaChart as AreaChart,
  Line,
  Bar,
  Pie,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "@/components/charts/lazy-charts"
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
    revenue: number
  }[]
  serviceTypes: {
    type: string
    count: number
  }[]
  sources: {
    source: string
    count: number
  }[]
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  queueHealth: {
    queueSize: number
    avgReviewTimeMinutes: number | null
    oldestInQueueMinutes: number | null
    todaySubmissions: number
    approvedToday: number
    declinedToday: number
  }
  overview: {
    total: number
    inQueue: number
    approved: number
    declined: number
    pendingInfo: number
    scriptsPending: number
  }
}

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

type TabKey = "overview" | "funnel" | "revenue" | "queue"

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

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "N/A"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AnalyticsDashboardClient({ analytics }: AnalyticsDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const { funnel, dailyData, serviceTypes, sources, revenue, queueHealth, overview } = analytics

  // Calculate conversion rates
  const startRate = funnel.visits > 0 ? ((funnel.started / funnel.visits) * 100).toFixed(1) : "0"
  const payRate = funnel.started > 0 ? ((funnel.paid / funnel.started) * 100).toFixed(1) : "0"
  const completeRate = funnel.paid > 0 ? ((funnel.completed / funnel.paid) * 100).toFixed(1) : "0"
  const overallRate = funnel.visits > 0 ? ((funnel.completed / funnel.visits) * 100).toFixed(1) : "0"

  // Funnel chart data
  const funnelData = [
    { name: "Visits", value: funnel.visits, fill: "#3b82f6" },
    { name: "Started", value: funnel.started, fill: "#8b5cf6" },
    { name: "Paid", value: funnel.paid, fill: "#f59e0b" },
    { name: "Completed", value: funnel.completed, fill: "#10b981" },
  ]

  // Format daily chart data
  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Started: d.started,
    Paid: d.paid,
    Completed: d.completed,
    Revenue: d.revenue,
  }))

  // Approval rate
  const totalDecisions = overview.approved + overview.declined
  const approvalRate = totalDecisions > 0 ? Math.round((overview.approved / totalDecisions) * 100) : 0

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "funnel", label: "Conversion Funnel" },
    { key: "revenue", label: "Revenue" },
    { key: "queue", label: "Queue Health" },
  ]

  return (
    <div className="min-h-screen dashboard-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <DashboardHeader
          title="Analytics Hub"
          description="Comprehensive business intelligence and operational metrics"
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

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top-level KPIs */}
            <DashboardGrid columns={4} gap="md">
              <GlassStatCard
                label="Total Intakes"
                value={overview.total}
                icon={<FileText className="h-5 w-5" />}
                status="info"
              />
              <GlassStatCard
                label="In Queue"
                value={overview.inQueue}
                icon={<Clock className="h-5 w-5" />}
                status={overview.inQueue > 10 ? "warning" : "info"}
              />
              <GlassStatCard
                label="Approval Rate"
                value={`${approvalRate}%`}
                icon={<CheckCircle className="h-5 w-5" />}
                status="success"
              />
              <GlassStatCard
                label="Month Revenue"
                value={formatCurrency(revenue.thisMonth)}
                icon={<DollarSign className="h-5 w-5" />}
                status="success"
              />
            </DashboardGrid>

            {/* Today's Activity */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="dashboard-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Today Submitted</p>
                <p className="text-2xl font-bold">{queueHealth.todaySubmissions}</p>
              </div>
              <div className="dashboard-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Today Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{queueHealth.approvedToday}</p>
              </div>
              <div className="dashboard-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Today Declined</p>
                <p className="text-2xl font-bold text-red-600">{queueHealth.declinedToday}</p>
              </div>
              <div className="dashboard-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg Review</p>
                <p className="text-2xl font-bold">{formatMinutes(queueHealth.avgReviewTimeMinutes)}</p>
              </div>
              <div className="dashboard-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Scripts Pending</p>
                <p className="text-2xl font-bold text-amber-600">{overview.scriptsPending}</p>
              </div>
              <div className="dashboard-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Today Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(revenue.today)}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* By Service Type */}
              <div className="dashboard-card rounded-xl p-6">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-foreground">By Service Type</h3>
                  <p className="text-sm text-muted-foreground">Distribution of intakes</p>
                </div>
                <div className="h-[300px]">
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
                        outerRadius={90}
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
            </div>

            {/* Status Breakdown */}
            <div className="dashboard-card rounded-xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Status Overview (All Time)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-600 font-medium">In Queue</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{overview.inQueue}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm text-emerald-600 font-medium">Approved</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{overview.approved}</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-600 font-medium">Declined</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{overview.declined}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-600 font-medium">Needs Info</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{overview.pendingInfo}</p>
                </div>
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm text-indigo-600 font-medium">Scripts Pending</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{overview.scriptsPending}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Funnel Tab */}
        {activeTab === "funnel" && (
          <div className="space-y-6">
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

            {/* Funnel Chart + Conversion Rates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Conversion Rate Cards */}
              <div className="dashboard-card rounded-xl p-6">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-foreground">Conversion Rates</h3>
                  <p className="text-sm text-muted-foreground">Step-by-step drop-off analysis</p>
                </div>
                <div className="space-y-4">
                  <ConversionStep
                    from="Visits"
                    to="Started"
                    rate={Number(startRate)}
                    fromCount={funnel.visits}
                    toCount={funnel.started}
                    color="#8b5cf6"
                  />
                  <ConversionStep
                    from="Started"
                    to="Paid"
                    rate={Number(payRate)}
                    fromCount={funnel.started}
                    toCount={funnel.paid}
                    color="#f59e0b"
                  />
                  <ConversionStep
                    from="Paid"
                    to="Completed"
                    rate={Number(completeRate)}
                    fromCount={funnel.paid}
                    toCount={funnel.completed}
                    color="#10b981"
                  />
                  <div className="mt-6 p-4 rounded-xl bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Conversion</span>
                      <span className="text-lg font-bold">{overallRate}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {funnel.visits} visits resulted in {funnel.completed} completed intakes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="dashboard-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Traffic Sources</h3>
                  <p className="text-sm text-muted-foreground">Where patients come from (UTM tracking)</p>
                </div>
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 col-span-2">
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
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">{source.source}</span>
                              <span className="text-sm text-muted-foreground ml-2">{source.count}</span>
                            </div>
                            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.max(percentage, 2)}%`,
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
        )}

        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            {/* Revenue KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="dashboard-card rounded-xl p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Today</p>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(revenue.today)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-emerald-400" />
                </div>
              </div>

              <div className="dashboard-card rounded-xl p-6 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">This Week</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(revenue.thisWeek)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="dashboard-card rounded-xl p-6 border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Last 30 Days</p>
                    <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
                      {formatCurrency(revenue.thisMonth)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{funnel.paid} paid intakes</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-400" />
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="dashboard-card rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Daily Revenue</h3>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      allowDecimals={false}
                    />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue per Service */}
            <div className="dashboard-card rounded-xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Revenue Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Avg per Intake</p>
                  <p className="text-xl font-bold">
                    {funnel.paid > 0 ? formatCurrency(revenue.thisMonth / funnel.paid) : "$0"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Avg per Day</p>
                  <p className="text-xl font-bold">{formatCurrency(revenue.thisMonth / 30)}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Paid Intakes</p>
                  <p className="text-xl font-bold">{funnel.paid}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Conversion to Pay</p>
                  <p className="text-xl font-bold">{payRate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue Health Tab */}
        {activeTab === "queue" && (
          <div className="space-y-6">
            {/* Queue KPIs */}
            <DashboardGrid columns={4} gap="md">
              <GlassStatCard
                label="Queue Size"
                value={queueHealth.queueSize}
                icon={<Activity className="h-5 w-5" />}
                status={queueHealth.queueSize > 10 ? "error" : queueHealth.queueSize > 5 ? "warning" : "success"}
              />
              <GlassStatCard
                label="Avg Review Time"
                value={formatMinutes(queueHealth.avgReviewTimeMinutes)}
                icon={<Clock className="h-5 w-5" />}
                status={
                  queueHealth.avgReviewTimeMinutes && queueHealth.avgReviewTimeMinutes > 120
                    ? "error"
                    : "info"
                }
              />
              <GlassStatCard
                label="Oldest in Queue"
                value={formatMinutes(queueHealth.oldestInQueueMinutes)}
                icon={<AlertTriangle className="h-5 w-5" />}
                status={
                  queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 240
                    ? "error"
                    : queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 120
                      ? "warning"
                      : "success"
                }
              />
              <GlassStatCard
                label="Approval Rate"
                value={`${approvalRate}%`}
                icon={<CheckCircle className="h-5 w-5" />}
                status={approvalRate >= 80 ? "success" : approvalRate >= 60 ? "warning" : "error"}
              />
            </DashboardGrid>

            {/* Today's Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="dashboard-card rounded-xl p-6">
                <h3 className="text-base font-semibold text-foreground mb-4">Today&apos;s Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">Submitted</span>
                    </div>
                    <span className="text-lg font-bold">{queueHealth.todaySubmissions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium">Approved</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-700">{queueHealth.approvedToday}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium">Declined</span>
                    </div>
                    <span className="text-lg font-bold text-red-700">{queueHealth.declinedToday}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium">Net Queue Change</span>
                    </div>
                    <span className={cn(
                      "text-lg font-bold",
                      queueHealth.todaySubmissions - queueHealth.approvedToday - queueHealth.declinedToday > 0
                        ? "text-amber-700"
                        : "text-emerald-700"
                    )}>
                      {queueHealth.todaySubmissions - queueHealth.approvedToday - queueHealth.declinedToday > 0 ? "+" : ""}
                      {queueHealth.todaySubmissions - queueHealth.approvedToday - queueHealth.declinedToday}
                    </span>
                  </div>
                </div>
              </div>

              {/* SLA Health Indicator */}
              <div className="dashboard-card rounded-xl p-6">
                <h3 className="text-base font-semibold text-foreground mb-4">Queue SLA Status</h3>
                <div className="space-y-6">
                  <SlaIndicator
                    label="Queue Wait Time"
                    value={queueHealth.oldestInQueueMinutes}
                    thresholds={{ good: 60, warning: 180, critical: 360 }}
                  />
                  <SlaIndicator
                    label="Average Review Time"
                    value={queueHealth.avgReviewTimeMinutes}
                    thresholds={{ good: 30, warning: 120, critical: 240 }}
                  />
                  <SlaIndicator
                    label="Queue Depth"
                    value={queueHealth.queueSize}
                    thresholds={{ good: 5, warning: 15, critical: 30 }}
                    unit="items"
                  />
                  <SlaIndicator
                    label="Scripts Backlog"
                    value={overview.scriptsPending}
                    thresholds={{ good: 3, warning: 10, critical: 20 }}
                    unit="pending"
                  />
                </div>
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="dashboard-card rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Daily Processing Volume</h3>
                <p className="text-sm text-muted-foreground">Submissions vs. completions over 30 days</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Started" name="Received" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper component for conversion steps
function ConversionStep({
  from,
  to,
  rate,
  fromCount,
  toCount,
  color,
}: {
  from: string
  to: string
  rate: number
  fromCount: number
  toCount: number
  color: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {from} ({fromCount.toLocaleString()}) &rarr; {to} ({toCount.toLocaleString()})
        </span>
        <span className="font-semibold" style={{ color }}>
          {rate}%
        </span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(rate, 1)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// Helper component for SLA indicators
function SlaIndicator({
  label,
  value,
  thresholds,
  unit = "min",
}: {
  label: string
  value: number | null
  thresholds: { good: number; warning: number; critical: number }
  unit?: string
}) {
  const numValue = value ?? 0
  const status =
    numValue <= thresholds.good
      ? "good"
      : numValue <= thresholds.warning
        ? "warning"
        : "critical"

  const statusConfig = {
    good: { color: "bg-emerald-500", label: "Healthy", textColor: "text-emerald-600" },
    warning: { color: "bg-amber-500", label: "Warning", textColor: "text-amber-600" },
    critical: { color: "bg-red-500", label: "Critical", textColor: "text-red-600" },
  }

  const config = statusConfig[status]
  const percentage = Math.min((numValue / thresholds.critical) * 100, 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", config.textColor)}>{config.label}</span>
          <span className="text-muted-foreground">
            {value !== null ? (unit === "min" ? formatMinutes(value) : `${value} ${unit}`) : "N/A"}
          </span>
        </div>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", config.color)}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  )
}
