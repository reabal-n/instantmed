import "server-only"

import * as Sentry from "@sentry/nextjs"

import { FROZEN_PROVIDER_PAYLOAD_KEY } from "@/lib/email/send/provider-payload"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("legacy-email-recovery")

const LEGACY_PARTIAL_RECOVERY_RETRY_HOURS = 72
const LEGACY_REVIEW_REQUEST_RETRY_DAYS = 120
const LEGACY_RECOVERY_CHECK_INTERVAL_MS = 60 * 60 * 1000
const LEGACY_RECOVERY_SUNSET_AT = Date.parse("2026-08-01T00:00:00.000Z")

let lastRecoveryCheckAt = 0

function legacyUnsupportedMessages(emailType: string): string[] {
  return [
    `Unsupported email_type: ${emailType}`,
    `Cannot reconstruct email type '${emailType}' - unsupported type`,
  ]
}

/**
 * One-time rollout repair for rows the old dispatcher exhausted without a
 * provider attempt. Recent partial recoveries replay their encrypted provider
 * payload. Recent review rows discard their old frozen copy so the retry uses
 * the neutral review template. Anything older is retained and alerted.
 *
 * The query is hourly-throttled within warm runtimes and self-sunsets after the
 * rollout window. Once a row is handled, its error changes so it cannot match
 * again on a later cold start.
 */
export async function recoverLegacyQuietFailures(): Promise<number> {
  const now = Date.now()
  if (
    now >= LEGACY_RECOVERY_SUNSET_AT ||
    now - lastRecoveryCheckAt < LEGACY_RECOVERY_CHECK_INTERVAL_MS
  ) {
    return 0
  }
  lastRecoveryCheckAt = now

  const partialMessages = legacyUnsupportedMessages("partial_intake_recovery")
  const reviewMessages = legacyUnsupportedMessages("review_request")
  const legacyMessages = [...partialMessages, ...reviewMessages]
  const partialFloor = now - LEGACY_PARTIAL_RECOVERY_RETRY_HOURS * 60 * 60 * 1000
  const reviewFloor = now - LEGACY_REVIEW_REQUEST_RETRY_DAYS * 24 * 60 * 60 * 1000

  const supabase = createServiceRoleClient()
  const { data: rows, error } = await supabase
    .from("email_outbox")
    .select("id, email_type, created_at, error_message, metadata")
    .in("email_type", ["partial_intake_recovery", "review_request"])
    .eq("status", "failed")
    .in("error_message", legacyMessages)
    .order("created_at", { ascending: true })
    .limit(500)

  if (error) {
    logger.warn("Failed to load legacy quiet-failed email rows", {
      error: error.message,
    })
    return 0
  }

  let recovered = 0
  let stale = 0

  for (const row of rows ?? []) {
    const createdAt = new Date(row.created_at).getTime()
    const safeRetryFloor = row.email_type === "partial_intake_recovery"
      ? partialFloor
      : reviewFloor

    if (!Number.isFinite(createdAt) || createdAt < safeRetryFloor) {
      const { error: updateError } = await supabase
        .from("email_outbox")
        .update({
          error_message: "Legacy quiet failure exceeded safe retry age; manual review required",
        })
        .eq("id", row.id)
        .eq("error_message", row.error_message)

      if (updateError) {
        logger.warn("Failed to surface stale legacy email row", {
          outboxId: row.id,
          emailType: row.email_type,
          error: updateError.message,
        })
      } else {
        stale += 1
      }
      continue
    }

    const update: Record<string, unknown> = {
      status: "failed",
      retry_count: 0,
      last_attempt_at: null,
      error_message: "Recovered legacy quiet failure for dispatcher retry",
    }

    if (row.email_type === "review_request") {
      const metadata = { ...((row.metadata ?? {}) as Record<string, unknown>) }
      delete metadata[FROZEN_PROVIDER_PAYLOAD_KEY]
      update.subject = "How did InstantMed go?"
      update.metadata = metadata
    }

    const { error: updateError } = await supabase
      .from("email_outbox")
      .update(update)
      .eq("id", row.id)
      .eq("error_message", row.error_message)

    if (updateError) {
      logger.warn("Failed to recover legacy quiet-failed email row", {
        outboxId: row.id,
        emailType: row.email_type,
        error: updateError.message,
      })
    } else {
      recovered += 1
    }
  }

  if (recovered > 0) {
    logger.warn("Recovered legacy quiet-failed email rows", { recovered })
  }
  if (stale > 0) {
    Sentry.captureMessage("Legacy quiet-failed email rows exceeded safe retry age", {
      level: "warning",
      tags: {
        alert_type: "legacy_quiet_email_failure",
        subsystem: "email-dispatcher",
      },
      extra: { stale },
    })
  }

  return recovered
}
