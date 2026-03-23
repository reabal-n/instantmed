"use client"

import { GlassStatCard, DashboardGrid } from "@/components/dashboard"
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  XCircle,
  Send,
  AlertTriangle,
} from "lucide-react"
import {
  LazyLineChart as LineChart,
  LazyPieChart as PieChart,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "@/components/charts/lazy-charts"
import { type AnalyticsData, COLORS, formatServiceType, formatMinutes, formatCurrency } from "./analytics-helpers"

export function AnalyticsOverviewTab({ analytics }: { analytics: AnalyticsData }) {
  const { dailyData, serviceTypes, revenue, queueHealth, overview } = analytics

  // Approval rate
  const totalDecisions = overview.approved + overview.declined
  const approvalRate = totalDecisions > 0 ? Math.round((overview.approved / totalDecisions) * 100) : 0

  // Format daily chart data
  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Started: d.started,
    Paid: d.paid,
    Completed: d.completed,
    Revenue: d.revenue,
  }))

  return (
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
        <div className="dashboard-card rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Submitted</p>
          <p className="text-2xl font-bold tabular-nums">{queueHealth.todaySubmissions}</p>
        </div>
        <div className="dashboard-card rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Approved</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{queueHealth.approvedToday}</p>
        </div>
        <div className="dashboard-card rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Declined</p>
          <p className="text-2xl font-bold tabular-nums text-red-600">{queueHealth.declinedToday}</p>
        </div>
        <div className="dashboard-card rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Review</p>
          <p className="text-2xl font-bold tabular-nums">{formatMinutes(queueHealth.avgReviewTimeMinutes)}</p>
        </div>
        <div className="dashboard-card rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Scripts Pending</p>
          <p className="text-2xl font-bold tabular-nums text-amber-600">{overview.scriptsPending}</p>
        </div>
        <div className="dashboard-card rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Revenue</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{formatCurrency(revenue.today)}</p>
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
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-600 font-medium">In Queue</p>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{overview.inQueue}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-600 font-medium">Approved</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{overview.approved}</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600 font-medium">Declined</p>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{overview.declined}</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-600 font-medium">Needs Info</p>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{overview.pendingInfo}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-600 font-medium">Scripts Pending</p>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{overview.scriptsPending}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
