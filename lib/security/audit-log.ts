import "server-only"
import { createClient } from "@supabase/supabase-js"
import { createLogger } from "@/lib/observability/logger"
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
  | "permission_change"

interface AuditLogEntry {
  action: AuditAction
  actorId?: string
  actorType?: "patient" | "doctor" | "admin" | "system"
  requestId?: string
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
    // Queue failed events for later retry and log loudly
    if (failedAuditQueue.length < MAX_FAILED_QUEUE_SIZE) {
      failedAuditQueue.push(entry)
    }
    logger.error("Audit event queued (no DB connection)", { 
      action: entry.action, 
      queueSize: failedAuditQueue.length 
    })
    return
  }

  try {
    const { error } = await supabase.from("audit_logs").insert({
      action: entry.action,
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      request_id: entry.requestId,
      from_state: entry.fromState,
      to_state: entry.toState,
      metadata: entry.metadata,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      created_at: new Date().toISOString(),
    })
    
    if (error) {
      // Queue for retry on DB error
      if (failedAuditQueue.length < MAX_FAILED_QUEUE_SIZE) {
        failedAuditQueue.push(entry)
      }
      logger.error("Failed to log audit event - queued for retry", { 
        error: error.message, 
        action: entry.action 
      })
    }
  } catch (error) {
    // Queue for retry on exception
    if (failedAuditQueue.length < MAX_FAILED_QUEUE_SIZE) {
      failedAuditQueue.push(entry)
    }
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
      const { error } = await supabase.from("audit_logs").insert({
        action: entry.action,
        actor_id: entry.actorId,
        actor_type: entry.actorType,
        request_id: entry.requestId,
        from_state: entry.fromState,
        to_state: entry.toState,
        metadata: { ...entry.metadata, retried: true },
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
  requestId: string,
  actorType: "patient" | "doctor" | "admin" | "system" = "patient",
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    action,
    actorId,
    actorType,
    requestId,
    metadata,
  })
}

export async function logDocumentAction(
  action: "document_generated" | "document_downloaded",
  actorId: string,
  documentId: string,
  requestId?: string
) {
  await logAuditEvent({
    action,
    actorId,
    actorType: "doctor",
    requestId,
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
  requestId: string,
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
    requestId,
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
    requestId: intakeId,
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
    requestId: intakeId,
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
    requestId: intakeId || undefined,
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
    requestId: intakeId,
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
    requestId: intakeId,
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
    requestId: intakeId,
    fromState,
    toState,
    metadata,
  })
}
