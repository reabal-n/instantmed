export const ABANDONED_CHECKOUT_FIRST_NUDGE_DELAY_MINUTES = 20
export const ABANDONED_CHECKOUT_FIRST_NUDGE_LOOKBACK_HOURS = 24
export const ABANDONED_CHECKOUT_FOLLOWUP_DELAY_HOURS = 24
export const ABANDONED_CHECKOUT_FOLLOWUP_LOOKBACK_HOURS = 72

function minutesAgo(minutes: number): string {
  const rounded = Math.max(5, Math.round(minutes / 5) * 5)
  return `about ${rounded} minute${rounded === 1 ? "" : "s"} ago`
}

function hoursAgo(hours: number): string {
  const rounded = Math.max(1, Math.round(hours))
  return `about ${rounded} hour${rounded === 1 ? "" : "s"} ago`
}

export function formatAbandonedCheckoutStartedAgo(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt)
  const elapsedMs = now.getTime() - created.getTime()
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return "recently"
  }

  const elapsedMinutes = Math.round(elapsedMs / (60 * 1000))
  if (elapsedMinutes < 60) {
    return minutesAgo(elapsedMinutes)
  }

  return hoursAgo(elapsedMinutes / 60)
}
