import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function RevenueAnalyticsPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    { data: allPaid },
    { data: todayPaid },
    { data: weekPaid },
    { data: monthPaid },
    { count: totalCustomers },
  ] = await Promise.all([
    supabase
      .from("intakes")
      .select("amount_cents, category, paid_at")
      .eq("payment_status", "paid"),
    supabase
      .from("intakes")
      .select("amount_cents")
      .eq("payment_status", "paid")
      .gte("paid_at", todayStart.toISOString()),
    supabase
      .from("intakes")
      .select("amount_cents")
      .eq("payment_status", "paid")
      .gte("paid_at", sevenDaysAgo.toISOString()),
    supabase
      .from("intakes")
      .select("amount_cents")
      .eq("payment_status", "paid")
      .gte("paid_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "patient"),
  ])

  const sumCents = (items: { amount_cents: number }[] | null) =>
    (items || []).reduce((sum, i) => sum + (i.amount_cents || 0), 0)

  const formatAUD = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`

  const todayRevenue = sumCents(todayPaid)
  const weekRevenue = sumCents(weekPaid)
  const monthRevenue = sumCents(monthPaid)
  const allTimeRevenue = sumCents(allPaid)

  // Service breakdown
  const serviceBreakdown = new Map<string, number>()
  for (const intake of allPaid || []) {
    const cat = intake.category || "other"
    serviceBreakdown.set(
      cat,
      (serviceBreakdown.get(cat) || 0) + (intake.amount_cents || 0)
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
          aria-hidden="true"
        >
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Financial overview and metrics
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Revenue summary cards"
      >
        {[
          { label: "Today", value: todayRevenue, icon: DollarSign },
          { label: "This Week", value: weekRevenue, icon: TrendingUp },
          { label: "This Month", value: monthRevenue, icon: CreditCard },
          { label: "All Time", value: allTimeRevenue, icon: DollarSign },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-card p-4"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {formatAUD(stat.value)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Total Patients
          </span>
        </div>
        <p className="text-2xl font-semibold">
          {totalCustomers?.toLocaleString()}
        </p>
      </div>

      {/* Service breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Revenue by Service</h2>
        <div className="space-y-2" role="list" aria-label="Revenue by service category">
          {Array.from(serviceBreakdown.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([category, cents]) => (
              <div
                key={category}
                role="listitem"
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3"
              >
                <span className="font-medium capitalize">
                  {category.replace(/_/g, " ")}
                </span>
                <span className="font-semibold">{formatAUD(cents)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
