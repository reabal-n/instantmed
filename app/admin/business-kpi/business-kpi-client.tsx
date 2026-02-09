"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  FileText,
  Clock,
  Users,
  Mail,
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Loader2,
  Shield,
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface KPIData {
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
    weeklyTrend: number
    daily: Array<{ date: string; revenue: number }>
  }
  certs: {
    today: number
    thisWeek: number
  }
  sla: {
    avgMinutes: number
    breaches: number
    queueSize: number
  }
  doctors: {
    active: number
    utilizationRate: number
    reviewsThisWeek: number
  }
  email: {
    deliveryRate: number
    sentThisWeek: number
    failedThisWeek: number
  }
  funnel: {
    pageViews: number
    started: number
    paid: number
    approved: number
    conversionRate: number
  }
  referrals: Array<{ source: string; count: number }>
  refunds: {
    totalMonth: number
    rate: number
  }
  launchReadiness: {
    score: number
    checks: Record<string, boolean>
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const readinessLabels: Record<string, string> = {
  hasRevenue: "Revenue flowing",
  hasCertificates: "Certificates issuing",
  slaHealthy: "No SLA breaches",
  emailHealthy: "Email delivery 95%+",
  doctorsActive: "Doctors active",
  queueManageable: "Queue under control",
  refundRateLow: "Refund rate < 10%",
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BusinessKPIClient({ data }: { data: KPIData }) {
  const [isRefreshing, startRefresh] = useTransition()
  const router = useRouter()

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh()
    })
  }

  const readinessColor = data.launchReadiness.score >= 85
    ? "text-green-600"
    : data.launchReadiness.score >= 60
    ? "text-amber-600"
    : "text-red-600"

  const readinessBg = data.launchReadiness.score >= 85
    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
    : data.launchReadiness.score >= 60
    ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
    : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business KPI Dashboard</h1>
          <p className="text-muted-foreground">Real-time telehealth launch metrics from Supabase</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Launch Readiness Scorecard */}
      <Card className={`border-2 ${readinessBg}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Launch Readiness
            <span className={`text-3xl font-bold ml-auto ${readinessColor}`}>
              {data.launchReadiness.score}%
            </span>
          </CardTitle>
          <CardDescription>System health aggregation across 7 key indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(data.launchReadiness.checks).map(([key, passed]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {passed ? (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className={passed ? "text-muted-foreground" : "font-medium"}>
                  {readinessLabels[key] || key}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Primary KPIs - 4 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.revenue.thisMonth)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {data.revenue.weeklyTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={data.revenue.weeklyTrend >= 0 ? "text-green-600" : "text-red-500"}>
                {data.revenue.weeklyTrend >= 0 ? "+" : ""}{data.revenue.weeklyTrend}%
              </span>
              <span>vs last week</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Today: {formatCurrency(data.revenue.today)} | This week: {formatCurrency(data.revenue.thisWeek)}
            </p>
          </CardContent>
        </Card>

        {/* Med Certs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Med Certs Issued</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.certs.thisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
            <p className="text-xs text-muted-foreground">Today: {data.certs.today}</p>
          </CardContent>
        </Card>

        {/* Avg SLA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment to Delivery</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(data.sla.avgMinutes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.sla.breaches > 0 ? (
                <span className="text-red-500 font-medium">{data.sla.breaches} SLA breach{data.sla.breaches !== 1 ? "es" : ""}</span>
              ) : (
                <span className="text-green-600">No SLA breaches</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{data.sla.queueSize} in queue</p>
          </CardContent>
        </Card>

        {/* Doctor Utilization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctor Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.doctors.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.doctors.active} active doctor{data.doctors.active !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">{data.doctors.reviewsThisWeek} reviews this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Email Delivery */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Delivery Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.email.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.email.sentThisWeek} sent this week
              {data.email.failedThisWeek > 0 && (
                <span className="text-red-500"> | {data.email.failedThisWeek} failed</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intake → Payment Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.funnel.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.funnel.paid} paid of {data.funnel.started} started (30d)
            </p>
          </CardContent>
        </Card>

        {/* Refund Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.refunds.rate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.refunds.totalMonth)} refunded this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart + Conversion Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Daily Revenue (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.revenue.daily.map((day) => {
                const maxRevenue = Math.max(...data.revenue.daily.map(d => d.revenue), 1)
                const pct = (day.revenue / maxRevenue) * 100
                const label = day.date.slice(5) // MM-DD
                return (
                  <div key={day.date} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground shrink-0">{label}</span>
                    <div className="flex-1 bg-secondary rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right font-mono text-muted-foreground">
                      {day.revenue > 0 ? formatCurrency(day.revenue) : "-"}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion Funnel (30 days)
            </CardTitle>
            <CardDescription>From page views to approved certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { step: "Page Views / Sessions", value: data.funnel.pageViews },
                { step: "Intakes Started", value: data.funnel.started },
                { step: "Payment Completed", value: data.funnel.paid },
                { step: "Doctor Approved", value: data.funnel.approved },
              ].map((item, idx, arr) => {
                const maxVal = Math.max(arr[0].value, 1)
                const pct = (item.value / maxVal) * 100
                const dropOff = idx > 0 && arr[idx - 1].value > 0
                  ? Math.round(((arr[idx - 1].value - item.value) / arr[idx - 1].value) * 100)
                  : 0
                return (
                  <div key={item.step} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.step}</span>
                      <div className="flex items-center gap-3">
                        <span>{item.value.toLocaleString()}</span>
                        {idx > 0 && dropOff > 0 && (
                          <span className="text-red-500 text-xs">-{dropOff}%</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Referral Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Top Referral Sources (30 days)
          </CardTitle>
          <CardDescription>Where your paid intakes are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          {data.referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No UTM-tagged traffic recorded yet</p>
          ) : (
            <div className="space-y-3">
              {data.referrals.map((ref, idx) => {
                const maxCount = data.referrals[0]?.count || 1
                const pct = (ref.count / maxCount) * 100
                return (
                  <div key={ref.source} className="flex items-center gap-3">
                    <span className="w-6 text-sm text-muted-foreground text-right">{idx + 1}.</span>
                    <span className="w-32 text-sm font-medium truncate">{ref.source}</span>
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {ref.count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
