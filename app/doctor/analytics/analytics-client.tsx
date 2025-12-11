"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { TrendingUp, Clock, CheckCircle, DollarSign, FileText, Calendar, Activity } from "lucide-react"
import type { DashboardAnalytics } from "@/types/db"

interface AnalyticsClientProps {
  analytics: DashboardAnalytics
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

const formatCategoryLabel = (type: string) => {
  switch (type) {
    case "medical_certificate":
      return "Med Certs"
    case "prescription":
      return "Scripts"
    case "referral":
      return "Referrals"
    default:
      return type
  }
}

export function AnalyticsClient({ analytics }: AnalyticsClientProps) {
  const statCards = [
    {
      title: "Requests Today",
      value: analytics.requests_today,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "This Week",
      value: analytics.requests_this_week,
      icon: Calendar,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Avg Review Time",
      value: `${analytics.avg_review_time_hours}h`,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Approval Rate",
      value: `${analytics.approval_rate}%`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Revenue Today",
      value: `$${analytics.revenue_today.toFixed(0)}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Revenue This Month",
      value: `$${analytics.revenue_this_month.toFixed(0)}`,
      icon: TrendingUp,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
  ]

  // Format data for charts
  const pieData = analytics.requests_by_type.map((item) => ({
    name: formatCategoryLabel(item.type),
    value: item.count,
  }))

  const lineData = analytics.requests_by_day.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    requests: item.count,
  }))

  // Generate heatmap data (24 hours x intensity)
  const maxHourCount = Math.max(...analytics.requests_by_hour.map((h) => h.count), 1)
  const heatmapData = analytics.requests_by_hour.map((item) => ({
    hour: `${item.hour.toString().padStart(2, "0")}:00`,
    count: item.count,
    intensity: item.count / maxHourCount,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of platform activity and performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-semibold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Requests Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Requests by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Requests by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busiest Hours Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Busiest Hours (This Month)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData} barCategoryGap="10%">
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} interval={1} />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [`${value} requests`, "Count"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Hours shown in AEST</p>
        </CardContent>
      </Card>
    </div>
  )
}
