/**
 * Stale human-required queue detection.
 *
 * Medical-certificate protocol issuance is governance-paused, so every paid
 * clinical request currently requires a doctor. If the operator is unavailable,
 * those paid requests pile up. We do NOT auto-pause a service (a cron flipping a
 * live revenue kill switch risks false trips); we fire a targeted page so the
 * operator can review or pause manually.
 *
 * This module is the pure decision: given the oldest paid-but-unreviewed
 * request timestamp + the count, decide whether to page. The DB query and the
 * Telegram send (with cooldown) live in the business-alerts cron.
 */

export const STALE_HUMAN_QUEUE_THRESHOLD_HOURS = 24

/** Human-required service categories while protocol issuance is paused. */
export const STALE_HUMAN_QUEUE_CATEGORIES = [
  "medical_certificate",
  "prescription",
  "consultation",
] as const

export interface StaleHumanQueueAlert {
  metric: "human_review_queue_stalled"
  severity: "critical"
  count: number
  detail: string
}

/**
 * Build an alert when the oldest paid-but-unreviewed clinical
 * intake has waited `thresholdHours`+. Returns null when nothing is stale.
 */
export function buildStaleHumanQueueAlert(
  oldestPaidAt: string | null,
  count: number,
  now: Date,
  thresholdHours: number = STALE_HUMAN_QUEUE_THRESHOLD_HOURS,
): StaleHumanQueueAlert | null {
  if (!oldestPaidAt || count <= 0) return null

  const oldestMs = new Date(oldestPaidAt).getTime()
  if (Number.isNaN(oldestMs)) return null

  const oldestHours = (now.getTime() - oldestMs) / 3_600_000
  if (!Number.isFinite(oldestHours) || oldestHours < thresholdHours) return null

  const plural = count === 1 ? "" : "s"
  return {
    metric: "human_review_queue_stalled",
    severity: "critical",
    count,
    detail:
      `${count} paid request${plural} waiting ${Math.floor(oldestHours)}h+ with no doctor review — ` +
      "every active clinical pathway currently needs a human outcome. " +
      "Review in /dashboard or pause the affected service in /admin/features.",
  }
}
