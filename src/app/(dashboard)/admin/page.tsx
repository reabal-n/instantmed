import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Inbox,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Get queue stats
  const { count: queueCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])

  // Get breached count
  const { count: breachedCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])
    .eq('sla_breached', true)

  // Get at-risk count (within 30 min of deadline)
  const warningThreshold = new Date(Date.now() + 30 * 60 * 1000)
  const { count: atRiskCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])
    .lt('sla_deadline', warningThreshold.toISOString())
    .gt('sla_deadline', new Date().toISOString())

  // Get completed today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { count: completedToday } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['approved', 'declined'])
    .gte('updated_at', startOfDay.toISOString())

  // Get recent high-risk intakes
  const { data: highRiskIntakes } = await supabase
    .from('intakes')
    .select(`
      id,
      reference_number,
      status,
      risk_tier,
      sla_deadline,
      services (name)
    `)
    .in('status', ['paid', 'in_review'])
    .in('risk_tier', ['high', 'critical'])
    .order('created_at', { ascending: true })
    .limit(5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of the review queue and key metrics
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/queue">
            Go to Queue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">{queueCount || 0}</p>
                <p className="text-sm text-muted-foreground">In Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={breachedCount ? 'border-red-200 bg-red-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">{breachedCount || 0}</p>
                <p className="text-sm text-muted-foreground">SLA Breached</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={atRiskCount ? 'border-amber-200 bg-amber-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold">{atRiskCount || 0}</p>
                <p className="text-sm text-muted-foreground">At Risk (&lt;30m)</p>
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
                <p className="text-3xl font-semibold">{completedToday || 0}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Alert */}
      {highRiskIntakes && highRiskIntakes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" />
              High Risk Intakes Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highRiskIntakes.map((intake) => (
                <Link
                  key={intake.id}
                  href={`/admin/intakes/${intake.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{intake.reference_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {(intake.services as { name: string }).name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        intake.risk_tier === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {intake.risk_tier?.toUpperCase()}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/queue?filter=priority">
            <CardContent className="pt-6">
              <TrendingUp className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-medium">Priority Queue</h3>
              <p className="text-sm text-muted-foreground">
                View priority requests first
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/queue?filter=breached">
            <CardContent className="pt-6">
              <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
              <h3 className="font-medium">SLA Breaches</h3>
              <p className="text-sm text-muted-foreground">
                Handle overdue requests
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/queue?filter=pending_info">
            <CardContent className="pt-6">
              <Clock className="w-8 h-8 text-amber-500 mb-2" />
              <h3 className="font-medium">Awaiting Response</h3>
              <p className="text-sm text-muted-foreground">
                Requests pending patient info
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  )
}
