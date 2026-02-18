import { EmailAnalyticsClient } from "./email-analytics-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function EmailAnalyticsPage() {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Fetch email metrics
  // NOTE: email_outbox only tracks processing status (pending/claimed/sent/failed).
  // Open/click tracking is handled separately via Resend webhooks — those metrics
  // are not available in this table.
  const [emailLogsResult, templateStatsResult] = await Promise.allSettled([
    // Recent email logs (no delivery_status column — that's tracked via Resend webhooks)
    supabase
      .from("email_outbox")
      .select("id, email_type, to_email, status, sent_at, error_message")
      .gte("sent_at", monthAgo.toISOString())
      .order("sent_at", { ascending: false })
      .limit(500),

    // Email stats by template
    supabase
      .from("email_outbox")
      .select("email_type, status")
      .gte("sent_at", monthAgo.toISOString()),
  ])

  const emailLogs = emailLogsResult.status === "fulfilled" ? emailLogsResult.value.data || [] : []
  const _templateData = templateStatsResult.status === "fulfilled" ? templateStatsResult.value.data || [] : []

  // Calculate template statistics
  // Open/click data is NOT available in email_outbox — tracked via Resend webhooks
  const templateStats: Record<string, { sent: number; failed: number }> = {}

  for (const log of emailLogs) {
    const template = log.email_type || "unknown"
    if (!templateStats[template]) {
      templateStats[template] = { sent: 0, failed: 0 }
    }
    templateStats[template].sent++
    if (log.status === "failed") templateStats[template].failed++
  }

  // Calculate overall stats
  const totalSent = emailLogs.length
  const totalFailed = emailLogs.filter((e) => e.status === "failed").length

  const analytics = {
    summary: {
      totalSent,
      totalFailed,
      deliveryRate: totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0,
    },
    templateStats: Object.entries(templateStats).map(([template, stats]) => ({
      template,
      ...stats,
    })),
    recentEmails: emailLogs.slice(0, 50).map((log) => ({
      id: log.id,
      template: log.email_type,
      recipient: log.to_email,
      status: log.status,
      sentAt: log.sent_at,
      error: log.error_message,
    })),
  }

  return <EmailAnalyticsClient analytics={analytics} />
}
