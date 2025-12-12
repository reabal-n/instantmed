import type { SlaInfo, SlaStatus, SlaConfig } from './types'
import { DEFAULT_SLA_CONFIG } from './types'

// ============================================
// SLA UTILITIES
// ============================================

/**
 * Calculate SLA status and time remaining
 */
export function calculateSlaInfo(
  deadline: string | Date,
  config: SlaConfig = DEFAULT_SLA_CONFIG
): SlaInfo {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const minutesRemaining = Math.floor(diffMs / 60000)
  const isBreached = diffMs < 0

  // Calculate status
  let status: SlaStatus
  if (isBreached) {
    status = 'breached'
  } else if (minutesRemaining <= config.criticalThresholdMinutes) {
    status = 'critical'
  } else if (minutesRemaining <= config.warningThresholdMinutes) {
    status = 'warning'
  } else {
    status = 'ok'
  }

  // Format remaining time
  const formattedRemaining = formatTimeRemaining(diffMs)

  // Calculate percentage of SLA used (assume 60 min standard)
  const totalMinutes = 60 // This should come from service config
  const percentageUsed = Math.min(100, Math.max(0, ((totalMinutes - minutesRemaining) / totalMinutes) * 100))

  return {
    deadline: deadlineDate,
    status,
    minutesRemaining,
    formattedRemaining,
    isBreached,
    percentageUsed,
  }
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(diffMs: number): string {
  const isNegative = diffMs < 0
  const absDiffMs = Math.abs(diffMs)

  const hours = Math.floor(absDiffMs / 3600000)
  const minutes = Math.floor((absDiffMs % 3600000) / 60000)
  const seconds = Math.floor((absDiffMs % 60000) / 1000)

  if (isNegative) {
    if (hours > 0) {
      return `${hours}h ${minutes}m overdue`
    }
    return `${minutes}m overdue`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Get CSS classes for SLA status
 */
export function getSlaStatusClasses(status: SlaStatus): {
  bg: string
  text: string
  border: string
  icon: string
} {
  switch (status) {
    case 'ok':
      return {
        bg: 'bg-green-50 dark:bg-green-950',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-500',
      }
    case 'warning':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-500',
      }
    case 'critical':
      return {
        bg: 'bg-orange-50 dark:bg-orange-950',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
        icon: 'text-orange-500',
      }
    case 'breached':
      return {
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-500',
      }
  }
}
