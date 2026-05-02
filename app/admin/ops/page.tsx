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
    safetyBlocksResult,
    systemHealthResult,
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

    supabase
      .from("safety_audit_log")
      .select("id, evaluated_at, service_slug, outcome, risk_tier, triggered_rule_ids, request_id", { count: "exact" })
      .neq("outcome", "ALLOW")
      .gte("evaluated_at", dayAgo.toISOString())
      .order("evaluated_at", { ascending: false })
      .limit(10)
      .then(r => r.error ? { data: [], count: 0 } : r),
    
    // System health check (intakes processing)
    supabase
      .from("intakes")
      .select("id, status, paid_at, updated_at")
      .eq("status", "paid")
      .eq("payment_status", "paid")
      .lt("paid_at", new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
      .limit(10),

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

  // Stale intakes (paid but not reviewed in 2+ hours)
  const staleIntakes = systemHealthResult.data || []

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
    safetyBlocks: {
      count: safetyBlocksResult.count || 0,
      recent: safetyBlocksResult.data || [],
    },
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
    staleIntakes: staleIntakes.length,
    systemStatus: {
      webhooksHealthy: (webhookDlqResult.count || 0) < 5,
      emailsHealthy: emailStats.failed < 3,
      intakesHealthy: staleIntakes.length < 3,
      patientIdentityHealthy: patientIdentityResult.duplicateProfileCount === 0,
      prescribingIdentityHealthy: prescribingIdentityResult.blockedCount === 0,
    },
  }

  return <OpsDashboardClient ops={ops} />
}
