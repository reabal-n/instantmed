"use client"

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Send,
  XCircle,
} from "lucide-react"

import {
  CartesianGrid,
  Cell,
  LazyLineChart as LineChart,
  LazyPieChart as PieChart,
  Legend,
  Line,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/charts/lazy-charts"
import { DashboardGrid, StatCard } from "@/components/dashboard"
import { formatAUD,formatMinutes } from "@/lib/format"

import { type AnalyticsData, COLORS, formatServiceType } from "./analytics-helpers"

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
        <StatCard
          label="Total Intakes"
          value={overview.total}
          icon={<FileText className="h-5 w-5" />}
          status="info"
        />
        <StatCard
          label="In Queue"
          value={overview.inQueue}
          icon={<Clock className="h-5 w-5" />}
          status={overview.inQueue > 10 ? "warning" : "info"}
        />
        <StatCard
          label="Approval Rate"
          value={`${approvalRate}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          status="success"
        />
        <StatCard
          label="Month Revenue"
          value={formatAUD(revenue.thisMonth)}
          icon={<DollarSign className="h-5 w-5" />}
          status="success"
        />
      </DashboardGrid>

      {/* Today's Activity */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Submitted</p>
          <p className="text-2xl font-semibold tabular-nums">{queueHealth.todaySubmissions}</p>
        </div>
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Approved</p>
          <p className="text-2xl font-semibold tabular-nums text-success">{queueHealth.approvedToday}</p>
        </div>
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Declined</p>
          <p className="text-2xl font-semibold tabular-nums text-destructive">{queueHealth.declinedToday}</p>
        </div>
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Review</p>
          <p className="text-2xl font-semibold tabular-nums">{formatMinutes(queueHealth.avgReviewTimeMinutes)}</p>
        </div>
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Scripts Pending</p>
          <p className="text-2xl font-semibold tabular-nums text-warning">{overview.scriptsPending}</p>
        </div>
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today Revenue</p>
          <p className="text-2xl font-semibold tabular-nums text-success">{formatAUD(revenue.today)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
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
                <Line type="monotone" dataKey="Started" stroke="#5db8c9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Paid" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Service Type */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
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
      <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Status Overview (All Time)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-info-light border border-info-border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-info" />
              <p className="text-sm text-info font-medium">In Queue</p>
            </div>
            <p className="text-2xl font-semibold text-info">{overview.inQueue}</p>
          </div>
          <div className="p-4 rounded-xl bg-success-light border border-success-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm text-success font-medium">Approved</p>
            </div>
            <p className="text-2xl font-semibold text-success">{overview.approved}</p>
          </div>
          <div className="p-4 rounded-xl bg-destructive-light border border-destructive-border">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive font-medium">Declined</p>
            </div>
            <p className="text-2xl font-semibold text-destructive">{overview.declined}</p>
          </div>
          <div className="p-4 rounded-xl bg-warning-light border border-warning-border">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm text-warning font-medium">Needs Info</p>
            </div>
            <p className="text-2xl font-semibold text-warning">{overview.pendingInfo}</p>
          </div>
          <div className="p-4 rounded-xl bg-info-light border border-info-border">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-info" />
              <p className="text-sm text-info font-medium">Scripts Pending</p>
            </div>
            <p className="text-2xl font-semibold text-info">{overview.scriptsPending}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
