"use server"

import { requireRole } from "@/lib/auth/helpers"
import { buildEmailAnalytics, type EmailAnalyticsRow } from "@/lib/email/analytics"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("email-stats")

export interface EmailStats {
  emailsSentToday: number
  emailsSentWeek: number
  sendSuccessRate: number | null
  deliveryRate: number | null
  deliveredEmails: number
  bouncedEmails: number
  complainedEmails: number
  openedEmails: number
  clickedEmails: number
  pendingEmails: number
  failedEmails: number
}

export interface RecentEmailActivity {
  id: string
  emailType: string
  toEmail: string
  status: string
  deliveryStatus: string | null
  createdAt: string
  intakeId: string | null
  errorMessage: string | null
  retryCount: number
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
      log.error("Failed to get today's email count", { error: todayError })
    }

    // Email activity this week, including delivery webhook status.
    const { data: weekRows, error: weekError } = await supabase
      .from("email_outbox")
      .select("id, email_type, to_email, status, created_at, sent_at, error_message, delivery_status, delivery_status_updated_at")
      .gte("created_at", weekAgo)

    if (weekError) {
      log.error("Failed to get week's email activity", { error: weekError })
    }

    // Pending emails (if any queue mechanism exists)
    const { count: pendingCount, error: pendingError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")

    if (pendingError) {
      log.error("Failed to get pending email count", { error: pendingError })
    }

    const analytics = buildEmailAnalytics(((weekRows || []) as EmailAnalyticsRow[]))

    return {
      stats: {
        emailsSentToday: todayCount || 0,
        emailsSentWeek: analytics.summary.totalAccepted,
        sendSuccessRate: analytics.summary.sendSuccessRate,
        deliveryRate: analytics.summary.deliveryRate,
        deliveredEmails: analytics.summary.delivered,
        bouncedEmails: analytics.summary.bounced,
        complainedEmails: analytics.summary.complained,
        openedEmails: analytics.summary.opened,
        clickedEmails: analytics.summary.clicked,
        pendingEmails: pendingCount || 0,
        failedEmails: analytics.summary.totalFailed,
      },
    }
  } catch (error) {
    log.error("Failed to fetch email stats", { error })
    return {
      stats: {
        emailsSentToday: 0,
        emailsSentWeek: 0,
        sendSuccessRate: null,
        deliveryRate: null,
        deliveredEmails: 0,
        bouncedEmails: 0,
        complainedEmails: 0,
        openedEmails: 0,
        clickedEmails: 0,
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
      .select("id, email_type, to_email, status, delivery_status, created_at, intake_id, error_message, retry_count")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      log.error("Failed to fetch recent email activity", { error })
      return { activity: [], error: error.message }
    }

    const activity: RecentEmailActivity[] = (data || []).map((row) => ({
      id: row.id,
      emailType: row.email_type || "unknown",
      toEmail: row.to_email,
      status: row.status,
      deliveryStatus: row.delivery_status,
      createdAt: row.created_at,
      intakeId: row.intake_id,
      errorMessage: row.error_message,
      retryCount: row.retry_count ?? 0,
    }))

    return { activity }
  } catch (error) {
    log.error("Failed to fetch recent email activity", { error })
    return { activity: [], error: "Failed to fetch recent activity" }
  }
}
