"use client"

import {
  TrendingUp,
  DollarSign,
  Users,
} from "lucide-react"
import {
  LazyAreaChart as AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/charts/lazy-charts"
import { type AnalyticsData } from "./analytics-helpers"
import { formatAUD } from "@/lib/format"

export function AnalyticsRevenueTab({ analytics }: { analytics: AnalyticsData }) {
  const { funnel, dailyData, revenue } = analytics

  // Calculate conversion rate
  const payRate = funnel.started > 0 ? ((funnel.paid / funnel.started) * 100).toFixed(1) : "0"

  // Format daily chart data
  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Revenue: d.revenue,
  }))

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card rounded-xl p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Today</p>
              <p className="text-3xl font-semibold text-success">
                {formatAUD(revenue.today)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="dashboard-card rounded-xl p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">This Week</p>
              <p className="text-3xl font-semibold text-info">
                {formatAUD(revenue.thisWeek)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="dashboard-card rounded-xl p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Last 30 Days</p>
              <p className="text-3xl font-semibold text-info">
                {formatAUD(revenue.thisMonth)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{funnel.paid} paid intakes</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
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
      </div>

      {/* Revenue per Service */}
      <div className="dashboard-card rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Revenue Metrics</h3>
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
            <p className="text-xs text-muted-foreground mb-1">Conversion to Pay</p>
            <p className="text-xl font-semibold">{payRate}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
