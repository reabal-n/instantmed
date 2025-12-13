import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  AlertTriangle,
} from 'lucide-react'

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  // Get date ranges
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Total intakes
  const { count: totalIntakes } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'draft')

  // Intakes this month
  const { count: monthlyIntakes } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())
    .neq('status', 'draft')

  // Approved count
  const { count: approvedCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('approved_at', thirtyDaysAgo.toISOString())

  // Declined count
  const { count: declinedCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'declined')
    .gte('declined_at', thirtyDaysAgo.toISOString())

  // SLA breaches this month
  const { count: breachCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .eq('sla_breached', true)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Average response time (placeholder - would need more complex query)
  const avgResponseTime = '42 min'

  // Total patients
  const { count: totalPatients } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'patient')

  // Revenue (sum of paid intakes)
  const { data: revenueData } = await supabase
    .from('intakes')
    .select('amount_cents')
    .in('payment_status', ['paid'])
    .gte('paid_at', thirtyDaysAgo.toISOString())

  const monthlyRevenue = revenueData?.reduce((sum, i) => sum + (i.amount_cents || 0), 0) || 0

  // Service breakdown
  const { data: serviceBreakdown } = await supabase
    .from('intakes')
    .select(`
      services (name),
      status
    `)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .neq('status', 'draft')

  // Group by service
  const serviceStats: Record<string, number> = {}
  serviceBreakdown?.forEach((intake) => {
    const name = (intake.services as { name: string })?.name || 'Unknown'
    serviceStats[name] = (serviceStats[name] || 0) + 1
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Performance metrics for the last 30 days
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">{monthlyIntakes || 0}</p>
                <p className="text-sm text-muted-foreground">Requests (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">{approvedCount || 0}</p>
                <p className="text-sm text-muted-foreground">Approved (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">{avgResponseTime}</p>
                <p className="text-sm text-muted-foreground">Avg. Response</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">
                  ${(monthlyRevenue / 100).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Revenue (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{totalPatients || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Decline Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">
              {monthlyIntakes
                ? ((declinedCount || 0) / monthlyIntakes * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {declinedCount || 0} declined this month
            </p>
          </CardContent>
        </Card>

        <Card className={breachCount ? 'border-red-200' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SLA Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-red-600">
              {breachCount || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(serviceStats)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => {
                const percentage = monthlyIntakes
                  ? (count / monthlyIntakes * 100).toFixed(1)
                  : 0

                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{name}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}

            {Object.keys(serviceStats).length === 0 && (
              <p className="text-muted-foreground text-sm">
                No data available for this period
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}