'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueuePositionIndicatorProps {
  requestId?: string
  className?: string
  variant?: 'compact' | 'detailed'
}

interface QueueStatus {
  position: number
  totalInQueue: number
  estimatedWaitMinutes: number
  status: 'queued' | 'in_review' | 'completed' | 'needs_info'
  doctorName?: string
}

/**
 * Real-time queue position indicator
 * Shows patients where they are in the review queue and estimated wait time
 */
export function QueuePositionIndicator({ 
  requestId, 
  className,
  variant = 'detailed'
}: QueuePositionIndicatorProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!requestId) {
      setIsLoading(false)
      return
    }

    // Initial fetch
    fetchQueueStatus()

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchQueueStatus, 30000)

    return () => clearInterval(interval)
  }, [requestId])

  async function fetchQueueStatus() {
    try {
      // In production, this would call an API endpoint
      // For now, simulate with realistic data
      const mockStatus: QueueStatus = {
        position: Math.floor(Math.random() * 5) + 1,
        totalInQueue: Math.floor(Math.random() * 10) + 5,
        estimatedWaitMinutes: Math.floor(Math.random() * 30) + 15,
        status: 'queued',
      }
      setQueueStatus(mockStatus)
    } catch (_error) {
      // Queue status fetch errors handled silently
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading queue status...</span>
      </div>
    )
  }

  if (!queueStatus) {
    return null
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
        queueStatus.status === 'in_review' 
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-primary/10 text-primary",
        className
      )}>
        {queueStatus.status === 'in_review' ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Doctor reviewing now</span>
          </>
        ) : (
          <>
            <Users className="w-3.5 h-3.5" />
            <span>#{queueStatus.position} in queue</span>
            <span className="text-muted-foreground">·</span>
            <span>~{queueStatus.estimatedWaitMinutes} min</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6",
      className
    )}>
      <h3 className="font-semibold text-foreground mb-4">Your Request Status</h3>

      {/* Status indicator */}
      <div className="flex items-center gap-3 mb-6">
        {queueStatus.status === 'in_review' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Being reviewed now
              </p>
              {queueStatus.doctorName && (
                <p className="text-sm text-muted-foreground">
                  Dr. {queueStatus.doctorName} is reviewing your request
                </p>
              )}
            </div>
          </>
        ) : queueStatus.status === 'completed' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Review complete
              </p>
              <p className="text-sm text-muted-foreground">
                Check your email for next steps
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Position #{queueStatus.position} in queue
              </p>
              <p className="text-sm text-muted-foreground">
                {queueStatus.totalInQueue} requests ahead of you
              </p>
            </div>
          </>
        )}
      </div>

      {/* Estimated wait time */}
      {queueStatus.status === 'queued' && (
        <div className="flex items-center gap-3 p-4 bg-white/60 dark:bg-white/5 rounded-xl">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              Estimated wait: ~{queueStatus.estimatedWaitMinutes} minutes
            </p>
            <p className="text-sm text-muted-foreground">
              We&apos;ll email you when your request is reviewed
            </p>
          </div>
        </div>
      )}

      {/* Progress steps */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          {['Submitted', 'In Queue', 'Reviewing', 'Complete'].map((step, i) => {
            const isActive = 
              (queueStatus.status === 'queued' && i <= 1) ||
              (queueStatus.status === 'in_review' && i <= 2) ||
              (queueStatus.status === 'completed' && i <= 3)
            const isCurrent = 
              (queueStatus.status === 'queued' && i === 1) ||
              (queueStatus.status === 'in_review' && i === 2) ||
              (queueStatus.status === 'completed' && i === 3)

            return (
              <div key={step} className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-white" 
                    : "bg-white/40 dark:bg-white/10 text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20"
                )}>
                  {i + 1}
                </div>
                <span className={cn(
                  "text-xs mt-2",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>
        {/* Progress line */}
        <div className="relative mt-[-52px] mx-4 h-0.5 bg-white/40 dark:bg-white/10 -z-10">
          <div 
            className="absolute h-full bg-primary transition-all duration-500"
            style={{ 
              width: queueStatus.status === 'queued' ? '33%' 
                : queueStatus.status === 'in_review' ? '66%' 
                : queueStatus.status === 'completed' ? '100%' 
                : '0%' 
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Inline queue indicator for headers/nav
 */
export function QueuePositionBadge({ 
  position, 
  estimatedMinutes,
  className 
}: { 
  position: number
  estimatedMinutes: number
  className?: string 
}) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium",
      className
    )}>
      <Users className="w-3.5 h-3.5" />
      <span>#{position}</span>
      <span className="text-primary/60">·</span>
      <span className="text-primary/80">~{estimatedMinutes}m</span>
    </div>
  )
}
