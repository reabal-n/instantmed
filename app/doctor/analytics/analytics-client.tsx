"use client"

import { 
  Activity,
  Calendar,
  CheckCircle, 
  ChevronRight,
  ClipboardList,
  Clock, 
  DollarSign, 
  FileText, 
  Pill,
  Stethoscope,
  TrendingDown,
  TrendingUp, 
  Users,
  Zap,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

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
import { DashboardPageHeader } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatMinutes } from "@/lib/format"
import { formatServiceType } from "@/lib/format/service"
import { cn } from "@/lib/utils"
import type { CursorPaginationInfo } from "@/types/shared"

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
  pagination: CursorPaginationInfo
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
      isPositive ? "bg-success-light text-success" : "bg-destructive-light text-destructive"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}{value}{suffix}
    </div>
  )
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
    fill: type === "med_certs" ? "#3b82f6" : type === "repeat_rx" ? "#10b981" : type === "consults" ? "#f59e0b" : "#0ea5e9",
  }))

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Analytics"
        description={`Performance overview for Dr. ${doctorName}`}
        actions={
          <>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
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
            <div className="sm:text-right">
              <p className="text-xs text-muted-foreground">
                {analytics.pagination.totalInRange.toLocaleString()} intakes in range
              </p>
              <TrendBadge value={analytics.intakeTrend} suffix="% vs last week" />
            </div>
          </>
        }
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Intakes */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-info-light shrink-0">
                <FileText className="h-5 w-5 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{analytics.todayIntakes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{analytics.todayApproved} approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Queue */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-warning-light shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Queue</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{analytics.pendingInQueue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">awaiting review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-warning-light shrink-0">
                <Activity className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Response</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{formatMinutes(analytics.avgResponseMinutes)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">turnaround time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-success-light shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval Rate</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{analytics.approvalRate}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{analytics.statusCounts.approved || 0} approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-success-border">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-success uppercase tracking-wider">Today&apos;s Revenue</p>
                <p className="text-2xl font-semibold tabular-nums text-success mt-0.5">${analytics.todayRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border-info-border">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-info uppercase tracking-wider">This Week</p>
                <p className="text-2xl font-semibold tabular-nums text-info mt-0.5">${analytics.thisWeekRevenue.toFixed(0)}</p>
                <div className="mt-1"><TrendBadge value={analytics.revenueTrend} suffix="%" /></div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-warning-border">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-warning uppercase tracking-wider">All Time</p>
                <p className="text-2xl font-semibold tabular-nums text-warning mt-0.5">${analytics.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-warning mt-0.5">{analytics.totalIntakes} total intakes</p>
              </div>
              <Users className="h-8 w-8 text-amber-400 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Activity Chart */}
        <Card className="rounded-xl border-border/50 min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 shrink-0" />
              Daily Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] -ml-2 sm:ml-0">
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
                      boxShadow: "0 4px 12px rgba(2,132,199,0.12)",
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
        <Card className="rounded-xl border-border/50 min-w-0 overflow-hidden">
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
                        {service.name.includes("Medical") && <Stethoscope className="h-4 w-4 text-info" />}
                        {service.name.includes("Script") && <Pill className="h-4 w-4 text-success" />}
                        {service.name.includes("Consult") && <Users className="h-4 w-4 text-warning" />}
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <span className="text-muted-foreground">{service.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
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
      <Card className="rounded-xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-info-light border border-info-border">
              <p className="text-lg font-semibold text-info">{analytics.statusCounts.paid || 0}</p>
              <p className="text-sm text-info">In Queue</p>
            </div>
            <div className="p-3 rounded-xl bg-warning-light border border-warning-border">
              <p className="text-lg font-semibold text-warning">{analytics.statusCounts.in_review || 0}</p>
              <p className="text-sm text-warning">Under Review</p>
            </div>
            <div className="p-3 rounded-xl bg-success-light border border-success-border">
              <p className="text-lg font-semibold text-success">{analytics.statusCounts.approved || 0}</p>
              <p className="text-sm text-success">Approved</p>
            </div>
            <div className="p-3 rounded-xl bg-destructive-light border border-destructive-border">
              <p className="text-lg font-semibold text-destructive">{analytics.statusCounts.declined || 0}</p>
              <p className="text-sm text-destructive">Declined</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Stats */}
      {analytics.priorityCount > 0 && (
        <Card className="rounded-xl border-warning-border bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-warning-light">
                <Zap className="h-6 w-6 text-warning" />
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
