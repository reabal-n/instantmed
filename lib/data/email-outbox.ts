"use server"

/**
 * Email Outbox Data Access
 * 
 * Server-side queries for the email_outbox table.
 * Used by the admin email outbox viewer.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

// ============================================================================
// TYPES
// ============================================================================

export interface EmailOutboxRow {
  id: string
  email_type: string
  to_email: string
  to_name: string | null
  subject: string
  status: "pending" | "sent" | "failed" | "skipped_e2e"
  provider: string
  provider_message_id: string | null
  error_message: string | null
  retry_count: number
  intake_id: string | null
  patient_id: string | null
  certificate_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  sent_at: string | null
}

export interface EmailOutboxFilters {
  status?: string
  email_type?: string
  to_email?: string
  intake_id?: string
}

export interface EmailOutboxListResult {
  data: EmailOutboxRow[]
  total: number
  page: number
  pageSize: number
  error?: string
}

// ============================================================================
// LIST QUERY
// ============================================================================

/**
 * Get paginated list of email_outbox rows with optional filters.
 * Uses service role to bypass RLS for admin access.
 */
export async function getEmailOutboxList(options: {
  page?: number
  pageSize?: number
  filters?: EmailOutboxFilters
}): Promise<EmailOutboxListResult> {
  const { page = 1, pageSize = 100, filters = {} } = options
  const offset = (page - 1) * pageSize

  try {
    const supabase = createServiceRoleClient()

    // Build query - select columns needed for list view (exclude heavy content)
    let query = supabase
      .from("email_outbox")
      .select(
        `
        id,
        email_type,
        to_email,
        to_name,
        subject,
        status,
        provider,
        provider_message_id,
        error_message,
        retry_count,
        intake_id,
        patient_id,
        certificate_id,
        metadata,
        created_at,
        sent_at
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    // Apply filters
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.email_type) {
      query = query.eq("email_type", filters.email_type)
    }
    if (filters.to_email) {
      query = query.ilike("to_email", `%${filters.to_email}%`)
    }
    if (filters.intake_id) {
      query = query.eq("intake_id", filters.intake_id)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error("[EmailOutbox] Query failed", { error: error.message })
      Sentry.captureException(error, {
        tags: { action: "email_outbox_list" },
        extra: { filters },
      })
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: error.message,
      }
    }

    return {
      data: (data as EmailOutboxRow[]) || [],
      total: count || 0,
      page,
      pageSize,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("[EmailOutbox] Query exception", { error: message })
    Sentry.captureException(err, { tags: { action: "email_outbox_list" } })
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      error: message,
    }
  }
}

// ============================================================================
// DETAIL QUERY
// ============================================================================

/**
 * Get a single email_outbox row by ID with all fields.
 */
export async function getEmailOutboxById(
  id: string
): Promise<{ data: EmailOutboxRow | null; error?: string }> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("email_outbox")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      logger.error("[EmailOutbox] Detail query failed", {
        id,
        error: error.message,
      })
      return { data: null, error: error.message }
    }

    return { data: data as EmailOutboxRow }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("[EmailOutbox] Detail query exception", { id, error: message })
    return { data: null, error: message }
  }
}

// ============================================================================
// STATS QUERY
// ============================================================================

/**
 * Get email_outbox statistics for the dashboard header.
 */
export async function getEmailOutboxStats(): Promise<{
  total: number
  sent: number
  failed: number
  skipped_e2e: number
  pending: number
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc("get_email_outbox_stats")

    if (error) {
      // If RPC doesn't exist, fall back to manual counts
      const [totalRes, sentRes, failedRes, skippedRes, pendingRes] =
        await Promise.all([
          supabase
            .from("email_outbox")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("email_outbox")
            .select("*", { count: "exact", head: true })
            .eq("status", "sent"),
          supabase
            .from("email_outbox")
            .select("*", { count: "exact", head: true })
            .eq("status", "failed"),
          supabase
            .from("email_outbox")
            .select("*", { count: "exact", head: true })
            .eq("status", "skipped_e2e"),
          supabase
            .from("email_outbox")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
        ])

      return {
        total: totalRes.count || 0,
        sent: sentRes.count || 0,
        failed: failedRes.count || 0,
        skipped_e2e: skippedRes.count || 0,
        pending: pendingRes.count || 0,
      }
    }

    return data || { total: 0, sent: 0, failed: 0, skipped_e2e: 0, pending: 0 }
  } catch {
    return { total: 0, sent: 0, failed: 0, skipped_e2e: 0, pending: 0 }
  }
}

// ============================================================================
// DISTINCT VALUES FOR FILTERS
// ============================================================================

/**
 * Get distinct email_type values for filter dropdown.
 */
export async function getDistinctEmailTypes(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("email_outbox")
      .select("email_type")
      .order("email_type")

    if (error || !data) return []

    // Get unique values
    const types = [...new Set(data.map((r) => r.email_type))]
    return types
  } catch {
    return []
  }
}
