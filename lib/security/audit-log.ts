import "server-only"

import * as Sentry from "@sentry/nextjs"
import { createClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"
import { assertNoPHI,sanitizeAuditMetadata } from "@/lib/security/sanitize-audit"
const logger = createLogger("audit-log")

export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "request_created"
  | "request_approved"
  | "request_declined"
  | "request_updated"
  | "request_claimed"
  | "request_released"
  | "document_generated"
  | "document_downloaded"
  | "document_sent"
  | "profile_updated"
  | "profile_created"
  | "payment_completed"
  | "payment_failed"
  | "admin_action"
  | "settings_changed"
  | "state_change"
  | "refund_attempted"
  | "refund_succeeded"
  | "refund_failed"
  | "webhook_failed"
  | "webhook_dlq_resolved"
  | "email_sent"
  | "email_failed"
  | "ai_draft_generated"
  | "ai_draft_failed"
  | "data_export"
  | "account_closed"
  | "permission_change"

interface AuditLogEntry {
  action: AuditAction
  actorId?: string
  actorType?: "patient" | "doctor" | "admin" | "system"
  intakeId?: string
  fromState?: string
  toState?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// Failed audit events queue for retry (in-memory fallback)
const failedAuditQueue: AuditLogEntry[] = []
const MAX_FAILED_QUEUE_SIZE = 100

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // In production, this is a critical configuration error
    if (process.env.NODE_ENV === "production") {
      logger.error("CRITICAL: Missing Supabase credentials for audit logging - compliance risk")
    }
    return null
  }
  return createClient(url, key)
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const supabase = getServiceClient()
  
  if (!supabase) {
    // AUDIT FIX: Silent drops of audit entries are unacceptable for healthcare compliance.
    // Australian Privacy Act (APP 1-13) and AHPRA require complete audit trails.
    // Every audit event MUST be preserved or trigger a critical alert.
    if (failedAuditQueue.length >= MAX_FAILED_QUEUE_SIZE) {
      const errorMsg = `CRITICAL COMPLIANCE VIOLATION: Audit queue full (${MAX_FAILED_QUEUE_SIZE} entries). Cannot queue event: ${entry.action}. Audit trail integrity compromised.`
      logger.error(errorMsg, { action: entry.action, queueSize: failedAuditQueue.length })
      Sentry.captureException(new Error(errorMsg), {
        level: "fatal",
        tags: { component: "audit-log", compliance: "critical" },
        extra: { action: entry.action, queueSize: failedAuditQueue.length },
      })
      throw new Error(errorMsg)
    }
    failedAuditQueue.push(entry)
    logger.error("Audit event queued (no DB connection)", {
      action: entry.action,
      queueSize: failedAuditQueue.length
    })
    return
  }

  try {
    // Sanitize metadata to remove PHI before storing
    const sanitizedMetadata = sanitizeAuditMetadata(entry.metadata)
    
    // Dev assertion to catch unsanitized PHI
    assertNoPHI(sanitizedMetadata, `audit_log:${entry.action}`)
    
    const { error } = await supabase.from("audit_logs").insert({
      action: entry.action,
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      intake_id: entry.intakeId,
      from_state: entry.fromState,
      to_state: entry.toState,
      metadata: sanitizedMetadata,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      created_at: new Date().toISOString(),
    })

    if (error) {
      // AUDIT FIX: Never silently drop audit entries - compliance requires complete trails
      if (failedAuditQueue.length >= MAX_FAILED_QUEUE_SIZE) {
        const errorMsg = `CRITICAL COMPLIANCE VIOLATION: Audit queue full (${MAX_FAILED_QUEUE_SIZE} entries). Cannot queue event: ${entry.action}. DB error: ${error.message}`
        logger.error(errorMsg, { action: entry.action, queueSize: failedAuditQueue.length })
        Sentry.captureException(new Error(errorMsg), {
          level: "fatal",
          tags: { component: "audit-log", compliance: "critical" },
          extra: { action: entry.action, dbError: error.message, queueSize: failedAuditQueue.length },
        })
        throw new Error(errorMsg)
      }
      failedAuditQueue.push(entry)
      logger.error("Failed to log audit event - queued for retry", {
        error: error.message,
        action: entry.action
      })
    }
  } catch (error) {
    // AUDIT FIX: Never silently drop audit entries - compliance requires complete trails
    if (failedAuditQueue.length >= MAX_FAILED_QUEUE_SIZE) {
      const errorMsg = `CRITICAL COMPLIANCE VIOLATION: Audit queue full (${MAX_FAILED_QUEUE_SIZE} entries). Cannot queue event: ${entry.action}. Audit trail integrity compromised.`
      logger.error(errorMsg, { action: entry.action, queueSize: failedAuditQueue.length })
      Sentry.captureException(new Error(errorMsg), {
        level: "fatal",
        tags: { component: "audit-log", compliance: "critical" },
        extra: { action: entry.action, queueSize: failedAuditQueue.length, originalError: error },
      })
      throw new Error(errorMsg)
    }
    failedAuditQueue.push(entry)
    logger.error("Failed to log audit event - queued for retry", { error })
  }
}

/**
 * Get count of failed audit events (for monitoring)
 */
export function getFailedAuditQueueSize(): number {
  return failedAuditQueue.length
}

/**
 * Retry failed audit events (call from cron or health check)
 */
export async function retryFailedAuditEvents(): Promise<{ processed: number; failed: number }> {
  const supabase = getServiceClient()
  if (!supabase || failedAuditQueue.length === 0) {
    return { processed: 0, failed: failedAuditQueue.length }
  }

  let processed = 0
  const stillFailed: AuditLogEntry[] = []

  while (failedAuditQueue.length > 0) {
    const entry = failedAuditQueue.shift()!
    try {
      // Sanitize metadata on retry as well
      const sanitizedMetadata = sanitizeAuditMetadata({ ...entry.metadata, retried: true })
      
      const { error } = await supabase.from("audit_logs").insert({
        action: entry.action,
        actor_id: entry.actorId,
        actor_type: entry.actorType,
        intake_id: entry.intakeId,
        from_state: entry.fromState,
        to_state: entry.toState,
        metadata: sanitizedMetadata,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        created_at: new Date().toISOString(),
      })

      if (error) {
        stillFailed.push(entry)
      } else {
        processed++
      }
    } catch {
      stillFailed.push(entry)
    }
  }

  // Re-queue still-failed events
  stillFailed.forEach(e => failedAuditQueue.push(e))
  
  return { processed, failed: stillFailed.length }
}

// Helper functions for common audit events
export async function logLogin(actorId: string, ipAddress?: string, userAgent?: string) {
  await logAuditEvent({
    action: "login",
    actorId,
    actorType: "patient",
    ipAddress,
    userAgent,
  })
}

export async function logLoginFailed(email: string, ipAddress?: string, reason?: string) {
  await logAuditEvent({
    action: "login_failed",
    metadata: { email, reason },
    ipAddress,
  })
}

export async function logRequestAction(
  action: "request_created" | "request_approved" | "request_declined" | "request_updated",
  actorId: string,
  intakeId: string,
  actorType: "patient" | "doctor" | "admin" | "system" = "patient",
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    action,
    actorId,
    actorType,
    intakeId,
    metadata,
  })
}

export async function logDocumentAction(
  action: "document_generated" | "document_downloaded",
  actorId: string,
  documentId: string,
  intakeId?: string
) {
  await logAuditEvent({
    action,
    actorId,
    actorType: "doctor",
    intakeId,
    metadata: { documentId },
  })
}

export async function logAdminAction(
  actorId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    action: "admin_action",
    actorId,
    actorType: "admin",
    metadata: { description, ...metadata },
  })
}

export async function logRefundAction(
  action: "refund_attempted" | "refund_succeeded" | "refund_failed",
  actorId: string,
  intakeId: string,
  metadata: {
    category?: string
    amount?: number
    stripeRefundId?: string
    reason?: string
    error?: string
  }
) {
  await logAuditEvent({
    action,
    actorId,
    actorType: "doctor",
    intakeId,
    metadata,
  })
}

export async function logIntakeClaim(
  action: "request_claimed" | "request_released",
  doctorId: string,
  intakeId: string
) {
  await logAuditEvent({
    action,
    actorId: doctorId,
    actorType: "doctor",
    intakeId,
  })
}

export async function logEmailEvent(
  action: "email_sent" | "email_failed",
  intakeId: string,
  metadata: {
    emailType: string
    recipient: string
    error?: string
  }
) {
  await logAuditEvent({
    action,
    actorType: "system",
    intakeId,
    metadata,
  })
}

export async function logWebhookFailure(
  eventId: string,
  eventType: string,
  intakeId: string | null,
  error: string
) {
  await logAuditEvent({
    action: "webhook_failed",
    actorType: "system",
    intakeId: intakeId || undefined,
    metadata: { eventId, eventType, error },
  })
}

export async function logAiDraftEvent(
  action: "ai_draft_generated" | "ai_draft_failed",
  intakeId: string,
  metadata: {
    draftType: "clinical_note" | "med_cert"
    error?: string
    validationPassed?: boolean
  }
) {
  await logAuditEvent({
    action,
    actorType: "system",
    intakeId,
    metadata,
  })
}

export async function logPaymentEvent(
  action: "payment_completed" | "payment_failed",
  patientId: string,
  intakeId: string,
  metadata: {
    amount: number
    stripeSessionId?: string
    error?: string
  }
) {
  await logAuditEvent({
    action,
    actorId: patientId,
    actorType: "patient",
    intakeId,
    metadata,
  })
}

export async function logStateTransition(
  intakeId: string,
  actorId: string,
  actorType: "patient" | "doctor" | "admin" | "system",
  fromState: string,
  toState: string,
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    action: "state_change",
    actorId,
    actorType,
    intakeId,
    fromState,
    toState,
    metadata,
  })
}
