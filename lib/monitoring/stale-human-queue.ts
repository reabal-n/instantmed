/**
 * Stale human-required queue detection.
 *
 * Medical certificates auto-approve at all hours, so they self-heal. Repeat
 * prescriptions and consults REQUIRE a doctor — if the operator is unavailable,
 * those paid requests pile up. Per the 2026-06-11 decision, we do NOT auto-pause
 * the service (a cron flipping a live revenue kill switch risks false trips); we
 * fire a targeted Telegram page so the operator can review or pause manually.
 *
 * This module is the pure decision: given the oldest paid-but-unreviewed
 * Rx/consult timestamp + the count, decide whether to page. The DB query and the
 * Telegram send (with cooldown) live in the business-alerts cron.
 */

export const STALE_HUMAN_QUEUE_THRESHOLD_HOURS = 24

/** Human-required service categories. `medical_certificate` is excluded — it
 *  auto-approves and never needs this page. */
export const STALE_HUMAN_QUEUE_CATEGORIES = ["prescription", "consultation"] as const

export interface StaleHumanQueueAlert {
  metric: "rx_consult_queue_stalled"
  severity: "critical"
  count: number
  detail: string
}

/**
 * Build a Telegram-worthy alert when the oldest paid-but-unreviewed Rx/consult
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
    metric: "rx_consult_queue_stalled",
    severity: "critical",
    count,
    detail:
      `${count} prescription/consult request${plural} waiting ${Math.floor(oldestHours)}h+ with no doctor review — ` +
      "these need a human (med certs auto-approve, Rx/consults don't). " +
      "Review in /dashboard or pause Rx/consult in /admin/features.",
  }
}
