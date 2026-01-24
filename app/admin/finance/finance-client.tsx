"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  RotateCcw,
  Clock,
  Receipt,
  ExternalLink,
  AlertTriangle,
  Shield,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
} from "recharts"
import { cn } from "@/lib/utils"

interface FinanceData {
  summary: {
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    totalRefunds: number
    refundRate: number
    avgTransaction: number
    pendingPayments: number
    transactionCount: number
    activeDisputes: number
    recentFraudFlags: number
  }
  dailyRevenue: {
    date: string
    revenue: number
    refunds: number
    count: number
  }[]
  serviceRevenue: {
    type: string
    revenue: number
  }[]
  disputes: {
    id: string
    disputeId: string
    intakeId: string | null
    amount: number
    currency: string
    reason: string
    status: string
    createdAt: string
  }[]
  fraudFlags: {
    id: string
    intakeId: string | null
    patientId: string
    flagType: string
    severity: string
    details: Record<string, unknown>
    createdAt: string
  }[]
}

interface FinanceDashboardClientProps {
  finance: FinanceData
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Med Certs",
    repeat_rx: "Repeat Rx",
    consults: "Consults",
    referrals: "Referrals",
    unknown: "Other",
  }
  return labels[type] || type
}

export function FinanceDashboardClient({ finance }: FinanceDashboardClientProps) {
  const { summary, dailyRevenue, serviceRevenue, disputes, fraudFlags } = finance

  // Format chart data
  const chartData = dailyRevenue.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    Revenue: d.revenue / 100,
    Transactions: d.count,
  }))

  // Calculate week-over-week change
  const thisWeekTotal = dailyRevenue.slice(-7).reduce((sum, d) => sum + d.revenue, 0)
  const lastWeekTotal = dailyRevenue.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0)
  const weekChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/50 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Finance Dashboard</h1>
              <p className="text-sm text-muted-foreground">Revenue, refunds, and financial metrics</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Stripe
            </a>
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-2xl font-semibold">{formatCurrency(summary.todayRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-2xl font-semibold">{formatCurrency(summary.weekRevenue)}</p>
                  {weekChange !== 0 && (
                    <p className={cn("text-xs", weekChange > 0 ? "text-emerald-600" : "text-red-600")}>
                      {weekChange > 0 ? "+" : ""}{weekChange.toFixed(1)}% vs last week
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-50">
                  <Receipt className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-2xl font-semibold">{formatCurrency(summary.monthRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{summary.transactionCount} transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Transaction</p>
                  <p className="text-2xl font-semibold">{formatCurrency(summary.avgTransaction)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Refunds</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(summary.totalRefunds)}</p>
                </div>
                <RotateCcw className="h-5 w-5 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Refund Rate</p>
                  <p className={cn("text-xl font-semibold", summary.refundRate > 5 ? "text-red-600" : "text-foreground")}>
                    {summary.refundRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending Payments</p>
                  <p className="text-xl font-semibold">{summary.pendingPayments}</p>
                </div>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "Revenue" && typeof value === "number" ? `$${value.toFixed(0)}` : value
                      }
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="Revenue"
                      fill="#10b98133"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Transactions"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Service */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Service</CardTitle>
              <CardDescription>Revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceRevenue.map((s) => ({
                        name: formatServiceType(s.type),
                        value: s.revenue / 100,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {serviceRevenue.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => typeof value === "number" ? `$${value.toFixed(0)}` : value} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {serviceRevenue.map((s, i) => (
                  <div key={s.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span>{formatServiceType(s.type)}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(s.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disputes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Stripe Disputes
                  </CardTitle>
                  <CardDescription>Active payment disputes requiring attention</CardDescription>
                </div>
                {summary.activeDisputes > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                    {summary.activeDisputes} active
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {disputes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No disputes recorded</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {disputes.map((d) => (
                    <div key={d.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            d.status === "won" ? "bg-emerald-100 text-emerald-800" :
                            d.status === "lost" ? "bg-red-100 text-red-800" :
                            "bg-amber-100 text-amber-800"
                          )}>
                            {d.status}
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(d.amount)} {d.currency.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Reason: {d.reason.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString("en-AU")}
                          {d.intakeId && ` • Intake: ${d.intakeId.slice(0, 8)}...`}
                        </p>
                      </div>
                      <a
                        href={`https://dashboard.stripe.com/disputes/${d.disputeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fraud Flags */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-500" />
                    Fraud Flags
                  </CardTitle>
                  <CardDescription>Suspicious activity detected by fraud detection</CardDescription>
                </div>
                {summary.recentFraudFlags > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    {summary.recentFraudFlags} high/critical
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {fraudFlags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No fraud flags recorded</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {fraudFlags.map((f) => (
                    <div key={f.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            f.severity === "critical" ? "bg-red-100 text-red-800" :
                            f.severity === "high" ? "bg-orange-100 text-orange-800" :
                            f.severity === "medium" ? "bg-amber-100 text-amber-800" :
                            "bg-gray-100 text-gray-800"
                          )}>
                            {f.severity}
                          </span>
                          <span className="text-sm font-medium">
                            {f.flagType.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(f.createdAt).toLocaleDateString("en-AU")}
                          {f.intakeId && ` • Intake: ${f.intakeId.slice(0, 8)}...`}
                        </p>
                        {f.details && Object.keys(f.details).length > 0 && (
                          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {JSON.stringify(f.details).slice(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
