import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CompactCountdown } from '@/components/sla/countdown-timer'
import Link from 'next/link'
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight, Plus } from 'lucide-react'

export default async function PatientDashboardPage() {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return null
  }

  // Fetch patient's intakes
  const { data: intakes } = await supabase
    .from('intakes')
    .select(`
      id,
      reference_number,
      status,
      is_priority,
      created_at,
      submitted_at,
      approved_at,
      sla_deadline,
      services (
        name,
        type
      )
    `)
    .eq('patient_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch unread messages count
  const { count: unreadCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('intake_id', intakes?.map((i) => i.id) || [])
    .in('sender_type', ['admin', 'system'])
    .eq('is_read', false)

  // Get status counts
  const activeIntakes = intakes?.filter((i) =>
    ['paid', 'in_review', 'pending_info'].includes(i.status)
  ).length || 0
  const completedIntakes = intakes?.filter((i) =>
    ['approved', 'completed'].includes(i.status)
  ).length || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back, {profile.first_name || profile.full_name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Manage your medical requests and messages
          </p>
        </div>
        <Button asChild>
          <Link href="/start">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{activeIntakes}</p>
                <p className="text-sm text-muted-foreground">Active Requests</p>
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
                <p className="text-2xl font-semibold">{completedIntakes}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{unreadCount || 0}</p>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Requests</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patient/requests">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {intakes && intakes.length > 0 ? (
            <div className="space-y-4">
              {intakes.map((intake) => (
                <Link
                  key={intake.id}
                  href={`/patient/requests/${intake.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {(intake.services as { name: string }).name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {intake.reference_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* SLA Timer for active intakes */}
                    {['paid', 'in_review', 'pending_info'].includes(intake.status) &&
                      intake.sla_deadline && (
                        <CompactCountdown deadline={intake.sla_deadline} />
                      )}
                    <StatusBadge status={intake.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No requests yet</p>
              <Button asChild className="mt-4">
                <Link href="/start">Create Your First Request</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    pending_payment: { label: 'Awaiting Payment', variant: 'outline' },
    paid: { label: 'In Queue', variant: 'default' },
    in_review: { label: 'Under Review', variant: 'default' },
    pending_info: { label: 'Info Needed', variant: 'destructive' },
    approved: { label: 'Approved', variant: 'default' },
    declined: { label: 'Declined', variant: 'destructive' },
    completed: { label: 'Completed', variant: 'secondary' },
    cancelled: { label: 'Cancelled', variant: 'secondary' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'secondary' }

  return <Badge variant={variant}>{label}</Badge>
}
