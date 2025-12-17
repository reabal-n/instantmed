'use client'

import { motion } from 'framer-motion'
import { Check, Clock, FileText, User, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RequestStatus = 
  | 'pending_review'
  | 'under_review' 
  | 'needs_info'
  | 'approved'
  | 'completed'
  | 'declined'

interface TimelineStep {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 'submitted',
    label: 'Request submitted',
    description: 'Your request has been received',
    icon: Send,
  },
  {
    id: 'review',
    label: 'Doctor review',
    description: 'A doctor is reviewing your request',
    icon: User,
  },
  {
    id: 'processing',
    label: 'Processing',
    description: 'Preparing your document',
    icon: FileText,
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Ready for download',
    icon: Check,
  },
]

// Map status to completed steps
const STATUS_TO_STEP: Record<RequestStatus, number> = {
  pending_review: 0,
  under_review: 1,
  needs_info: 1,
  approved: 2,
  completed: 3,
  declined: -1,
}

interface StatusTimelineProps {
  currentStatus: RequestStatus
  submittedAt: string
  reviewStartedAt?: string
  approvedAt?: string
  completedAt?: string
  className?: string
}

export function StatusTimeline({
  currentStatus,
  submittedAt,
  reviewStartedAt,
  approvedAt,
  completedAt,
  className,
}: StatusTimelineProps) {
  const currentStepIndex = STATUS_TO_STEP[currentStatus]
  
  // Format time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-AU', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
  
  // Get timestamp for a step
  const getStepTime = (stepId: string): string | null => {
    switch (stepId) {
      case 'submitted':
        return submittedAt ? formatTime(submittedAt) : null
      case 'review':
        return reviewStartedAt ? formatTime(reviewStartedAt) : null
      case 'processing':
        return approvedAt ? formatTime(approvedAt) : null
      case 'complete':
        return completedAt ? formatTime(completedAt) : null
      default:
        return null
    }
  }
  
  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-slate-200" />
      
      {/* Progress line */}
      <motion.div
        className="absolute left-4 top-8 w-0.5 bg-emerald-500 origin-top"
        initial={{ height: 0 }}
        animate={{ 
          height: `${Math.max(0, (currentStepIndex / (TIMELINE_STEPS.length - 1)) * 100)}%` 
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ maxHeight: 'calc(100% - 4rem)' }}
      />
      
      <div className="space-y-6">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isPending = index > currentStepIndex
          const Icon = step.icon
          const time = getStepTime(step.id)
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex gap-4"
            >
              {/* Icon circle */}
              <motion.div
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  'transition-colors duration-300',
                  isCompleted && 'bg-emerald-500',
                  isCurrent && 'bg-emerald-500 ring-4 ring-emerald-100',
                  isPending && 'bg-white border-2 border-slate-200'
                )}
                animate={{
                  scale: isCurrent ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: isCurrent ? Infinity : 0,
                  ease: 'easeInOut',
                }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <Icon className="w-4 h-4 text-white" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-300" />
                )}
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-baseline justify-between">
                  <h4 className={cn(
                    'text-sm font-medium',
                    isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'
                  )}>
                    {step.label}
                  </h4>
                  {time && (
                    <span className="text-xs text-slate-400">{time}</span>
                  )}
                </div>
                <p className={cn(
                  'text-xs mt-0.5',
                  isCompleted || isCurrent ? 'text-slate-500' : 'text-slate-300'
                )}>
                  {step.description}
                </p>
                
                {/* Current step indicator */}
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                  >
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    In progress
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
