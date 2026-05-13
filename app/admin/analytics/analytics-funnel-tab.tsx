"use client"

import {
  CheckCircle,
  CreditCard,
  Eye,
  MousePointer,
} from "lucide-react"

import {
  Bar,
  CartesianGrid,
  Cell,
  LazyBarChart as BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/charts/lazy-charts"
import { DashboardGrid, StatCard } from "@/components/dashboard"

import { type AnalyticsData } from "./analytics-helpers"

export function AnalyticsFunnelTab({ analytics }: { analytics: AnalyticsData }) {
  const { funnel } = analytics

  // Calculate conversion rates
  const startRate = funnel.visits > 0 ? ((funnel.started / funnel.visits) * 100).toFixed(1) : "0"
  const payRate = funnel.started > 0 ? ((funnel.paid / funnel.started) * 100).toFixed(1) : "0"
  const completeRate = funnel.paid > 0 ? ((funnel.completed / funnel.paid) * 100).toFixed(1) : "0"
  const overallRate = funnel.visits > 0 ? ((funnel.completed / funnel.visits) * 100).toFixed(1) : "0"

  // Funnel chart data
  const funnelData = [
    { name: "Visits", value: funnel.visits, fill: "#3b82f6" },
    { name: "Started", value: funnel.started, fill: "#5db8c9" },
    { name: "Paid", value: funnel.paid, fill: "#f59e0b" },
    { name: "Completed", value: funnel.completed, fill: "#10b981" },
  ]

  return (
    <div className="space-y-6">
      {/* Funnel Stats */}
      <DashboardGrid columns={4} gap="md">
        <StatCard
          label="Page Visits"
          value={funnel.visits}
          icon={<Eye className="h-5 w-5" />}
          status="info"
        />
        <StatCard
          label="Started Intake"
          value={funnel.started}
          icon={<MousePointer className="h-5 w-5" />}
          status="info"
          trend={{ value: Number(startRate), label: "of visits" }}
        />
        <StatCard
          label="Paid"
          value={funnel.paid}
          icon={<CreditCard className="h-5 w-5" />}
          status="warning"
          trend={{ value: Number(payRate), label: "of started" }}
        />
        <StatCard
          label="Completed"
          value={funnel.completed}
          icon={<CheckCircle className="h-5 w-5" />}
          status="success"
          trend={{ value: Number(overallRate), label: "overall" }}
        />
      </DashboardGrid>

      {/* Funnel Chart + Conversion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
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
        <div className="bg-card border border-border/50 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-6">
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
              color="#5db8c9"
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
                <span className="text-lg font-semibold">{overallRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {funnel.visits} visits resulted in {funnel.completed} completed intakes
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

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
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(rate, 1)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
