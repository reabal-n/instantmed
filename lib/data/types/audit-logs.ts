/**
 * Audit Logs - Shared Types & Helpers (Client-Safe)
 * 
 * These types and helpers can be imported in both client and server components.
 * Server-only database operations remain in lib/data/audit-logs.ts
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLog {
  id: string
  action: string
  intake_id: string | null
  profile_id: string | null
  admin_action_id: string | null
  actor_id: string | null
  actor_type: "patient" | "admin" | "system" | "webhook"
  description: string | null
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  client_ip: string | null
  client_user_agent: string | null
  created_at: string
  // Joined fields
  actor?: {
    full_name: string
    email: string
  }
}

export interface AuditLogFilters {
  eventType?: string
  actorType?: string
  intakeId?: string
  profileId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface AuditLogStats {
  total: number
  today: number
  byType: { type: string; count: number }[]
  byActor: { actor_type: string; count: number }[]
}

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get event types for filtering
 */
export function getAuditEventTypes(): { value: string; label: string }[] {
  return [
    { value: "intake_created", label: "Intake Created" },
    { value: "intake_submitted", label: "Intake Submitted" },
    { value: "payment_received", label: "Payment Received" },
    { value: "status_changed", label: "Status Changed" },
    { value: "document_generated", label: "Document Generated" },
    { value: "document_sent", label: "Document Sent" },
    { value: "admin_action", label: "Admin Action" },
    { value: "settings_changed", label: "Settings Changed" },
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
    { value: "refund_processed", label: "Refund Processed" },
  ]
}

/**
 * Format event type for display
 */
export function formatEventType(type: string): string {
  const types = getAuditEventTypes()
  return types.find(t => t.value === type)?.label || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Format actor type for display
 */
export function formatActorType(type: string): string {
  const labels: Record<string, string> = {
    patient: "Patient",
    admin: "Admin",
    system: "System",
    webhook: "Webhook",
  }
  return labels[type] || type
}
