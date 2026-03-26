import type { SupabaseClient } from "@supabase/supabase-js"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const log = createLogger("stripe-webhook")

/**
 * Atomically try to claim an event for processing.
 * Uses INSERT...ON CONFLICT to prevent race conditions.
 * Returns true if this instance should process the event, false if already processed.
 */
export async function tryClaimEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  requestId?: string,
  sessionId?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase.rpc("try_process_stripe_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_request_id: requestId || null,
    p_session_id: sessionId || null,
    p_metadata: metadata || {},
  })

  if (error) {
    log.warn("try_process_stripe_event not available, using legacy check", { eventId }, error)
    return await legacyClaimEvent(supabase, eventId, eventType, requestId, sessionId)
  }

  return data === true
}

async function legacyClaimEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  requestId?: string,
  sessionId?: string
): Promise<boolean> {
  log.warn("Legacy webhook dedup fallback triggered - verify try_process_stripe_event RPC is deployed", {
    eventId,
    eventType,
    requestId,
    sessionId,
  })
  Sentry.captureMessage("Legacy Stripe webhook dedup path triggered", {
    level: "warning",
    tags: { source: "stripe-webhook", legacy_dedup: "true" },
    extra: { eventId, eventType, requestId, sessionId },
  })

  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle()

  if (existing) {
    return false
  }

  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    intake_id: requestId || null,
    session_id: sessionId || null,
    processed_at: new Date().toISOString(),
  })

  if (insertError) {
    if (insertError.code === "23505") {
      log.info("Lost race to process event", { eventId })
      return false
    }
    log.error("Error recording event", { eventId }, insertError)
  }

  return true
}

/**
 * Record an error for a webhook event (for debugging)
 */
export async function recordEventError(
  supabase: SupabaseClient,
  eventId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from("stripe_webhook_events")
    .update({ error_message: errorMessage })
    .eq("event_id", eventId)
}

/**
 * Add failed event to dead letter queue for manual resolution.
 * Also sends Sentry alert so operators are notified immediately.
 */
export async function addToDeadLetterQueue(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  sessionId: string | null,
  intakeId: string | null,
  errorMessage: string,
  errorCode?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("stripe_webhook_dead_letter").insert({
      event_id: eventId,
      event_type: eventType,
      session_id: sessionId,
      intake_id: intakeId,
      error_message: errorMessage,
      error_code: errorCode || null,
      payload: payload || null,
    })
    log.warn("Added to dead letter queue", { eventId, intakeId, errorMessage })

    Sentry.captureMessage(`Stripe webhook failed: ${errorCode || "UNKNOWN"}`, {
      level: "error",
      tags: {
        source: "stripe-webhook-dlq",
        error_code: errorCode || "unknown",
        event_type: eventType,
      },
      extra: { eventId, sessionId, intakeId, errorMessage, payload },
    })

    // Check DLQ size and alert if threshold exceeded
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: dlqCount } = await supabase
      .from("stripe_webhook_dead_letter")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneHourAgo)
      .is("resolved_at", null)

    const DLQ_ALERT_THRESHOLD = 5
    if (dlqCount && dlqCount >= DLQ_ALERT_THRESHOLD) {
      Sentry.captureMessage(`CRITICAL: Stripe webhook DLQ has ${dlqCount} unresolved items in last hour`, {
        level: "fatal",
        tags: {
          source: "stripe-webhook-dlq-threshold",
          dlq_count: String(dlqCount),
        },
        extra: { threshold: DLQ_ALERT_THRESHOLD, recentCount: dlqCount, latestEventId: eventId },
      })
      log.error("DLQ threshold exceeded - possible systemic webhook failure", {
        dlqCount,
        threshold: DLQ_ALERT_THRESHOLD,
      })
    }
  } catch (dlqError) {
    log.error("Failed to add to dead letter queue", { eventId }, dlqError)
    Sentry.captureException(dlqError, {
      tags: { source: "stripe-webhook-dlq-insert-failed" },
      extra: { eventId, intakeId, errorMessage },
    })
  }
}
