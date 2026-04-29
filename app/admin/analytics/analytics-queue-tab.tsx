"use client"

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
  Zap,
} from "lucide-react"

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
import { DashboardGrid,GlassStatCard } from "@/components/dashboard"
import { formatMinutes } from "@/lib/format"
import { cn } from "@/lib/utils"

import { type AnalyticsData } from "./analytics-helpers"

export function AnalyticsQueueTab({ analytics }: { analytics: AnalyticsData }) {
  const { dailyData, queueHealth, overview } = analytics

  // Approval rate
  const totalDecisions = overview.approved + overview.declined
  const approvalRate = totalDecisions > 0 ? Math.round((overview.approved / totalDecisions) * 100) : 0

  // Format daily chart data
  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Started: d.started,
    Completed: d.completed,
  }))

  return (
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
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Today&apos;s Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-info-light">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-info" />
                <span className="text-sm font-medium">Submitted</span>
              </div>
              <span className="text-lg font-semibold">{queueHealth.todaySubmissions}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-success-light/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Approved</span>
              </div>
              <span className="text-lg font-semibold text-success">{queueHealth.approvedToday}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive-light">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">Declined</span>
              </div>
              <span className="text-lg font-semibold text-destructive">{queueHealth.declinedToday}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning-light/30">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium">Net Queue Change</span>
              </div>
              <span className={cn(
                "text-lg font-semibold",
                queueHealth.todaySubmissions - queueHealth.approvedToday - queueHealth.declinedToday > 0
                  ? "text-warning"
                  : "text-success"
              )}>
                {queueHealth.todaySubmissions - queueHealth.approvedToday - queueHealth.declinedToday > 0 ? "+" : ""}
                {queueHealth.todaySubmissions - queueHealth.approvedToday - queueHealth.declinedToday}
              </span>
            </div>
          </div>
        </div>

        {/* SLA Health Indicator */}
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
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
      <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
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
  )
}

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
    good: { color: "bg-emerald-500", label: "Healthy", textColor: "text-success" },
    warning: { color: "bg-amber-500", label: "Warning", textColor: "text-warning" },
    critical: { color: "bg-red-500", label: "Critical", textColor: "text-destructive" },
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
          className={cn("h-full rounded-full transition-[width] duration-500", config.color)}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  )
}
