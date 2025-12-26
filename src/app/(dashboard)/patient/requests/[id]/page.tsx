import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SlaProgressBar } from '@/components/sla/countdown-timer'
import { StatusTimeline } from '@/components/dashboard/status-timeline'
import { MessageThread } from '@/components/messaging/message-thread'
import { TaskList } from '@/components/dashboard/task-list'
import Link from 'next/link'
import { ArrowLeft, Download, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  // Fetch intake with all related data
  const { data: intake, error } = await supabase
    .from('intakes')
    .select(`
      *,
      services (
        name,
        type,
        slug,
        price_cents
      ),
      intake_answers (
        answers
      ),
      admin_actions (
        id,
        action_type,
        notes,
        questions_asked,
        created_at,
        profiles:admin_id (
          full_name
        )
      )
    `)
    .eq('id', id)
    .eq('patient_id', profile.id)
    .single()

  if (error || !intake) {
    notFound()
  }

  const service = intake.services as { name: string; type: string; slug: string; price_cents: number }
  const isActive = ['paid', 'in_review', 'pending_info'].includes(intake.status)
  const needsAction = intake.status === 'pending_info'

  // Get pending info request if any
  const infoRequest = intake.admin_actions?.find(
    (a: { action_type: string }) => a.action_type === 'requested_info'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patient/requests">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{service.name}</h1>
            <StatusBadge status={intake.status} />
          </div>
          <p className="text-muted-foreground">
            Reference: {intake.reference_number}
          </p>
        </div>
        {intake.generated_document_url && (
          <Button asChild>
            <a href={intake.generated_document_url} target="_blank" rel="noopener">
              <Download className="w-4 h-4 mr-2" />
              Download Document
            </a>
          </Button>
        )}
      </div>

      {/* Action Required Alert */}
      {needsAction && infoRequest && (
        <Alert variant="warning">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            The doctor has requested additional information. Please respond to continue
            processing your request.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Status & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* SLA Progress (for active intakes) */}
          {isActive && intake.sla_deadline && intake.submitted_at && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Estimated Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SlaProgressBar
                  deadline={intake.sla_deadline}
                  submittedAt={intake.submitted_at}
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  {intake.is_priority
                    ? 'Your request has priority processing and will be reviewed within 1 hour.'
                    : 'Standard requests are typically reviewed within 24 hours.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tasks (for pending_info status) */}
          {needsAction && infoRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Required Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList
                  intakeId={intake.id}
                  questions={infoRequest.questions_asked}
                  adminNotes={infoRequest.notes}
                />
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline intake={intake} />
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MessageThread
                intakeId={intake.id}
                patientId={profile.id}
                canSendMessages={!['approved', 'declined', 'completed', 'cancelled'].includes(intake.status)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{service.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="font-mono">{intake.reference_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p>{intake.submitted_at ? formatDate(intake.submitted_at) : 'Not submitted'}</p>
              </div>
              {intake.amount_cents && (
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p>${(intake.amount_cents / 100).toFixed(2)} AUD</p>
                </div>
              )}
              {intake.is_priority && (
                <div>
                  <Badge variant="secondary">Priority Processing</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document (if approved) */}
          {intake.status === 'approved' && intake.generated_document_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Your Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    {intake.generated_document_type || 'Document'}
                  </p>
                  <Button className="mt-4" asChild>
                    <a href={intake.generated_document_url} target="_blank" rel="noopener">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
                {intake.document_sent_at && (
                  <p className="mt-4 text-sm text-muted-foreground text-center">
                    Sent to your email on {formatDate(intake.document_sent_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you have questions about your request, use the message thread above
                or contact our support team.
              </p>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/contact">Contact Support</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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
