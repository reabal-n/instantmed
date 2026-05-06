import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"
import { requireRole } from "@/lib/auth/helpers"
import { getMissingTelegramAlertEnv } from "@/lib/config/env"
import {
  ADMIN_AUDIT_HREF,
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminIntakeHref,
} from "@/lib/dashboard/routes"
import {
  getDuplicatePatientProfileSummary,
  getPrescribingIdentityBlockerReport,
} from "@/lib/doctor/patient-identity-report"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { OpsDashboardClient } from "./ops-client"

export const dynamic = "force-dynamic"

type AuditErrorRow = {
  id: string
  action: string
  created_at: string
  metadata: Record<string, unknown> | null
}

function getMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isNonActionableParchmentSandboxError(row: AuditErrorRow): boolean {
  return row.action === "webhook_failed"
    && getMetadataString(row.metadata, "eventType") === "parchment:prescription.created"
    && getMetadataString(row.metadata, "error") === "no_awaiting_script_intake"
}

function filterNonActionableOpsErrors(rows: AuditErrorRow[]): AuditErrorRow[] {
  return rows.filter((row) => !isNonActionableParchmentSandboxError(row))
}

function metadataEquals(row: AuditErrorRow, key: string, expected: string): boolean {
  return getMetadataString(row.metadata, key) === expected
}

function metadataStartsWith(row: AuditErrorRow, key: string, prefix: string): boolean {
  return getMetadataString(row.metadata, key)?.startsWith(prefix) || false
}

export default async function OpsDashboardPage() {
  await requireRole(["admin"], { redirectTo: "/admin" })

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
    systemHealthResult,
    patientIdentityResult,
    prescribingIdentityResult,
    emailFailuresResult,
    checkoutFailuresResult,
    incompleteRequestsResult,
    certificateFailuresResult,
    prescriptionWebhookFailuresResult,
    staleScriptIntakesResult,
    opsAuditActionsResult,
    recentOutgoingEmailsResult,
    latestPaidIntakeResult,
    latestSentEmailResult,
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

    supabase
      .from("email_outbox")
      .select("id, email_type, status, error_message, delivery_status, created_at")
      .or("status.eq.failed,delivery_status.eq.bounced,delivery_status.eq.complained")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype, checkout_error")
      .eq("status", "checkout_failed")
      .gte("updated_at", weekAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype")
      .eq("status", "pending_payment")
      .neq("payment_status", "paid")
      .lt("updated_at", new Date(now.getTime() - 30 * 60 * 1000).toISOString())
      .gte("created_at", weekAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("issued_certificates")
      .select("id, intake_id, updated_at, email_failed_at, email_failure_reason")
      .not("email_failed_at", "is", null)
      .gte("email_failed_at", weekAgo.toISOString())
      .order("email_failed_at", { ascending: false })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("action", "webhook_failed")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype")
      .eq("status", "awaiting_script")
      .eq("payment_status", "paid")
      .lt("updated_at", new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("action", "admin_action")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(100)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("email_outbox")
      .select("id, email_type, subject, status, delivery_status, error_message, retry_count, intake_id, created_at, sent_at, last_attempt_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("intakes")
      .select("id, paid_at, category, subtype")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(1)
      .then(r => r.error ? { data: [] } : r),

    supabase
      .from("email_outbox")
      .select("id, email_type, status, delivery_status, sent_at, created_at, intake_id")
      .in("status", ["sent", "skipped_e2e"])
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .then(r => r.error ? { data: [] } : r),
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
  const recentErrors = filterNonActionableOpsErrors((recentErrorsResult.data || []) as AuditErrorRow[])
  const prescriptionWebhookFailures = filterNonActionableOpsErrors(
    (prescriptionWebhookFailuresResult.data || []) as AuditErrorRow[],
  ).filter((row) => getMetadataString(row.metadata, "eventType") === "parchment:prescription.created")
  const missingTelegramAlertEnv = getMissingTelegramAlertEnv()
  const missingEmailDeliveryEnv = [
    process.env.RESEND_API_KEY ? null : "RESEND_API_KEY",
  ].filter((value): value is string => Boolean(value))
  const opsAuditActions = ((opsAuditActionsResult.data || []) as AuditErrorRow[])
  const lastTelegramTest = opsAuditActions.find((row) =>
    metadataEquals(row, "action_type", "telegram_test_alert") && metadataEquals(row, "status", "sent")
  )
  const lastOpsEmailTest = opsAuditActions.find((row) =>
    metadataEquals(row, "action_type", "ops_test_email") && metadataEquals(row, "status", "sent")
  )
  const lastParchmentSuccess = opsAuditActions.find((row) =>
    metadataStartsWith(row, "action_type", "parchment_webhook_")
      || (metadataEquals(row, "action_type", "parchment_webhook_retry") && metadataEquals(row, "result", "success"))
  )
  const latestPaidIntake = latestPaidIntakeResult.data?.[0] || null
  const latestSentEmail = latestSentEmailResult.data?.[0] || null
  const failureOverview = buildOperationalFailureOverview({
    stripeDlq: webhookDlqResult.data || [],
    emailFailures: emailFailuresResult.data || [],
    checkoutFailures: checkoutFailuresResult.data || [],
    incompleteRequests: incompleteRequestsResult.data || [],
    certificateFailures: certificateFailuresResult.data || [],
    prescriptionWebhookFailures,
    staleScriptIntakes: staleScriptIntakesResult.data || [],
  })

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
      configured: missingEmailDeliveryEnv.length === 0,
      missingVars: missingEmailDeliveryEnv,
      lastTestedAt: lastOpsEmailTest?.created_at || null,
      recentOutgoing: (recentOutgoingEmailsResult.data || []).map((row) => ({
        id: row.id,
        emailType: row.email_type || "unknown",
        subject: row.subject || "No subject",
        status: row.status || "unknown",
        deliveryStatus: row.delivery_status || null,
        errorMessage: row.error_message || null,
        retryCount: row.retry_count ?? 0,
        intakeId: row.intake_id || null,
        occurredAt: row.sent_at || row.last_attempt_at || row.created_at,
        href: row.intake_id ? buildAdminIntakeHref(row.intake_id) : `${ADMIN_EMAIL_HUB_HREF}?tab=queue`,
      })),
    },
    errors: {
      count: recentErrors.length,
      recent: recentErrors,
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
    staleIntakes: staleIntakes.length,
    failureOverview,
    alerting: {
      telegramConfigured: missingTelegramAlertEnv.length === 0,
      missingTelegramVars: missingTelegramAlertEnv,
      telegramLastTestedAt: lastTelegramTest?.created_at || null,
    },
    productionTimeline: [
      {
        id: "payment_webhook",
        label: "Payment webhook",
        status: latestPaidIntake ? "ok" as const : "missing" as const,
        detail: latestPaidIntake
          ? [latestPaidIntake.category, latestPaidIntake.subtype].filter(Boolean).join(" / ") || "Paid request recorded"
          : "No paid request recorded yet",
        occurredAt: latestPaidIntake?.paid_at || null,
        href: latestPaidIntake ? buildAdminIntakeHref(latestPaidIntake.id) : ADMIN_WEBHOOK_DLQ_HREF,
      },
      {
        id: "email_delivery",
        label: "Email delivery",
        status: latestSentEmail ? "ok" as const : "missing" as const,
        detail: latestSentEmail
          ? `${latestSentEmail.email_type || "email"} / ${latestSentEmail.delivery_status || latestSentEmail.status}`
          : "No sent email recorded yet",
        occurredAt: latestSentEmail?.sent_at || latestSentEmail?.created_at || null,
        href: `${ADMIN_EMAIL_HUB_HREF}?tab=queue`,
      },
      {
        id: "telegram_alert",
        label: "Telegram alert",
        status: lastTelegramTest ? "ok" as const : "missing" as const,
        detail: lastTelegramTest
          ? `Test event ${getMetadataString(lastTelegramTest.metadata, "event_id")?.slice(0, 8) || "sent"}`
          : "No successful test alert this week",
        occurredAt: lastTelegramTest?.created_at || null,
        href: ADMIN_AUDIT_HREF,
      },
      {
        id: "parchment_sync",
        label: "Parchment sync",
        status: lastParchmentSuccess ? "ok" as const : "missing" as const,
        detail: lastParchmentSuccess
          ? getMetadataString(lastParchmentSuccess.metadata, "action_type") || "Parchment success"
          : "No sync success recorded this week",
        occurredAt: lastParchmentSuccess?.created_at || null,
        href: ADMIN_PARCHMENT_OPS_HREF,
      },
    ],
    systemStatus: {
      webhooksHealthy: (webhookDlqResult.count || 0) < 5,
      emailsHealthy: emailStats.failed < 3 && missingEmailDeliveryEnv.length === 0,
      intakesHealthy: staleIntakes.length < 3,
      patientIdentityHealthy: patientIdentityResult.duplicateProfileCount === 0,
      prescribingIdentityHealthy: prescribingIdentityResult.blockedCount === 0,
      failureOverviewHealthy: failureOverview.openCount === 0,
      telegramAlertsHealthy: missingTelegramAlertEnv.length === 0,
    },
  }

  return <OpsDashboardClient ops={ops} />
}
