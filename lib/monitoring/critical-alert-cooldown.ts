import "server-only"

import { createHash } from "node:crypto"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("critical-alert-cooldown")

const CRITICAL_ALERT_COOLDOWN_ACTION = "critical_business_alert_telegram"

/**
 * Minimum gap between two Telegram pages carrying the SAME critical detail.
 *
 * The business-alerts cron runs every 30 minutes, and its Telegram send had no
 * cooldown: a condition that persists — a stale queue, a stuck prescribing
 * request, a backlog that cannot clear by ageing — paged 48 times a day with
 * identical text. That trains the operator to swipe the channel away, which is
 * the real hazard, because a genuine new incident renders exactly the same.
 *
 * Four hours keeps a persistent condition visible a few times a day without it
 * becoming wallpaper. Escalation is NOT delayed: the cooldown is keyed to the
 * detail text, so any change in the alert set — a new alert type, a different
 * count — is a different fingerprint and pages immediately.
 */
const CRITICAL_ALERT_COOLDOWN_HOURS = 4

/**
 * Fingerprint the alert content, not just its type.
 *
 * Two runs that produce byte-identical detail text describe the same unchanged
 * situation. Anything else — a count moving 1 → 5, a second alert joining the
 * set — is new information and must page.
 */
function fingerprintCriticalAlert(detail: string): string {
  return createHash("sha256").update(detail.trim()).digest("hex").slice(0, 32)
}

/**
 * Decide whether this critical alert may page Telegram right now.
 *
 * Fails OPEN: if the cooldown lookup fails we send. A duplicate page is a minor
 * annoyance; a silently swallowed critical alert is the failure mode this whole
 * module exists to protect against.
 */
export async function shouldSendCriticalAlert(detail: string): Promise<boolean> {
  const fingerprint = fingerprintCriticalAlert(detail)
  const since = new Date(
    Date.now() - CRITICAL_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000,
  ).toISOString()

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id")
      .eq("action", CRITICAL_ALERT_COOLDOWN_ACTION)
      .eq("metadata->>fingerprint", fingerprint)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle()

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
 * Record that this detail paged, starting its cooldown. Fail-soft: a missing
 * receipt only costs one duplicate page on the next run.
 */
export async function recordCriticalAlertSent(detail: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("audit_logs").insert({
      action: CRITICAL_ALERT_COOLDOWN_ACTION,
      actor_type: "system",
      metadata: {
        cooldown_hours: CRITICAL_ALERT_COOLDOWN_HOURS,
        fingerprint: fingerprintCriticalAlert(detail),
      },
    })

    if (error) {
      logger.warn("Failed to record critical alert cooldown receipt", {
        error: error.message,
      })
    }
  } catch (error) {
    logger.warn("Critical alert cooldown receipt errored", { error })
  }
}
