/**
 * Audit Logs Data Layer
 * Read operations for compliance audit logs
 */

import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("audit-logs")

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLog {
  id: string
  event_type: string
  intake_id: string | null
  profile_id: string | null
  admin_action_id: string | null
  actor_id: string | null
  actor_type: "patient" | "admin" | "system" | "webhook"
  description: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  metadata: Record<string, unknown>
  client_ip: string | null
  client_user_agent: string | null
  request_id: string | null
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

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AuditLog[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from("audit_log")
    .select(`
      *,
      actor:profiles!actor_id (full_name, email)
    `, { count: "exact" })
    .order("created_at", { ascending: false })

  // Apply filters
  if (filters.eventType) {
    query = query.eq("event_type", filters.eventType)
  }
  if (filters.actorType) {
    query = query.eq("actor_type", filters.actorType)
  }
  if (filters.intakeId) {
    query = query.eq("intake_id", filters.intakeId)
  }
  if (filters.profileId) {
    query = query.eq("profile_id", filters.profileId)
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate)
  }
  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    log.error("Failed to fetch audit logs", {}, error)
    return { data: [], total: 0 }
  }

  return {
    data: data as AuditLog[],
    total: count || 0,
  }
}

/**
 * Get audit logs for a specific intake
 */
export async function getAuditLogsForIntake(intakeId: string): Promise<AuditLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("audit_log")
    .select(`
      *,
      actor:profiles!actor_id (full_name, email)
    `)
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: true })

  if (error) {
    log.error("Failed to fetch intake audit logs", { intakeId }, error)
    return []
  }

  return data as AuditLog[]
}

/**
 * Get audit log stats for dashboard
 */
export async function getAuditLogStats(): Promise<{
  total: number
  today: number
  byType: { type: string; count: number }[]
  byActor: { actor_type: string; count: number }[]
}> {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Get total count
  const { count: total } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true })

  // Get today's count
  const { count: today } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString())

  // Get recent logs for aggregation
  const { data: recentLogs } = await supabase
    .from("audit_log")
    .select("event_type, actor_type")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // Aggregate by type
  const typeCount: Record<string, number> = {}
  const actorCount: Record<string, number> = {}
  
  for (const log of recentLogs || []) {
    typeCount[log.event_type] = (typeCount[log.event_type] || 0) + 1
    actorCount[log.actor_type] = (actorCount[log.actor_type] || 0) + 1
  }

  return {
    total: total || 0,
    today: today || 0,
    byType: Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    byActor: Object.entries(actorCount)
      .map(([actor_type, count]) => ({ actor_type, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ============================================================================
// HELPERS
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
