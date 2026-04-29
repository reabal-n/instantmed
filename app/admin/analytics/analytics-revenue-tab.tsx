"use client"

import {
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react"

import {
  Area,
  CartesianGrid,
  LazyAreaChart as AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/charts/lazy-charts"
import { DashboardCard } from "@/components/dashboard"
import { formatAUD } from "@/lib/format"

import { type AnalyticsData } from "./analytics-helpers"

export function AnalyticsRevenueTab({ analytics }: { analytics: AnalyticsData }) {
  const { funnel, dailyData, revenue } = analytics

  const payRate = funnel.started > 0 ? ((funnel.paid / funnel.started) * 100).toFixed(1) : "0"

  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Revenue: d.revenue,
  }))

  return (
    <div className="space-y-6">
      {/* Revenue KPIs. Left-stripe accents banned by §17 absolute_bans.
          Hierarchy now communicated via card tier + status-tinted icon + value color. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard tier="elevated" padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Today</p>
              <p className="text-3xl font-semibold tabular-nums text-success">
                {formatAUD(revenue.today)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-2.5">
              <DollarSign className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard tier="standard" padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">This Week</p>
              <p className="text-3xl font-semibold tabular-nums text-info">
                {formatAUD(revenue.thisWeek)}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-2.5">
              <TrendingUp className="h-6 w-6 text-blue-700 dark:text-blue-400" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard tier="standard" padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Last 30 days</p>
              <p className="text-3xl font-semibold tabular-nums text-info">
                {formatAUD(revenue.thisMonth)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{funnel.paid} paid intakes</p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-2.5">
              <Users className="h-6 w-6 text-blue-700 dark:text-blue-400" />
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Revenue Chart */}
      <DashboardCard tier="standard" padding="lg">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Daily revenue</h3>
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
              <Tooltip formatter={(value) => [formatAUD(Number(value ?? 0)), "Revenue"]} />
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
      </DashboardCard>

      {/* Revenue per Service */}
      <DashboardCard tier="standard" padding="lg">
        <h3 className="text-base font-semibold text-foreground mb-4">Revenue metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/30 border text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg per Intake</p>
            <p className="text-xl font-semibold">
              {funnel.paid > 0 ? formatAUD(revenue.thisMonth / funnel.paid) : "$0"}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg per Day</p>
            <p className="text-xl font-semibold">{formatAUD(revenue.thisMonth / 30)}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border text-center">
            <p className="text-xs text-muted-foreground mb-1">Paid Intakes</p>
            <p className="text-xl font-semibold">{funnel.paid}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border text-center">
            <p className="text-xs text-muted-foreground mb-1">Conversion to pay</p>
            <p className="text-xl font-semibold">{payRate}%</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  )
}
