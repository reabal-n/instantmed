import { Suspense } from "react"

import { getEmailStats, getRecentEmailActivity } from "@/app/actions/email-stats"
import { Skeleton } from "@/components/ui/skeleton"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { EmailHubClient } from "./email-hub-client"

export const dynamic = "force-dynamic"

/**
 * Email Hub — operational dashboard for the /admin/emails section.
 *
 * Phase 6 of the doctor + admin portal rebuild (2026-04-29). Moved
 * from /admin/email-hub so all three email surfaces (Templates, Hub,
 * Analytics) live under /admin/emails behind a shared tab nav.
 *
 * /admin/email-hub still exists as a redirect for bookmarks + email
 * digest links.
 */
export default async function EmailHubPage() {
  const supabase = createServiceRoleClient()

  // Fetch real email stats, activity, template counts, and yesterday's volume in parallel
  const now = new Date()
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [statsResult, activityResult, templateCountResult, yesterdayCountResult] = await Promise.all([
    getEmailStats(),
    getRecentEmailActivity(10),
    supabase.from("email_templates").select("id, is_active", { count: "exact" }),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", yesterdayEnd.toISOString())
      .in("status", ["sent", "skipped_e2e"]),
  ])

  const totalTemplates = templateCountResult.count || 0
  const activeTemplates = templateCountResult.data?.filter(t => t.is_active).length || 0
  const yesterdayEmails = yesterdayCountResult.count || 0

  return (
    <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
      <EmailHubClient
        initialStats={statsResult.stats}
        initialActivity={activityResult.activity}
        templateCounts={{ active: activeTemplates, total: totalTemplates }}
        yesterdayEmailCount={yesterdayEmails}
      />
    </Suspense>
  )
}
