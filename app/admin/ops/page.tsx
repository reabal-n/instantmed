import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"
import {
  certOrphanHelper,
  getOperationalInvariants,
  invariantTone,
  refundAnomalyHelper,
  SLA_BREACH_CRITICAL,
  slaBacklogHelper,
} from "@/lib/admin/ops-invariants"
import { getGoogleAdsConversionUploadHealth } from "@/lib/analytics/google-ads-health"
import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildStaffLedgerHref,
  STAFF_ANALYTICS_HREF,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { OpsDashboardClient, type OpsDashboardClientProps } from "./ops-client"

export const dynamic = "force-dynamic"

type AuditRow = {
  id: string
  action: string
  created_at: string
  metadata: Record<string, unknown> | null
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isNonActionableParchmentSandboxError(row: AuditRow): boolean {
  return (
    row.action === "webhook_failed"
    && metadataString(row.metadata, "eventType") === "parchment:prescription.created"
    && metadataString(row.metadata, "error") === "no_awaiting_script_intake"
  )
}

// Counter buckets that merge two source categories (Payment = checkout +
// refund_failures, Parchment unsynced = prescription_delivery + stale_scripts)
// must not show a sub-count in the helper line. The big number is the story;
// the click-through to the ledger or workshop shows the split. Showing one
// sub-count makes the operator wonder what the other rows are.
function helperTextForPayment(count: number): string {
  if (count === 0) return "All clear"
  return `${count} to resolve`
}

function helperTextForParchment(count: number): string {
  if (count === 0) return "All clear"
  return `${count} to resolve`
}

function helperTextForIdentity(count: number): string {
  if (count === 0) return "All clear"
  return `${count} to chase`
}

function helperTextForWebhook(count: number): string {
  if (count === 0) return "All clear"
  return "Action needed"
}

// Failed server-side Google Ads conversion uploads in the last 7d: these are
// paid orders whose conversion never reached Google, so Smart Bidding optimises
// blind on wasted spend until the conversion-action env is fixed (the May–Jun
// 2026 NO_CONVERSION_ACTION_FOUND outage). queryFailed surfaces as a warning so
// a broken health read is never silently green.
function helperTextForGoogleAds(notReaching: number, queryFailed: boolean): string {
  if (queryFailed) return "Health check unavailable"
  if (notReaching === 0) return "All reaching Google"
  return `${notReaching} not reaching Google`
}

export default async function OpsDashboardPage() {
  const auth = await requireRole(["admin", "support"])
  // Only admins can open /admin/analytics (the full Google Ads health panel);
  // support staff are kept out of analytics, so route them to a page they can
  // actually use instead of a 403.
  const isAdmin = hasAdminAccess(auth.profile)

  const supabase = createServiceRoleClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fortyEightHrsAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [
    webhookDlqResult,
    emailFailuresResult,
    checkoutFailuresResult,
    certificateFailuresResult,
    prescriptionWebhookFailuresResult,
    staleScriptIntakesResult,
    refundFailuresResult,
    prescribingIdentityResult,
    operationalInvariants,
    googleAdsConversionHealth,
  ] = await Promise.all([
    supabase
      .from("stripe_webhook_dead_letter")
      .select("id, created_at, event_type")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("email_outbox")
      .select("id, email_type, status, error_message, delivery_status, created_at")
      .or("status.eq.failed,delivery_status.eq.bounced,delivery_status.eq.complained")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype, checkout_error")
      .eq("status", "checkout_failed")
      .gte("updated_at", weekAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("issued_certificates")
      .select("id, intake_id, updated_at, email_failed_at, email_failure_reason")
      .not("email_failed_at", "is", null)
      .gte("email_failed_at", weekAgo.toISOString())
      .order("email_failed_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("action", "webhook_failed")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype")
      .eq("status", "awaiting_script")
      .eq("payment_status", "paid")
      .lt("updated_at", fortyEightHrsAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("payments")
      .select("id, intake_id, created_at, updated_at, refund_reason")
      .eq("refund_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    getPrescribingIdentityBlockerReport(supabase),
    getOperationalInvariants(supabase),
    getGoogleAdsConversionUploadHealth(supabase, { lookbackDays: 7 }),
  ])

  const prescriptionWebhookFailures = (
    (prescriptionWebhookFailuresResult.data || []) as AuditRow[]
  )
    .filter((row) => !isNonActionableParchmentSandboxError(row))
    .filter(
      (row) => metadataString(row.metadata, "eventType") === "parchment:prescription.created",
    )

  const failureOverview = buildOperationalFailureOverview({
    stripeDlq: webhookDlqResult.data || [],
    emailFailures: emailFailuresResult.data || [],
    checkoutFailures: checkoutFailuresResult.data || [],
    certificateFailures: certificateFailuresResult.data || [],
    prescriptionWebhookFailures,
    staleScriptIntakes: staleScriptIntakesResult.data || [],
    refundFailures: refundFailuresResult.data || [],
  })

  const countByCategory = new Map(failureOverview.categories.map((c) => [c.id, c.count]))
  const checkoutCount = countByCategory.get("checkout") ?? 0
  const refundFailedCount = countByCategory.get("refund_failures") ?? 0
  const paymentFailuresCount = checkoutCount + refundFailedCount
  const webhookDlqCount = countByCategory.get("stripe_webhooks") ?? 0
  const prescriptionCount = countByCategory.get("prescription_delivery") ?? 0
  const staleScriptCount = countByCategory.get("stale_scripts") ?? 0
  const parchmentUnsyncedCount = prescriptionCount + staleScriptCount
  const missingIdentityCount = prescribingIdentityResult.blockedCount

  const counters: OpsDashboardClientProps["counters"] = {
    paymentFailures: {
      count: paymentFailuresCount,
      tone: paymentFailuresCount > 0 ? "critical" : "neutral",
      helperText: helperTextForPayment(paymentFailuresCount),
      href: buildStaffLedgerHref({ chips: ["failed_payment", "refund_failed"] }),
    },
    webhookDlq: {
      count: webhookDlqCount,
      tone: webhookDlqCount > 0 ? "critical" : "neutral",
      helperText: helperTextForWebhook(webhookDlqCount),
      href: ADMIN_WEBHOOK_DLQ_HREF,
    },
    parchmentUnsynced: {
      count: parchmentUnsyncedCount,
      tone: parchmentUnsyncedCount > 0 ? "warning" : "neutral",
      helperText: helperTextForParchment(parchmentUnsyncedCount),
      href: ADMIN_PARCHMENT_OPS_HREF,
    },
    missingIdentity: {
      count: missingIdentityCount,
      tone: missingIdentityCount > 0 ? "warning" : "neutral",
      helperText: helperTextForIdentity(missingIdentityCount),
      href: ADMIN_PRESCRIBING_IDENTITY_HREF,
    },
    googleAdsConversions: {
      count: googleAdsConversionHealth.notReaching,
      tone: googleAdsConversionHealth.notReaching > 0
        ? "critical"
        : googleAdsConversionHealth.queryFailed
          ? "warning"
          : "neutral",
      helperText: helperTextForGoogleAds(
        googleAdsConversionHealth.notReaching,
        googleAdsConversionHealth.queryFailed,
      ),
      href: isAdmin ? STAFF_ANALYTICS_HREF : STAFF_OPS_HREF,
    },
  }

  const invariants: OpsDashboardClientProps["invariants"] = {
    slaBreachBacklog: {
      count: operationalInvariants.slaBreachBacklog,
      tone: invariantTone(operationalInvariants.slaBreachBacklog, SLA_BREACH_CRITICAL),
      helperText: slaBacklogHelper(operationalInvariants.slaBreachBacklog),
      href: buildStaffLedgerHref({}),
    },
    certRefundOrphans: {
      count: operationalInvariants.certRefundOrphans,
      tone: invariantTone(operationalInvariants.certRefundOrphans, 1),
      helperText: certOrphanHelper(operationalInvariants.certRefundOrphans),
      href: buildStaffLedgerHref({ chips: ["refunded"] }),
    },
    refundRecordAnomalies: {
      count: operationalInvariants.refundRecordAnomalies,
      tone: invariantTone(operationalInvariants.refundRecordAnomalies, Number.POSITIVE_INFINITY),
      helperText: refundAnomalyHelper(operationalInvariants.refundRecordAnomalies),
      href: buildStaffLedgerHref({ chips: ["refunded"] }),
    },
    queryFailures: {
      count: operationalInvariants.queryFailures?.length ?? 0,
      tone: (operationalInvariants.queryFailures?.length ?? 0) > 0 ? "critical" : "neutral",
      helperText: (operationalInvariants.queryFailures?.length ?? 0) > 0 ? "Alert emitted" : "All queries healthy",
      href: STAFF_OPS_HREF,
    },
  }

  const recoveries: OpsDashboardClientProps["recoveries"] = failureOverview.recent
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      occurredAt: item.occurredAt,
      severity: item.severity,
      href: item.href,
    }))

  return <OpsDashboardClient counters={counters} invariants={invariants} recoveries={recoveries} />
}
