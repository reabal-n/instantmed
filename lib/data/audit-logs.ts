/**
 * Audit Logs Data Layer
 * Read operations for compliance audit logs
 */

import "server-only"

import { readDashboardQuery } from "@/lib/data/dashboard-read-model"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Re-export types and helpers from shared module (for backward compatibility)
export type { AuditLog, AuditLogFilters, AuditLogStats } from "@/lib/data/types/audit-logs"
export { formatActorType,formatEventType, getAuditEventTypes } from "@/lib/data/types/audit-logs"

import type { AuditLog, AuditLogFilters } from "@/lib/data/types/audit-logs"

const log = createLogger("audit-logs")

/** Escape ILIKE special characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
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
  const supabase = createServiceRoleClient()

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
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
    query = query.ilike("description", `%${escapeIlike(filters.search)}%`)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const result = await readDashboardQuery({
    label: "audit-logs",
    fallback: { rows: [] as AuditLog[], total: 0 },
    context: {
      actorType: filters.actorType,
      eventType: filters.eventType,
      hasSearch: Boolean(filters.search),
      page,
      pageSize,
    },
    operation: async () => {
      const { data, error, count } = await query

      return {
        data: {
          rows: (data || []) as AuditLog[],
          total: count || 0,
        },
        error,
      }
    },
  })

  const rows = result.rows
  const actorIds = [
    ...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
  ]

  if (actorIds.length === 0) {
    return {
      data: rows,
      total: result.total,
    }
  }

  const { data: actors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", actorIds)

  const actorById = new Map(
    (actors || []).map((actor) => [
      actor.id as string,
      {
        full_name: (actor.full_name as string | null) || "Unknown",
        email: (actor.email as string | null) || "",
      },
    ]),
  )

  return {
    data: rows.map((row) => ({
      ...row,
      actor: row.actor_id ? actorById.get(row.actor_id) : undefined,
    })),
    total: result.total,
  }
}

/**
 * Get audit logs for a specific intake
 */
export async function getAuditLogsForIntake(intakeId: string): Promise<AuditLog[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
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
    .select("id", { count: "exact", head: true })

  // Get today's count
  const { count: today } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
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
