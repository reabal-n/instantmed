import "server-only"

import { createHash } from "node:crypto"

import type { Incident } from "@/lib/monitoring/monitor-state"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("critical-alert-cooldown")

const CRITICAL_ALERT_COOLDOWN_ACTION = "critical_business_alert_telegram"
const CRITICAL_ALERT_ACKNOWLEDGED_ACTION = "critical_business_alert_acknowledged"
const GOOGLE_ADS_TERMINAL_ALERT_METRIC =
  "google_ads_adjustment_terminal_click_attributed_failures"

/**
 * Timed text cooldowns are a fallback ONLY when durable incident state is
 * unavailable. Healthy observations use exact incident delivery receipts:
 * elapsed time or changing detail prose cannot re-page an unchanged incident.
 */
const CRITICAL_ALERT_COOLDOWN_HOURS = 4
const GOOGLE_ADS_TERMINAL_ALERT_COOLDOWN_HOURS = 7 * 24

/**
 * Preserve the existing bounded fallback during a state-store outage. Ads
 * terminal failures retain their longer fallback window and daily RED brief.
 */
export function resolveCriticalAlertCooldownHours(metric: string): number {
  return metric === GOOGLE_ADS_TERMINAL_ALERT_METRIC
    ? GOOGLE_ADS_TERMINAL_ALERT_COOLDOWN_HOURS
    : CRITICAL_ALERT_COOLDOWN_HOURS
}

/**
 * Copy changes must not turn an unchanged incident into a fresh page. Keep the
 * previous Ads warning only as a fingerprint alias during this incident's
 * seven-day window; it is never sent to Telegram again.
 */
export function resolveEquivalentCriticalAlertDetails(alert: {
  count?: number
  metric: string
}): string[] {
  if (
    alert.metric !== GOOGLE_ADS_TERMINAL_ALERT_METRIC
    || !Number.isInteger(alert.count)
    || (alert.count ?? 0) <= 0
  ) {
    return []
  }

  const count = alert.count as number
  return [
    `Google Ads has ${count} terminal refunded-order adjustment failure` +
      `${count === 1 ? "" : "s"} tied to a click-attributed purchase import; ` +
      "Smart Bidding may still be counting refunded ad-click revenue.",
  ]
}

/**
 * Keep legacy fingerprints for the outage fallback and application rollback.
 * Text alone cannot distinguish recovery followed by an equal-count recurrence.
 */
function fingerprintCriticalAlert(detail: string): string {
  return createHash("sha256").update(detail.trim()).digest("hex").slice(0, 32)
}

export type DeliveryOptions = {
  incident?: Pick<Incident, "metric" | "at">
  cooldownHours?: number
  equivalentDetails?: string[]
}

/**
 * Decide whether this critical alert may page Telegram right now.
 *
 * Fails OPEN: if the cooldown lookup fails we send. A duplicate page is a minor
 * annoyance; a silently swallowed critical alert is the failure mode this whole
 * module exists to protect against.
 */
export async function shouldSendCriticalAlert(
  detail: string,
  options: DeliveryOptions = {},
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    let query = supabase.from("audit_logs").select("id")
    if (options.incident) {
      // A delayed send from A must never acknowledge a recovered/recurred B.
      // Match the originating transition exactly, never receipt.created_at.
      query = query.in("action", [CRITICAL_ALERT_COOLDOWN_ACTION, CRITICAL_ALERT_ACKNOWLEDGED_ACTION])
        .eq("metadata->>incident_metric", String(options.incident.metric))
        .eq("metadata->>incident_at", String(options.incident.at))
    } else {
      const fingerprints = [...new Set([detail, ...(options.equivalentDetails ?? [])].map(fingerprintCriticalAlert))]
      const since = new Date(Date.now() - (options.cooldownHours ?? CRITICAL_ALERT_COOLDOWN_HOURS) * 3600000).toISOString()
      query = query.eq("action", CRITICAL_ALERT_COOLDOWN_ACTION)
        .in("metadata->>fingerprint", fingerprints).gte("created_at", since)
    }
    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
      logger.warn("Critical alert cooldown lookup failed, sending anyway", {
        error: error.message,
      })
      return true
    }

    return !data
  } catch (error) {
    logger.warn("Critical alert cooldown errored, sending anyway", { error })
    return true
  }
}

/**
 * Receipt successful delivery only. An operator acknowledgement is a distinct
 * audited action, never a fabricated send. A failed write remains retryable.
 */
export async function recordCriticalAlertSent(
  detail: string,
  options: DeliveryOptions = {},
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("audit_logs").insert({
      action: CRITICAL_ALERT_COOLDOWN_ACTION,
      actor_type: "system",
      metadata: {
        ...(options.incident ? {
          incident_metric: options.incident.metric,
          incident_at: options.incident.at,
        } : { cooldown_hours: options.cooldownHours ?? CRITICAL_ALERT_COOLDOWN_HOURS }),
        fingerprint: fingerprintCriticalAlert(detail),
      },
    })

    if (error) {
      logger.warn("Failed to record critical alert cooldown receipt", {
        error: error.message,
      })
      return false
    }
    return true
  } catch (error) {
    logger.warn("Critical alert cooldown receipt errored", { error })
    return false
  }
}
