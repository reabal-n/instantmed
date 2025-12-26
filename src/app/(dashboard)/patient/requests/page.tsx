import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CompactCountdown } from '@/components/sla/countdown-timer'
import Link from 'next/link'
import { FileText, Plus, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function PatientRequestsPage() {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return null
  }

  // Fetch all patient's intakes
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
      completed_at,
      sla_deadline,
      amount_cents,
      services (
        name,
        type,
        slug
      )
    `)
    .eq('patient_id', profile.id)
    .order('created_at', { ascending: false })

  // Group by status
  const activeIntakes = intakes?.filter((i) =>
    ['paid', 'in_review', 'pending_info'].includes(i.status)
  ) || []
  const draftIntakes = intakes?.filter((i) =>
    ['draft', 'pending_payment'].includes(i.status)
  ) || []
  const completedIntakes = intakes?.filter((i) =>
    ['approved', 'completed', 'declined', 'cancelled'].includes(i.status)
  ) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Requests</h1>
          <p className="text-muted-foreground">
            View and manage all your medical requests
          </p>
        </div>
        <Button asChild>
          <Link href="/start">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Active Requests */}
      {activeIntakes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Active Requests</h2>
          <div className="space-y-4">
            {activeIntakes.map((intake) => (
              <RequestCard key={intake.id} intake={intake} />
            ))}
          </div>
        </section>
      )}

      {/* Draft Requests */}
      {draftIntakes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Drafts & Pending Payment</h2>
          <div className="space-y-4">
            {draftIntakes.map((intake) => (
              <RequestCard key={intake.id} intake={intake} />
            ))}
          </div>
        </section>
      )}

      {/* Completed Requests */}
      {completedIntakes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Completed</h2>
          <div className="space-y-4">
            {completedIntakes.map((intake) => (
              <RequestCard key={intake.id} intake={intake} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {(!intakes || intakes.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 font-medium">No requests yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start your first medical consultation request
            </p>
            <Button asChild className="mt-6">
              <Link href="/start">Get Started</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RequestCard({ intake }: { intake: Record<string, unknown> }) {
  const service = intake.services as { name: string; type: string; slug: string }
  const status = intake.status as string

  return (
    <Link
      href={`/patient/requests/${intake.id}`}
      className="block"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{service.name}</h3>
                  {intake.is_priority && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      Priority
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{intake.reference_number as string}</span>
                  <span>•</span>
                  <span>{formatDate(intake.created_at as string)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {/* SLA Timer */}
              {['paid', 'in_review', 'pending_info'].includes(status) &&
                intake.sla_deadline && (
                  <CompactCountdown deadline={intake.sla_deadline as string} />
                )}

              <StatusBadge status={status} />
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    pending_payment: { label: 'Awaiting Payment', variant: 'outline' },
    paid: { label: 'In Queue', variant: 'default' },
    in_review: { label: 'Under Review', variant: 'default' },
    pending_info: { label: 'Action Required', variant: 'destructive' },
    approved: { label: 'Approved', variant: 'default' },
    declined: { label: 'Declined', variant: 'destructive' },
    completed: { label: 'Completed', variant: 'secondary' },
    cancelled: { label: 'Cancelled', variant: 'secondary' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'secondary' }

  return <Badge variant={variant}>{label}</Badge>
}
