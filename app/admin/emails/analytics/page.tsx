import { buildEmailAnalytics, type EmailAnalyticsRow } from "@/lib/email/analytics"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { EmailAnalyticsClient } from "./email-analytics-client"

export const dynamic = "force-dynamic"

export default async function EmailAnalyticsPage() {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [emailLogsResult] = await Promise.allSettled([
    supabase
      .from("email_outbox")
      .select("id, email_type, to_email, status, sent_at, error_message, delivery_status, delivery_status_updated_at")
      .gte("sent_at", monthAgo.toISOString())
      .order("sent_at", { ascending: false })
      .limit(500),
  ])

  const emailLogs = emailLogsResult.status === "fulfilled"
    ? (emailLogsResult.value.data || []) as EmailAnalyticsRow[]
    : []
  const analytics = buildEmailAnalytics(emailLogs)

  return <EmailAnalyticsClient analytics={analytics} />
}
