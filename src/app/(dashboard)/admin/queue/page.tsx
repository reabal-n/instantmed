import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompactCountdown } from '@/components/sla/countdown-timer'
import Link from 'next/link'
import {
  ChevronRight,
  Filter,
  AlertTriangle,
  Clock,
  User,
  Zap,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { QueueFilters } from '@/components/admin/queue-filters'

interface Props {
  searchParams: Promise<{
    status?: string
    service?: string
    risk?: string
    filter?: string
  }>
}

export default async function AdminQueuePage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('intakes')
    .select(`
      id,
      reference_number,
      status,
      is_priority,
      risk_tier,
      risk_score,
      sla_deadline,
      sla_breached,
      created_at,
      submitted_at,
      assigned_admin_id,
      profiles!patient_id (
        id,
        full_name,
        email,
        date_of_birth
      ),
      services (
        id,
        name,
        type,
        slug
      )
    `)

  // Apply filters
  if (params.filter === 'breached') {
    query = query.eq('sla_breached', true).in('status', ['paid', 'in_review'])
  } else if (params.filter === 'priority') {
    query = query.eq('is_priority', true).in('status', ['paid', 'in_review'])
  } else if (params.filter === 'pending_info') {
    query = query.eq('status', 'pending_info')
  } else if (params.status) {
    query = query.eq('status', params.status)
  } else {
    query = query.in('status', ['paid', 'in_review', 'pending_info'])
  }

  if (params.service) {
    query = query.eq('services.slug', params.service)
  }

  if (params.risk) {
    query = query.eq('risk_tier', params.risk)
  }

  // Order by: breached first, then priority, then SLA deadline
  query = query
    .order('sla_breached', { ascending: false })
    .order('is_priority', { ascending: false })
    .order('sla_deadline', { ascending: true, nullsFirst: false })

  const { data: intakes, error } = await query.limit(50)

  // Get counts for filters
  const { count: totalCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])

  const { count: breachedCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review'])
    .eq('sla_breached', true)

  const { count: priorityCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review'])
    .eq('is_priority', true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review Queue</h1>
          <p className="text-muted-foreground">
            {totalCount || 0} requests awaiting review
          </p>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!params.filter ? 'default' : 'outline'}
          size="sm"
          asChild
        >
          <Link href="/admin/queue">
            All ({totalCount || 0})
          </Link>
        </Button>
        <Button
          variant={params.filter === 'breached' ? 'destructive' : 'outline'}
          size="sm"
          asChild
        >
          <Link href="/admin/queue?filter=breached">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Breached ({breachedCount || 0})
          </Link>
        </Button>
        <Button
          variant={params.filter === 'priority' ? 'default' : 'outline'}
          size="sm"
          asChild
        >
          <Link href="/admin/queue?filter=priority">
            <Zap className="w-3 h-3 mr-1" />
            Priority ({priorityCount || 0})
          </Link>
        </Button>
        <Button
          variant={params.filter === 'pending_info' ? 'default' : 'outline'}
          size="sm"
          asChild
        >
          <Link href="/admin/queue?filter=pending_info">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting Info
          </Link>
        </Button>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {intakes && intakes.length > 0 ? (
          intakes.map((intake) => {
            const patient = intake.profiles as unknown as {
              id: string
              full_name: string
              email: string
              date_of_birth: string
            }
            const service = intake.services as unknown as {
              name: string
              type: string
            }

            return (
              <Link key={intake.id} href={`/admin/intakes/${intake.id}`}>
                <Card
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    intake.sla_breached
                      ? 'border-red-300 bg-red-50/50'
                      : intake.is_priority
                      ? 'border-primary/50 bg-primary/5'
                      : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Risk indicator */}
                      <div
                        className={`w-2 h-12 rounded-full ${
                          intake.risk_tier === 'critical'
                            ? 'bg-red-500'
                            : intake.risk_tier === 'high'
                            ? 'bg-orange-500'
                            : intake.risk_tier === 'moderate'
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                      />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            {intake.reference_number}
                          </span>
                          {intake.is_priority && (
                            <Badge className="gap-1">
                              <Zap className="w-3 h-3" />
                              Priority
                            </Badge>
                          )}
                          {intake.sla_breached && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              SLA Breached
                            </Badge>
                          )}
                          <RiskBadge tier={intake.risk_tier} />
                          <StatusBadge status={intake.status} />
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {patient.full_name}
                          </span>
                          <span>{service.name}</span>
                          <span>
                            Submitted {formatRelativeTime(intake.submitted_at || intake.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* SLA Timer */}
                      {intake.sla_deadline && !['pending_info'].includes(intake.status) && (
                        <CompactCountdown deadline={intake.sla_deadline} />
                      )}

                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">Queue is empty</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No requests matching the current filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function RiskBadge({ tier }: { tier: string | null }) {
  if (!tier || tier === 'low') return null

  const config: Record<string, { label: string; className: string }> = {
    moderate: { label: 'Moderate', className: 'bg-amber-100 text-amber-700' },
    high: { label: 'High Risk', className: 'bg-orange-100 text-orange-700' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  }

  const { label, className } = config[tier] || { label: tier, className: '' }

  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>{label}</span>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    paid: { label: 'In Queue', variant: 'outline' },
    in_review: { label: 'Reviewing', variant: 'default' },
    pending_info: { label: 'Awaiting Info', variant: 'secondary' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'secondary' }

  return <Badge variant={variant}>{label}</Badge>
}
