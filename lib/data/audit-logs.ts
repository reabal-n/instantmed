/**
 * Audit Logs Data Layer
 * Read operations for compliance audit logs
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

// Re-export types and helpers from shared module (for backward compatibility)
export type { AuditLog, AuditLogFilters, AuditLogStats } from "@/lib/data/types/audit-logs"
export { getAuditEventTypes, formatEventType, formatActorType } from "@/lib/data/types/audit-logs"

import type { AuditLog, AuditLogFilters } from "@/lib/data/types/audit-logs"

const log = createLogger("audit-logs")

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
  const supabase = createServiceRoleClient()

  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      actor:profiles!actor_id (full_name, email)
    `, { count: "exact" })
    .order("created_at", { ascending: false })

  // Apply filters
  if (filters.eventType) {
    query = query.eq("action", filters.eventType)
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
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("audit_logs")
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
  const supabase = createServiceRoleClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Get total count
  const { count: total } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true })

  // Get today's count
  const { count: today } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString())

  // Get recent logs for aggregation
  const { data: recentLogs } = await supabase
    .from("audit_logs")
    .select("action, actor_type")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // Aggregate by type
  const typeCount: Record<string, number> = {}
  const actorCount: Record<string, number> = {}
  
  for (const log of recentLogs || []) {
    typeCount[log.action] = (typeCount[log.action] || 0) + 1
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

// Helpers are now exported from @/lib/data/types/audit-logs
