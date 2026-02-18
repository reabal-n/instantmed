import { Suspense } from "react"
import { EmailHubClient } from "./email-hub-client"
import { Skeleton } from "@/components/ui/skeleton"
import { getEmailStats, getRecentEmailActivity } from "@/app/actions/email-stats"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

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
    <div className="container py-6 space-y-6">
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailHubClient
          initialStats={statsResult.stats}
          initialActivity={activityResult.activity}
          templateCounts={{ active: activeTemplates, total: totalTemplates }}
          yesterdayEmailCount={yesterdayEmails}
        />
      </Suspense>
    </div>
  )
}
