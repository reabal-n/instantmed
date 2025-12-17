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

interface AuditLogEntry {
  action: AuditAction
  userId?: string
  targetId?: string
  targetType?: "request" | "profile" | "document" | "payment"
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
      user_id: entry.userId,
      target_id: entry.targetId,
      target_type: entry.targetType,
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
export async function logLogin(userId: string, ipAddress?: string, userAgent?: string) {
  await logAuditEvent({
    action: "login",
    userId,
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
  userId: string,
  requestId: string,
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    action,
    userId,
    targetId: requestId,
    targetType: "request",
    metadata,
  })
}

export async function logDocumentAction(
  action: "document_generated" | "document_downloaded",
  userId: string,
  documentId: string,
  requestId?: string
) {
  await logAuditEvent({
    action,
    userId,
    targetId: documentId,
    targetType: "document",
    metadata: requestId ? { requestId } : undefined,
  })
}

export async function logAdminAction(
  userId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    action: "admin_action",
    userId,
    metadata: { description, ...metadata },
  })
}
