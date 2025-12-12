'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { calculateSlaInfo, getSlaStatusClasses } from '@/lib/sla/utils'
import type { SlaStatus } from '@/lib/sla/types'
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

interface CountdownTimerProps {
  deadline: string | Date
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
}

const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function CountdownTimer({
  deadline,
  size = 'md',
  showLabel = true,
  className,
}: CountdownTimerProps) {
  const [slaInfo, setSlaInfo] = useState(() => calculateSlaInfo(deadline))

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSlaInfo(calculateSlaInfo(deadline))
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  const statusClasses = getSlaStatusClasses(slaInfo.status)
  const Icon = getStatusIcon(slaInfo.status)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 border',
        statusClasses.bg,
        statusClasses.border,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconSizes[size], statusClasses.icon)} />
      <span className={statusClasses.text}>
        {showLabel && (
          <span className="mr-1">
            {slaInfo.isBreached ? 'Overdue:' : 'Time left:'}
          </span>
        )}
        <span className="font-mono tabular-nums">
          {slaInfo.formattedRemaining}
        </span>
      </span>
    </div>
  )
}

function getStatusIcon(status: SlaStatus) {
  switch (status) {
    case 'ok':
      return Clock
    case 'warning':
      return AlertTriangle
    case 'critical':
    case 'breached':
      return AlertCircle
  }
}

// Compact version for lists
interface CompactCountdownProps {
  deadline: string | Date
  className?: string
}

export function CompactCountdown({ deadline, className }: CompactCountdownProps) {
  const [slaInfo, setSlaInfo] = useState(() => calculateSlaInfo(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setSlaInfo(calculateSlaInfo(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const statusClasses = getSlaStatusClasses(slaInfo.status)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-mono tabular-nums',
        statusClasses.text,
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          slaInfo.status === 'ok' && 'bg-green-500',
          slaInfo.status === 'warning' && 'bg-amber-500 animate-pulse',
          slaInfo.status === 'critical' && 'bg-orange-500 animate-pulse',
          slaInfo.status === 'breached' && 'bg-red-500 animate-pulse'
        )}
      />
      {slaInfo.formattedRemaining}
    </span>
  )
}

// Progress bar version
interface SlaProgressBarProps {
  deadline: string | Date
  submittedAt: string | Date
  className?: string
}

export function SlaProgressBar({
  deadline,
  submittedAt,
  className,
}: SlaProgressBarProps) {
  const [slaInfo, setSlaInfo] = useState(() => calculateSlaInfo(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setSlaInfo(calculateSlaInfo(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const submittedDate = typeof submittedAt === 'string' ? new Date(submittedAt) : submittedAt
  const totalMs = deadlineDate.getTime() - submittedDate.getTime()
  const elapsedMs = Date.now() - submittedDate.getTime()
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))

  const statusClasses = getSlaStatusClasses(slaInfo.status)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">SLA Progress</span>
        <span className={statusClasses.text}>{slaInfo.formattedRemaining}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000 ease-linear rounded-full',
            slaInfo.status === 'ok' && 'bg-green-500',
            slaInfo.status === 'warning' && 'bg-amber-500',
            slaInfo.status === 'critical' && 'bg-orange-500',
            slaInfo.status === 'breached' && 'bg-red-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
