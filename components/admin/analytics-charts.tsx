"use client"

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardAnalytics } from "@/types/db"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

function formatCategoryLabel(type: string): string {
  const labels: Record<string, string> = {
    medical_certificate: "Medical Certificates",
    prescription: "Prescriptions",
    referral: "Referrals",
    pathology: "Pathology",
    other: "Other",
  }
  return labels[type] || type
}

interface AnalyticsChartsProps {
  analytics: DashboardAnalytics
}

export function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Requests Over Time */}
      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-white/40 dark:border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Requests Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.requests_by_day.map((item) => ({
                date: new Date(item.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
                requests: item.count,
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Requests by Type */}
      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-white/40 dark:border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Requests by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.requests_by_type.map((item) => ({
                    name: formatCategoryLabel(item.type),
                    value: item.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {analytics.requests_by_type.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
