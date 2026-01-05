import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import {
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  DollarSign,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

// Move TrendIndicator outside of the component to avoid recreating it on each render
function TrendIndicator({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>
  const isPositive = value > 0
  return (
    <div className={`flex items-center gap-1 text-xs ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      <span>
        {isPositive ? "+" : ""}
        {value}
        {suffix}
      </span>
    </div>
  )
}

export const metadata = {
  title: "Analytics | InstantMed Doctor Portal",
}

async function getAnalytics() {
  const supabase = await createClient()

  // Get requests by status
  const { data: statusCounts } = await supabase.from("requests").select("status")

  // Get requests by category
  const { data: categoryCounts } = await supabase.from("requests").select("category")

  // Get requests by day (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get requests from previous 7 days for comparison
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: recentRequests } = await supabase
    .from("requests")
    .select("created_at, status")
    .gte("created_at", sevenDaysAgo.toISOString())

  const { data: previousRequests } = await supabase
    .from("requests")
    .select("created_at")
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString())

  // Get total patients
  const { count: patientCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient")

  // Get previous week's patient count for trend
  const { count: previousPatientCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient")
    .lt("created_at", sevenDaysAgo.toISOString())

  // Get payments data for revenue
  const { data: payments } = await supabase
    .from("payments")
    .select("amount_paid, created_at, status")
    .eq("status", "paid")

  const recentRevenue = (payments || [])
    .filter((p) => new Date(p.created_at) >= sevenDaysAgo)
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0)

  const previousRevenue = (payments || [])
    .filter((p) => new Date(p.created_at) >= fourteenDaysAgo && new Date(p.created_at) < sevenDaysAgo)
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0)

  // Calculate stats
  const statusBreakdown = (statusCounts || []).reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  const categoryBreakdown = (categoryCounts || []).reduce((acc: Record<string, number>, r) => {
    const cat = r.category || "uncategorized"
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  // Requests per day
  const dailyRequests = (recentRequests || []).reduce((acc: Record<string, number>, r) => {
    const day = new Date(r.created_at).toLocaleDateString("en-AU", { weekday: "short" })
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {})

  // Calculate trends
  const currentWeekRequests = recentRequests?.length || 0
  const previousWeekRequests = previousRequests?.length || 0
  const requestsTrend =
    previousWeekRequests > 0
      ? Math.round(((currentWeekRequests - previousWeekRequests) / previousWeekRequests) * 100)
      : 0

  const revenueTrend = previousRevenue > 0 ? Math.round(((recentRevenue - previousRevenue) / previousRevenue) * 100) : 0

  const patientTrend =
    (previousPatientCount || 0) > 0
      ? Math.round((((patientCount || 0) - (previousPatientCount || 0)) / (previousPatientCount || 1)) * 100)
      : 0

  // Average response time (time from pending to approved/declined)
  const { data: completedRequests } = await supabase
    .from("requests")
    .select("created_at, updated_at, status")
    .in("status", ["approved", "declined"])
    .gte("updated_at", sevenDaysAgo.toISOString())

  const avgResponseTime =
    completedRequests && completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime()
          const updated = new Date(r.updated_at).getTime()
          return sum + (updated - created)
        }, 0) /
        completedRequests.length /
        (1000 * 60 * 60) // Convert to hours
      : 0

  return {
    totalRequests: statusCounts?.length || 0,
    totalPatients: patientCount || 0,
    statusBreakdown,
    categoryBreakdown,
    dailyRequests,
    avgPerDay: Math.round((recentRequests?.length || 0) / 7),
    recentRevenue: recentRevenue / 100, // Convert cents to dollars
    totalRevenue: (payments || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0) / 100,
    requestsTrend,
    revenueTrend,
    patientTrend,
    avgResponseTime: Math.round(avgResponseTime * 10) / 10, // Round to 1 decimal
  }
}

export default async function AnalyticsPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const analytics = await getAnalytics()

  const categoryLabels: Record<string, string> = {
    medical_certificate: "Med Certs",
    prescription: "Prescriptions",
    referral: "Referrals",
    uncategorized: "Other",
  }

  const categoryColors: Record<string, string> = {
    medical_certificate: "bg-primary",
    prescription: "bg-purple-500",
    referral: "bg-emerald-500",
    uncategorized: "bg-gray-400",
  }

  const totalCategoryRequests = Object.values(analytics.categoryBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Overview of platform activity and trends</p>
          </div>
        </div>
      </div>

      {/* Key Metrics - Enhanced with more metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <Card
          className="glass-card p-5 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Requests</span>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{analytics.totalRequests}</p>
          <TrendIndicator value={analytics.requestsTrend} suffix="% this week" />
        </Card>

        <Card
          className="glass-card p-5 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Patients</span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{analytics.totalPatients}</p>
          <TrendIndicator value={analytics.patientTrend} suffix="% growth" />
        </Card>

        <Card
          className="glass-card p-5 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.22s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Weekly Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-semibold text-foreground">${analytics.recentRevenue.toFixed(0)}</p>
          <TrendIndicator value={analytics.revenueTrend} suffix="% vs last week" />
        </Card>

        <Card
          className="glass-card p-5 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg. Response</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{analytics.avgResponseTime}h</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <span>Average turnaround</span>
          </div>
        </Card>

        <Card
          className="glass-card p-5 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Approval Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-semibold text-foreground">
            {analytics.totalRequests > 0
              ? Math.round(((analytics.statusBreakdown.approved || 0) / analytics.totalRequests) * 100)
              : 0}
            %
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
            <TrendingUp className="w-3 h-3" />
            <span>Approved requests</span>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card
          className="glass-card p-6 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Requests by Category</h3>
          </div>
          {totalCategoryRequests === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(analytics.categoryBreakdown).map(([category, count]) => {
                const percentage = totalCategoryRequests > 0 ? Math.round((count / totalCategoryRequests) * 100) : 0
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{categoryLabels[category] || category}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${categoryColors[category] || "bg-gray-400"} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Status Breakdown */}
        <Card
          className="glass-card p-6 rounded-2xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Requests by Status</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
              <p className="text-2xl font-semibold text-amber-700">{analytics.statusBreakdown.pending || 0}</p>
              <p className="text-sm text-amber-600">Pending</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <p className="text-2xl font-semibold text-emerald-700">{analytics.statusBreakdown.approved || 0}</p>
              <p className="text-sm text-emerald-600">Approved</p>
            </div>
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
              <p className="text-2xl font-semibold text-red-700">{analytics.statusBreakdown.declined || 0}</p>
              <p className="text-sm text-red-600">Declined</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50/50 border border-primary">
              <p className="text-2xl font-semibold text-primary">{analytics.statusBreakdown.needs_follow_up || 0}</p>
              <p className="text-sm text-primary">Follow-up</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Activity */}
      <Card
        className="glass-card p-6 rounded-2xl animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.45s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground">Daily Activity (Last 7 Days)</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>Avg: {analytics.avgPerDay}/day</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => {
            const count = analytics.dailyRequests[day] || 0
            const maxCount = Math.max(...Object.values(analytics.dailyRequests), 1)
            const height = (count / maxCount) * 100
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex justify-center">
                  <div
                    className="w-8 bg-linear-to-t from-primary to-primary/70 rounded-t-lg transition-all duration-500 hover:from-primary/90 hover:to-primary/60"
                    style={{ height: `${Math.max(height, 4)}px` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{day}</span>
                <span className="text-xs font-medium text-foreground">{count}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card
        className="glass-card p-6 rounded-2xl animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue (All Time)</p>
            <p className="text-3xl font-bold text-foreground">
              ${analytics.totalRevenue.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </Card>
    </div>
  )
}
