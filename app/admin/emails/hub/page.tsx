import { Suspense } from "react"

import { getEmailStats, getRecentEmailActivity, getRecentEmailIssues } from "@/app/actions/email-stats"
import { Skeleton } from "@/components/ui/skeleton"
import { requireRole } from "@/lib/auth/helpers"
import { getEmailOutboxList } from "@/lib/data/email-outbox"
import { canAccessDevOnlyRoute } from "@/lib/dev-only-routes"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { EmailHubClient } from "./email-hub-client"

export const dynamic = "force-dynamic"

/**
 * Email delivery — operational dashboard for the /admin/emails section.
 *
 * Canonical email ops surface. Template editing lives at
 * /admin/emails/templates; legacy email aliases redirect here.
 *
 * /admin/email-hub still exists as a redirect for bookmarks.
 */
export default async function EmailHubPage({
  searchParams,
}: {
  searchParams?: Promise<{ intake_id?: string; intake?: string }>
}) {
  await requireRole(["admin"])
  const params = await searchParams
  const intakeId = params?.intake_id || params?.intake || undefined

  const supabase = createServiceRoleClient()

  // Fetch real email stats, activity, template counts, and yesterday's volume in parallel
  const now = new Date()
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [statsResult, activityResult, issueResult, outboxResult, templateCountResult, yesterdayCountResult] = await Promise.all([
    getEmailStats(),
    getRecentEmailActivity(20),
    getRecentEmailIssues(25),
    getEmailOutboxList({ page: 1, pageSize: 50, filters: intakeId ? { intake_id: intakeId } : undefined }),
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
  const authEmailHookStatus = {
    configured: Boolean(process.env.SUPABASE_AUTH_WEBHOOK_HOOK_SECRET && process.env.RESEND_API_KEY),
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasSupabaseHookSecret: Boolean(process.env.SUPABASE_AUTH_WEBHOOK_HOOK_SECRET),
    devPreviewAvailable: canAccessDevOnlyRoute(),
  }

  return (
    <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
      <EmailHubClient
        initialStats={statsResult.stats}
        initialActivity={activityResult.activity}
        issueActivity={issueResult.activity}
        outboxRows={outboxResult.data}
        outboxTotal={outboxResult.total}
        initialOutboxQuery={intakeId ?? ""}
        templateCounts={{ active: activeTemplates, total: totalTemplates }}
        yesterdayEmailCount={yesterdayEmails}
        authEmailHookStatus={authEmailHookStatus}
      />
    </Suspense>
  )
}
