/**
 * Queue utility functions - wait time, SLA countdown, severity.
 * Extracted from queue-client.tsx for testability.
 */

export type WaitTimeSeverity = "normal" | "warning" | "critical"

/** Human-readable wait time from a created_at timestamp. */
export function calculateWaitTime(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
  return `${diffMins}m`
}

/** Color-coding severity based on wait time or SLA deadline. */
export function getWaitTimeSeverity(
  createdAt: string,
  slaDeadline?: string | null,
): WaitTimeSeverity {
  if (slaDeadline) {
    const deadline = new Date(slaDeadline)
    const now = new Date()
    const diffMins = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60),
    )
    if (diffMins < 0) return "critical"
    if (diffMins < 30) return "warning"
    return "normal"
  }
  const created = new Date(createdAt)
  const now = new Date()
  const diffMins = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60),
  )
  if (diffMins > 60) return "critical"
  if (diffMins > 30) return "warning"
  return "normal"
}

/** SLA countdown string (e.g. "2h 15m left" or "10m overdue"). */
export function calculateSlaCountdown(
  slaDeadline: string | null | undefined,
): string | null {
  if (!slaDeadline) return null
  const deadline = new Date(slaDeadline)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 0) {
    const overdueMins = Math.abs(diffMins)
    const overdueHours = Math.floor(overdueMins / 60)
    return overdueHours > 0
      ? `${overdueHours}h ${overdueMins % 60}m overdue`
      : `${overdueMins}m overdue`
  }
  const hours = Math.floor(diffMins / 60)
  return hours > 0 ? `${hours}h ${diffMins % 60}m left` : `${diffMins}m left`
}
