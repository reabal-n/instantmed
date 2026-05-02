import { getStuckIntakes } from "@/lib/data/intake-ops"
import {
  getDuplicatePatientProfileSummary,
  getPrescribingIdentityBlockerReport,
} from "@/lib/doctor/patient-identity-report"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { OpsDashboardClient } from "./ops-client"

export const dynamic = "force-dynamic"

export default async function OpsDashboardPage() {
  const supabase = createServiceRoleClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch operations data - some tables may not exist in production
  const [
    webhookDlqResult,
    emailQueueResult,
    recentErrorsResult,
    auditLogsResult,
    stuckIntakesResult,
    patientIdentityResult,
    prescribingIdentityResult,
  ] = await Promise.all([
    // Failed webhooks (DLQ)
    supabase
      .from("stripe_webhook_dead_letter")
      .select("id, created_at, resolved_at, event_type", { count: "exact" })
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(r => r.error ? { data: [], count: 0 } : r),
    
    // Email queue status
    supabase
      .from("email_outbox")
      .select("id, status, created_at")
      .gte("created_at", dayAgo.toISOString())
      .then(r => r.error ? { data: [] } : r),
    
    // Recent errors from audit logs
    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .or("action.ilike.%error%,action.eq.webhook_failed")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    
    // Audit log volume
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo.toISOString()),
    
    getStuckIntakes({}),

    getDuplicatePatientProfileSummary(supabase),

    getPrescribingIdentityBlockerReport(supabase),
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

  const stuckIntakeCount = stuckIntakesResult.counts.total

  const ops = {
    webhooks: {
      failedCount: webhookDlqResult.count || 0,
      recentFailed: (webhookDlqResult.data || []).map((entry) => ({
        ...entry,
        status: entry.resolved_at ? "resolved" : "open",
      })),
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
    patientIdentity: patientIdentityResult,
    prescribingIdentity: {
      totalActive: prescribingIdentityResult.totalActive,
      blockedCount: prescribingIdentityResult.blockedCount,
      readyCount: prescribingIdentityResult.readyCount,
      topBlockers: Object.entries(prescribingIdentityResult.blockerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => ({ label, count })),
    },
    staleIntakes: stuckIntakeCount,
    systemStatus: {
      webhooksHealthy: (webhookDlqResult.count || 0) < 5,
      emailsHealthy: emailStats.failed < 3,
      intakesHealthy: stuckIntakeCount < 3,
      patientIdentityHealthy: patientIdentityResult.duplicateProfileCount === 0,
      prescribingIdentityHealthy: prescribingIdentityResult.blockedCount === 0,
    },
  }

  return <OpsDashboardClient ops={ops} />
}
