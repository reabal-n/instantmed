import "server-only"
import { createClient } from "@supabase/supabase-js"

export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "request_created"
  | "request_approved"
  | "request_declined"
  | "request_updated"
  | "document_generated"
  | "document_downloaded"
  | "profile_updated"
  | "payment_completed"
  | "admin_action"
  | "settings_changed"
  | "state_change"
  | "refund_attempted"
  | "refund_succeeded"
  | "refund_failed"

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

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn("Missing Supabase credentials for audit logging")
    return null
  }
  return createClient(url, key)
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const supabase = getServiceClient()
  
  if (!supabase) {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("[Audit Log]", entry)
    }
    return
  }

  try {
    await supabase.from("audit_logs").insert({
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
  } catch (error) {
    console.error("Failed to log audit event:", error)
  }
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
