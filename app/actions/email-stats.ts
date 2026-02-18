"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRole } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"

export interface EmailStats {
  emailsSentToday: number
  emailsSentWeek: number
  deliveryRate: number
  pendingEmails: number
  failedEmails: number
}

export interface RecentEmailActivity {
  id: string
  emailType: string
  toEmail: string
  status: string
  createdAt: string
  intakeId: string | null
  errorMessage: string | null
}

/**
 * Fetch email statistics from email_outbox table
 */
export async function getEmailStats(): Promise<{ stats: EmailStats; error?: string }> {
  try {
    await requireRole(["admin", "doctor"])
    const supabase = createServiceRoleClient()

    // Get today's date range (UTC)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Emails sent today
    const { count: todayCount, error: todayError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .in("status", ["sent", "skipped_e2e"])

    if (todayError) {
      logger.error("Failed to get today's email count", { error: todayError })
    }

    // Emails sent this week
    const { count: weekCount, error: weekError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .in("status", ["sent", "skipped_e2e"])

    if (weekError) {
      logger.error("Failed to get week's email count", { error: weekError })
    }

    // Pending emails (if any queue mechanism exists)
    const { count: pendingCount, error: pendingError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")

    if (pendingError) {
      logger.error("Failed to get pending email count", { error: pendingError })
    }

    // Failed emails (last 7 days)
    const { count: failedCount, error: failedError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .eq("status", "failed")

    if (failedError) {
      logger.error("Failed to get failed email count", { error: failedError })
    }

    // Calculate delivery rate (sent / (sent + failed) * 100) for last 7 days
    const totalSent = weekCount || 0
    const totalFailed = failedCount || 0
    const totalAttempted = totalSent + totalFailed
    const deliveryRate = totalAttempted > 0 
      ? Math.round((totalSent / totalAttempted) * 1000) / 10 
      : 100

    return {
      stats: {
        emailsSentToday: todayCount || 0,
        emailsSentWeek: weekCount || 0,
        deliveryRate,
        pendingEmails: pendingCount || 0,
        failedEmails: failedCount || 0,
      },
    }
  } catch (error) {
    logger.error("Failed to fetch email stats", { error })
    return {
      stats: {
        emailsSentToday: 0,
        emailsSentWeek: 0,
        deliveryRate: 0,
        pendingEmails: 0,
        failedEmails: 0,
      },
      error: "Failed to fetch email statistics",
    }
  }
}

/**
 * Fetch recent email activity from email_outbox table
 */
export async function getRecentEmailActivity(limit = 10): Promise<{ 
  activity: RecentEmailActivity[]
  error?: string 
}> {
  try {
    await requireRole(["admin", "doctor"])
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("email_outbox")
      .select("id, email_type, to_email, status, created_at, intake_id, error_message")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      logger.error("Failed to fetch recent email activity", { error })
      return { activity: [], error: error.message }
    }

    const activity: RecentEmailActivity[] = (data || []).map((row) => ({
      id: row.id,
      emailType: row.email_type || "unknown",
      toEmail: row.to_email,
      status: row.status,
      createdAt: row.created_at,
      intakeId: row.intake_id,
      errorMessage: row.error_message,
    }))

    return { activity }
  } catch (error) {
    logger.error("Failed to fetch recent email activity", { error })
    return { activity: [], error: "Failed to fetch recent activity" }
  }
}
