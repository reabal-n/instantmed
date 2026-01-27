import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { EmailAnalyticsClient } from "./email-analytics-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function EmailAnalyticsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser || authUser.profile.role !== "admin") {
    redirect("/")
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Fetch email metrics
  const [emailLogsResult, templateStatsResult] = await Promise.allSettled([
    // Recent email logs with tracking data
    supabase
      .from("email_logs")
      .select("id, template, recipient, status, sent_at, opened_at, clicked_at, error")
      .gte("sent_at", monthAgo.toISOString())
      .order("sent_at", { ascending: false })
      .limit(500),
    
    // Email stats by template
    supabase
      .from("email_logs")
      .select("template, status")
      .gte("sent_at", monthAgo.toISOString()),
  ])

  const emailLogs = emailLogsResult.status === "fulfilled" ? emailLogsResult.value.data || [] : []
  const _templateData = templateStatsResult.status === "fulfilled" ? templateStatsResult.value.data || [] : []

  // Calculate template statistics
  const templateStats: Record<string, { sent: number; opened: number; clicked: number; failed: number }> = {}
  
  for (const log of emailLogs) {
    const template = log.template || "unknown"
    if (!templateStats[template]) {
      templateStats[template] = { sent: 0, opened: 0, clicked: 0, failed: 0 }
    }
    templateStats[template].sent++
    if (log.opened_at) templateStats[template].opened++
    if (log.clicked_at) templateStats[template].clicked++
    if (log.status === "failed") templateStats[template].failed++
  }

  // Calculate overall stats
  const totalSent = emailLogs.length
  const totalOpened = emailLogs.filter((e) => e.opened_at).length
  const totalClicked = emailLogs.filter((e) => e.clicked_at).length
  const totalFailed = emailLogs.filter((e) => e.status === "failed").length

  const analytics = {
    summary: {
      totalSent,
      totalOpened,
      totalClicked,
      totalFailed,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      deliveryRate: totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0,
    },
    templateStats: Object.entries(templateStats).map(([template, stats]) => ({
      template,
      ...stats,
      openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
      clickRate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
    })),
    recentEmails: emailLogs.slice(0, 50).map((log) => ({
      id: log.id,
      template: log.template,
      recipient: log.recipient,
      status: log.status,
      sentAt: log.sent_at,
      openedAt: log.opened_at,
      clickedAt: log.clicked_at,
      error: log.error,
    })),
  }

  return <EmailAnalyticsClient analytics={analytics} />
}
