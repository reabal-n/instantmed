import { toError } from "@/lib/errors"

export type BusinessAlertSeverity = "critical" | "warning" | "info"

export type BusinessAlert = {
  metric: string
  severity: BusinessAlertSeverity
  detail: string
  count?: number
}

/**
 * The alert a broken alert-check produces about itself. The metric is
 * section-specific so the business-alerts per-metric Telegram cooldown treats
 * each broken section independently (a standing breakage pages once per
 * cooldown window, not once per 30-minute cron run, and a second section
 * breaking later still pages immediately).
 */
export function buildAlertSectionFailureAlert(section: string, error: unknown): BusinessAlert {
  return {
    metric: `business_alert_section_failed_${section}`,
    severity: "critical",
    detail: `Alert check "${section}" failed (${toError(error).message}) — its condition is currently unmonitored`,
    count: 1,
  }
}

/**
 * Run one business-alerts check section fail-soft.
 *
 * The business-alerts cron is the alerting HUB: before 2026-07-02 its checks
 * ran sequentially inside one try/catch, so a single broken query (e.g. the
 * revenue-safety counts in section 2) threw straight to the route's outer
 * catch and silenced every later section AND the Sentry/Telegram dispatch —
 * the exact channel that should have reported the breakage. Each section now
 * runs inside this wrapper: a failure is converted into a critical alert
 * about the section itself, and every other section plus the dispatch still
 * runs.
 *
 * Returns true when the section ran cleanly, false when its failure alert was
 * recorded instead.
 */
export async function runAlertSection(options: {
  section: string
  alerts: BusinessAlert[]
  onFailure?: (alert: BusinessAlert, error: Error) => void
  run: () => Promise<void>
}): Promise<boolean> {
  try {
    await options.run()
    return true
  } catch (error) {
    const err = toError(error)
    const alert = buildAlertSectionFailureAlert(options.section, err)
    options.alerts.push(alert)
    try {
      options.onFailure?.(alert, err)
    } catch {
      // Reporting hooks must never take the remaining sections down with them.
    }
    return false
  }
}
