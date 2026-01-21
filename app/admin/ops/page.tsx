import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsDashboardClient } from "./ops-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function OpsDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser || authUser.profile.role !== "admin") {
    redirect("/")
  }

  const supabase = createServiceRoleClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch operations data
  const [
    webhookDlqResult,
    emailQueueResult,
    recentErrorsResult,
    auditLogsResult,
    systemHealthResult,
  ] = await Promise.all([
    // Failed webhooks (DLQ)
    supabase
      .from("webhook_dlq")
      .select("id, created_at, status, event_type", { count: "exact" })
      .in("status", ["failed", "pending"])
      .order("created_at", { ascending: false })
      .limit(10),
    
    // Email queue status
    supabase
      .from("email_logs")
      .select("id, status, created_at")
      .gte("created_at", dayAgo.toISOString()),
    
    // Recent errors from audit logs
    supabase
      .from("audit_logs")
      .select("id, event_type, created_at, metadata")
      .ilike("event_type", "%error%")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    
    // Audit log volume
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo.toISOString()),
    
    // System health check (intakes processing)
    supabase
      .from("intakes")
      .select("id, status, created_at, updated_at")
      .eq("status", "paid")
      .lt("created_at", new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // Older than 2 hours
      .limit(10),
  ])

  // Process email stats
  const emailStats = {
    total: emailQueueResult.data?.length || 0,
    sent: emailQueueResult.data?.filter((e) => e.status === "sent").length || 0,
    failed: emailQueueResult.data?.filter((e) => e.status === "failed").length || 0,
    pending: emailQueueResult.data?.filter((e) => e.status === "pending").length || 0,
  }
  
  const emailSuccessRate = emailStats.total > 0 
    ? ((emailStats.sent / emailStats.total) * 100).toFixed(1) 
    : "100"

  // Stale intakes (paid but not reviewed in 2+ hours)
  const staleIntakes = systemHealthResult.data || []

  const ops = {
    webhooks: {
      failedCount: webhookDlqResult.count || 0,
      recentFailed: webhookDlqResult.data || [],
    },
    emails: {
      ...emailStats,
      successRate: parseFloat(emailSuccessRate),
    },
    errors: {
      count: recentErrorsResult.data?.length || 0,
      recent: recentErrorsResult.data || [],
    },
    auditVolume: auditLogsResult.count || 0,
    staleIntakes: staleIntakes.length,
    systemStatus: {
      webhooksHealthy: (webhookDlqResult.count || 0) < 5,
      emailsHealthy: emailStats.failed < 3,
      intakesHealthy: staleIntakes.length < 3,
    },
  }

  return <OpsDashboardClient ops={ops} />
}
