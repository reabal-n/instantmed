import "server-only"

import type { BusinessAlert } from "@/lib/monitoring/alert-sections"
import { type DeliveryOptions, recordCriticalAlertSent, resolveCriticalAlertCooldownHours, resolveEquivalentCriticalAlertDetails, shouldSendCriticalAlert } from "@/lib/monitoring/critical-alert-cooldown"
import { INCIDENT_METRICS } from "@/lib/monitoring/incident-metrics"
import type { BusinessIncidentDispatch } from "@/lib/monitoring/incident-state"
import { sendCriticalBusinessAlertViaTelegram } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("critical-alert-dispatch")

/** Sentry claims and Telegram delivery remain independent: a failed send retries. */
export async function deliverCriticalBusinessAlerts(
  alerts: BusinessAlert[],
  observation: BusinessIncidentDispatch,
): Promise<boolean> {
  if (observation.status === "superseded") return true
  const pageable: Array<{ alert: BusinessAlert; options: DeliveryOptions }> = []
  let healthy = true
  for (const alert of alerts.filter(item => item.severity === "critical")) {
    const incident = observation.status === "accepted"
      ? observation.incidents.find(item => item.metric === INCIDENT_METRICS.indexOf(alert.metric)
        && item.active && item.severity === 2 && item.count === (alert.count ?? 1))
      : undefined
    if (observation.status === "accepted" && !incident) {
      logger.warn("Critical alert incident token unavailable, using fallback", { metric: alert.metric })
      healthy = false
    }
    const options = { incident, cooldownHours: resolveCriticalAlertCooldownHours(alert.metric), equivalentDetails: resolveEquivalentCriticalAlertDetails(alert) }
    if (await shouldSendCriticalAlert(alert.detail, options)) pageable.push({ alert, options })
  }
  if (pageable.length === 0) return healthy
  const delivered = await sendCriticalBusinessAlertViaTelegram(pageable.map(({ alert }) => alert.detail).join("; "))
  if (!delivered) return false
  for (const { alert, options } of pageable) {
    if (!await recordCriticalAlertSent(alert.detail, options)) healthy = false
  }
  return healthy
}
