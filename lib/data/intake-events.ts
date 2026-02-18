"use server"

/**
 * Intake Events Data Access
 * 
 * Helper functions for logging intake status transitions and events.
 * Used for audit trail and SLA monitoring.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import type { IntakeStatus } from "@/types/db"

const logger = createLogger("intake-events")

// ============================================================================
// TYPES
// ============================================================================

export type IntakeEventType =
  | "status_change"
  | "payment_received"
  | "document_generated"
  | "email_sent"
  | "email_failed"
  | "script_sent"
  | "refund_processed"
  | "escalated"
  | "claimed"
  | "unclaimed"

export type ActorRole = "patient" | "doctor" | "admin" | "system"

export interface IntakeEvent {
  id: string
  intake_id: string
  actor_role: ActorRole
  actor_id: string | null
  event_type: IntakeEventType
  from_status: IntakeStatus | null
  to_status: IntakeStatus | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LogIntakeEventParams {
  intakeId: string
  eventType: IntakeEventType
  actorRole: ActorRole
  actorId?: string | null
  fromStatus?: IntakeStatus | null
  toStatus?: IntakeStatus | null
  metadata?: Record<string, unknown>
}

// ============================================================================
// LOGGING FUNCTION
// ============================================================================

/**
 * Log an intake event for audit trail and SLA monitoring.
 * 
 * This is the single entry point for all intake event logging.
 * Call this whenever:
 * - Status changes (approve, decline, etc.)
 * - Payment is received
 * - Documents are generated
 * - Emails are sent/failed
 * - Scripts are sent
 * - Refunds are processed
 * 
 * @param params Event parameters
 * @returns Event ID if successful, null if failed
 */
export async function logIntakeEvent(
  params: LogIntakeEventParams
): Promise<string | null> {
  const {
    intakeId,
    eventType,
    actorRole,
    actorId = null,
    fromStatus = null,
    toStatus = null,
    metadata = {},
  } = params

  // Kill switch - disable event logging if needed
  if (process.env.DISABLE_INTAKE_EVENTS === "true") {
    logger.debug("[IntakeEvents] Logging disabled via DISABLE_INTAKE_EVENTS")
    return null
  }

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("intake_events")
      .insert({
        intake_id: intakeId,
        event_type: eventType,
        actor_role: actorRole,
        actor_id: actorId,
        from_status: fromStatus,
        to_status: toStatus,
        metadata,
      })
      .select("id")
      .single()

    if (error) {
      logger.error("[IntakeEvents] Failed to log event", {
        intakeId,
        eventType,
        error: error.message,
      })
      return null
    }

    logger.debug("[IntakeEvents] Event logged", {
      eventId: data.id,
      intakeId,
      eventType,
      fromStatus,
      toStatus,
    })

    return data.id
  } catch (err) {
    logger.error(
      "[IntakeEvents] Exception logging event",
      { intakeId, eventType },
      err instanceof Error ? err : new Error(String(err))
    )
    return null
  }
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Log a status change event.
 */
export async function logStatusChange(
  intakeId: string,
  fromStatus: IntakeStatus,
  toStatus: IntakeStatus,
  actorId: string | null,
  actorRole: ActorRole = "system",
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "status_change",
    actorRole,
    actorId,
    fromStatus,
    toStatus,
    metadata,
  })
}

/**
 * Log a payment received event.
 */
export async function logPaymentReceived(
  intakeId: string,
  metadata: {
    stripePaymentIntentId?: string
    amountCents?: number
    currency?: string
  } = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "payment_received",
    actorRole: "system",
    toStatus: "paid",
    metadata,
  })
}

/**
 * Log a document generated event.
 */
export async function logDocumentGenerated(
  intakeId: string,
  actorId: string | null,
  metadata: {
    documentType?: string
    documentId?: string
  } = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "document_generated",
    actorRole: actorId ? "doctor" : "system",
    actorId,
    metadata,
  })
}

/**
 * Log an email sent event.
 */
export async function logEmailSent(
  intakeId: string,
  metadata: {
    emailType?: string
    emailId?: string
    toEmail?: string
  } = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "email_sent",
    actorRole: "system",
    metadata,
  })
}

/**
 * Log an email failed event.
 */
export async function logEmailFailed(
  intakeId: string,
  metadata: {
    emailType?: string
    emailId?: string
    toEmail?: string
    errorMessage?: string
  } = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "email_failed",
    actorRole: "system",
    metadata,
  })
}

/**
 * Log a script sent event.
 */
export async function logScriptSent(
  intakeId: string,
  actorId: string | null,
  metadata: {
    parchmentReference?: string
    scriptNotes?: string
  } = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "script_sent",
    actorRole: actorId ? "doctor" : "system",
    actorId,
    metadata,
  })
}

/**
 * Log a refund processed event.
 */
export async function logRefundProcessed(
  intakeId: string,
  actorId: string | null,
  metadata: {
    stripeRefundId?: string
    amountCents?: number
    reason?: string
  } = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "refund_processed",
    actorRole: actorId ? "admin" : "system",
    actorId,
    metadata,
  })
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get events for a specific intake.
 */
export async function getIntakeEvents(
  intakeId: string,
  limit: number = 100
): Promise<IntakeEvent[]> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("intake_events")
      .select("id, intake_id, actor_role, actor_id, event_type, from_status, to_status, metadata, created_at")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      logger.error("[IntakeEvents] Failed to fetch events", {
        intakeId,
        error: error.message,
      })
      return []
    }

    return data as IntakeEvent[]
  } catch (err) {
    logger.error(
      "[IntakeEvents] Exception fetching events",
      { intakeId },
      err instanceof Error ? err : new Error(String(err))
    )
    return []
  }
}
