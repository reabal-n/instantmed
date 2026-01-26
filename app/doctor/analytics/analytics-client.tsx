"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Zap,
  Activity,
  Stethoscope,
  Pill,
  ClipboardList,
  Users,
  ChevronRight,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface PaginationInfo {
  days: number
  hasMore: boolean
  nextCursor: string | null
  totalInRange: number
  pageSize: number
}

export interface AnalyticsData {
  totalIntakes: number
  todayIntakes: number
  todayApproved: number
  pendingInQueue: number
  statusCounts: Record<string, number>
  serviceTypeCounts: Record<string, number>
  avgResponseMinutes: number
  totalRevenue: number
  thisWeekRevenue: number
  todayRevenue: number
  intakeTrend: number
  revenueTrend: number
  dailyData: { date: string; count: number; approved: number }[]
  priorityCount: number
  priorityPercentage: number
  approvalRate: number
  pagination: PaginationInfo
}

interface AnalyticsClientProps {
  analytics: AnalyticsData
  doctorName: string
}

function TrendBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>
  const isPositive = value > 0
  return (
    <div className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
      isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}{value}{suffix}
    </div>
  )
}

function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Medical Certificates",
    repeat_rx: "Repeat Scripts",
    consults: "Consultations",
    other: "Other",
  }
  return labels[type] || type
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "Awaiting Payment",
    paid: "In Queue",
    in_review: "Under Review",
    approved: "Approved",
    declined: "Declined",
    completed: "Completed",
    pending_info: "Needs Info",
  }
  return labels[status] || status
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const DATE_RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last year" },
]

export function AnalyticsClient({ analytics, doctorName }: AnalyticsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDays = analytics.pagination.days.toString()

  const handleDateRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("days", value)
    params.delete("cursor") // Reset pagination when changing date range
    router.push(`/doctor/analytics?${params.toString()}`)
  }

  const handleLoadMore = () => {
    if (!analytics.pagination.nextCursor) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("cursor", analytics.pagination.nextCursor)
    router.push(`/doctor/analytics?${params.toString()}`)
  }

  const serviceData = Object.entries(analytics.serviceTypeCounts).map(([type, count]) => ({
    name: formatServiceType(type),
    count,
    fill: type === "med_certs" ? "#3b82f6" : type === "repeat_rx" ? "#10b981" : type === "consults" ? "#f59e0b" : "#8b5cf6",
  }))

  const _statusData = Object.entries(analytics.statusCounts)
    .filter(([status]) => ["paid", "approved", "declined", "in_review"].includes(status))
    .map(([status, count]) => ({
      name: formatStatus(status),
      count,
      fill: status === "approved" ? "#10b981" : status === "declined" ? "#ef4444" : status === "paid" ? "#3b82f6" : "#f59e0b",
    }))

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance overview for Dr. {doctorName}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Date range selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={currentDays} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {analytics.pagination.totalInRange.toLocaleString()} intakes in range
            </p>
            <TrendBadge value={analytics.intakeTrend} suffix="% vs last week" />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Intakes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{analytics.todayIntakes}</p>
                <p className="text-xs text-muted-foreground">{analytics.todayApproved} approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Queue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-dawn-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Queue</p>
                <p className="text-2xl font-bold">{analytics.pendingInQueue}</p>
                <p className="text-xs text-muted-foreground">awaiting review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{formatMinutes(analytics.avgResponseMinutes)}</p>
                <p className="text-xs text-muted-foreground">turnaround time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">{analytics.approvalRate}%</p>
                <p className="text-xs text-muted-foreground">{analytics.statusCounts.approved || 0} approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Today&apos;s Revenue</p>
                <p className="text-3xl font-bold text-emerald-700">${analytics.todayRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">This Week</p>
                <p className="text-3xl font-bold text-blue-700">${analytics.thisWeekRevenue.toFixed(0)}</p>
                <TrendBadge value={analytics.revenueTrend} suffix="%" />
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">All Time</p>
                <p className="text-3xl font-bold text-purple-700">${analytics.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-purple-500">{analytics.totalIntakes} total intakes</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Daily Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Received"
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="approved" 
                    name="Approved"
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              By Service Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceData.map((service) => {
                const percentage = analytics.totalIntakes > 0 
                  ? Math.round((service.count / analytics.totalIntakes) * 100) 
                  : 0
                return (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {service.name.includes("Medical") && <Stethoscope className="h-4 w-4 text-blue-500" />}
                        {service.name.includes("Script") && <Pill className="h-4 w-4 text-emerald-500" />}
                        {service.name.includes("Consult") && <Users className="h-4 w-4 text-dawn-500" />}
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <span className="text-muted-foreground">{service.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: service.fill }}
                      />
                    </div>
                  </div>
                )
              })}
              {serviceData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{analytics.statusCounts.paid || 0}</p>
              <p className="text-sm text-blue-600">In Queue</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-2xl font-bold text-amber-700">{analytics.statusCounts.in_review || 0}</p>
              <p className="text-sm text-dawn-600">Under Review</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-700">{analytics.statusCounts.approved || 0}</p>
              <p className="text-sm text-emerald-600">Approved</p>
            </div>
            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
              <p className="text-2xl font-bold text-red-700">{analytics.statusCounts.declined || 0}</p>
              <p className="text-sm text-red-600">Declined</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Stats */}
      {analytics.priorityCount > 0 && (
        <Card className="border-amber-200 bg-linear-to-r from-dawn-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <Zap className="h-6 w-6 text-dawn-600" />
              </div>
              <div>
                <p className="font-medium">Priority Requests</p>
                <p className="text-sm text-muted-foreground">
                  {analytics.priorityCount} priority requests ({analytics.priorityPercentage}% of total)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination: Load More */}
      {analytics.pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="gap-2"
          >
            Load more data
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
