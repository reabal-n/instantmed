'use client'

import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import {
  FileText,
  CreditCard,
  Clock,
  Search,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

interface Intake {
  status: string
  created_at: string
  submitted_at: string | null
  paid_at: string | null
  reviewed_at: string | null
  approved_at: string | null
  declined_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  admin_actions?: Array<{
    action_type: string
    created_at: string
    notes: string | null
  }>
}

interface StatusTimelineProps {
  intake: Intake
}

interface TimelineEvent {
  id: string
  icon: React.ElementType
  title: string
  description: string
  timestamp: string | null
  status: 'completed' | 'current' | 'pending'
}

export function StatusTimeline({ intake }: StatusTimelineProps) {
  const events = buildTimeline(intake)

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {events.map((event, index) => {
          const Icon = event.icon
          const isCompleted = event.status === 'completed'
          const isCurrent = event.status === 'current'

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon */}
              <div
                className={cn(
                  'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'bg-background border-primary text-primary',
                  !isCompleted && !isCurrent && 'bg-muted border-border text-muted-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      'font-medium',
                      !isCompleted && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {event.title}
                  </h4>
                  {event.timestamp && (
                    <time className="text-sm text-muted-foreground">
                      {formatRelativeTime(event.timestamp)}
                    </time>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {event.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildTimeline(intake: Intake): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const currentStatus = intake.status

  // 1. Request Created
  events.push({
    id: 'created',
    icon: FileText,
    title: 'Request Created',
    description: 'Your request was submitted',
    timestamp: intake.created_at,
    status: 'completed',
  })

  // 2. Payment (if applicable)
  if (intake.paid_at || ['paid', 'in_review', 'pending_info', 'approved', 'declined', 'completed'].includes(currentStatus)) {
    events.push({
      id: 'paid',
      icon: CreditCard,
      title: 'Payment Received',
      description: 'Your request entered the doctor queue',
      timestamp: intake.paid_at,
      status: intake.paid_at ? 'completed' : 'pending',
    })
  }

  // 3. In Queue
  if (['paid', 'in_review', 'pending_info', 'approved', 'declined', 'completed'].includes(currentStatus)) {
    events.push({
      id: 'queued',
      icon: Clock,
      title: 'In Queue',
      description: 'Waiting for doctor review',
      timestamp: intake.paid_at,
      status: currentStatus === 'paid' ? 'current' : 'completed',
    })
  }

  // 4. Under Review
  if (['in_review', 'pending_info', 'approved', 'declined', 'completed'].includes(currentStatus)) {
    events.push({
      id: 'review',
      icon: Search,
      title: 'Under Review',
      description: 'A doctor is reviewing your request',
      timestamp: intake.reviewed_at,
      status: currentStatus === 'in_review' ? 'current' : 'completed',
    })
  }

  // 5. Info Requested (if applicable)
  if (currentStatus === 'pending_info' || intake.admin_actions?.some(a => a.action_type === 'requested_info')) {
    events.push({
      id: 'info_requested',
      icon: MessageSquare,
      title: 'Information Requested',
      description: 'The doctor needs more information',
      timestamp: intake.admin_actions?.find(a => a.action_type === 'requested_info')?.created_at || null,
      status: currentStatus === 'pending_info' ? 'current' : 'completed',
    })
  }

  // 6. Final Status
  if (currentStatus === 'approved' || currentStatus === 'completed') {
    events.push({
      id: 'approved',
      icon: CheckCircle,
      title: 'Approved',
      description: 'Your request was approved',
      timestamp: intake.approved_at,
      status: 'completed',
    })
  } else if (currentStatus === 'declined') {
    events.push({
      id: 'declined',
      icon: XCircle,
      title: 'Declined',
      description: 'Your request could not be approved',
      timestamp: intake.declined_at,
      status: 'completed',
    })
  } else if (currentStatus === 'cancelled') {
    events.push({
      id: 'cancelled',
      icon: XCircle,
      title: 'Cancelled',
      description: 'Request was cancelled',
      timestamp: intake.cancelled_at,
      status: 'completed',
    })
  }

  // Add pending future steps
  if (!['approved', 'declined', 'completed', 'cancelled'].includes(currentStatus)) {
    if (!events.find(e => e.id === 'approved')) {
      events.push({
        id: 'approved',
        icon: CheckCircle,
        title: 'Approval',
        description: 'Pending doctor decision',
        timestamp: null,
        status: 'pending',
      })
    }
  }

  return events
}
