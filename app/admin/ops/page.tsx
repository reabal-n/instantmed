import { getCertificateDeliveryRescueCases } from "@/lib/admin/certificate-delivery-rescue"
import { buildOpsActionModel } from "@/lib/admin/ops-action-model"
import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"
import { getOperationalInvariants } from "@/lib/admin/ops-invariants"
import { getGoogleAdsConversionUploadHealth } from "@/lib/analytics/google-ads-health"
import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES } from "@/lib/doctor/parchment-claim"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"
import { buildPrescribingIdentityBlockerReport } from "@/lib/doctor/prescribing-identity-blockers"
import { filterQuietCronOwnedEmailFailures } from "@/lib/email/quiet-failures"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { OpsDashboardClient } from "./ops-client"

export const dynamic = "force-dynamic"

type AuditRow = {
  action: string
  created_at: string
  id: string
  metadata: Record<string, unknown> | null
}

type EmailFailureRow = {
  created_at: string
  delivery_status: string | null
  email_type: string | null
  error_message: string | null
  id: string
  status: string | null
}

type CheckoutFailureRow = {
  category: string | null
  checkout_error: string | null
  created_at: string
  id: string
  subtype: string | null
  updated_at: string | null
}

type StaleScriptRow = {
  approved_at: string | null
  category: string | null
  created_at: string
  id: string
  status: string
  subtype: string | null
  updated_at: string | null
}

type RefundFailureRow = {
  created_at: string
  id: string
  intake_id: string | null
  refund_reason: string | null
  updated_at: string | null
}

type StripeDlqRow = {
  created_at: string
  event_type: string | null
  id: string
}

interface RowRead<T> {
  data: T[]
  queryFailure: string | null
}

async function readRows<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<RowRead<T>> {
  try {
    const result = await query
    return result.error
      ? { data: [], queryFailure: label }
      : { data: result.data ?? [], queryFailure: null }
  } catch {
    return { data: [], queryFailure: label }
  }
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isNonActionableParchmentSandboxError(row: AuditRow): boolean {
  if (row.action !== "webhook_failed") return false
  if (metadataString(row.metadata, "eventType") !== "parchment:prescription.created") return false
  const error = metadataString(row.metadata, "error")
  return error === "no_awaiting_script_intake" || error === "patient_not_found"
}

export default async function OpsDashboardPage() {
  const auth = await requireRole(["admin", "support"])
  const isAdmin = hasAdminAccess(auth.profile)
  const supabase = createServiceRoleClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [
    webhookDlq,
    emailFailures,
    checkoutFailures,
    prescriptionWebhookFailures,
    staleScriptIntakes,
    staleApprovedPrescriptionIntakes,
    staleApprovedConsultScriptIntakes,
    refundFailures,
    identity,
    invariants,
    googleAdsConversionHealth,
    certificateDelivery,
  ] = await Promise.all([
    readRows<StripeDlqRow>("Stripe webhook DLQ", supabase
      .from("stripe_webhook_dead_letter")
      .select("id, created_at, event_type")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20)),
    readRows<EmailFailureRow>("email delivery", supabase
      .from("email_outbox")
      .select("id, email_type, status, error_message, delivery_status, created_at")
      .or("status.eq.failed,delivery_status.eq.bounced,delivery_status.eq.complained")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50)),
    readRows<CheckoutFailureRow>("checkout failures", supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype, checkout_error")
      .eq("status", "checkout_failed")
      .gte("updated_at", weekAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(20)),
    readRows<AuditRow>("Parchment webhooks", supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("action", "webhook_failed")
      .gte("created_at", weekAgo.toISOString())
      .not("metadata", "cs", JSON.stringify({ parchment_patient_id: "nonexistent-parchment-patient" }))
      .order("created_at", { ascending: false })
      .limit(50)),
    readRows<StaleScriptRow>("stale script handoffs", supabase
      .from("intakes")
      .select("id, created_at, updated_at, approved_at, category, subtype, status")
      .eq("status", "awaiting_script")
      .eq("payment_status", "paid")
      .lt("updated_at", fortyEightHoursAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)),
    readRows<StaleScriptRow>("approved prescription handoffs", supabase
      .from("intakes")
      .select("id, created_at, updated_at, approved_at, category, subtype, status")
      .eq("status", "approved")
      .eq("payment_status", "paid")
      .eq("script_sent", false)
      .is("parchment_reference", null)
      .eq("category", "prescription")
      .lt("approved_at", fortyEightHoursAgo.toISOString())
      .order("approved_at", { ascending: true })
      .limit(20)),
    readRows<StaleScriptRow>("approved consult script handoffs", supabase
      .from("intakes")
      .select("id, created_at, updated_at, approved_at, category, subtype, status")
      .eq("status", "approved")
      .eq("payment_status", "paid")
      .eq("script_sent", false)
      .is("parchment_reference", null)
      .eq("category", "consult")
      .in("subtype", [...PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES])
      .lt("approved_at", fortyEightHoursAgo.toISOString())
      .order("approved_at", { ascending: true })
      .limit(20)),
    readRows<RefundFailureRow>("refund failures", supabase
      .from("payments")
      .select("id, intake_id, created_at, updated_at, refund_reason")
      .eq("refund_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(20)),
    getPrescribingIdentityBlockerReport(supabase).catch(() => ({
      ...buildPrescribingIdentityBlockerReport([]),
      queryFailed: true,
    })),
    getOperationalInvariants(supabase).catch(() => ({
      approvedCertificateMissingRecord: 0,
      certificateSentMissingTimestamp: 0,
      certRefundOrphans: 0,
      paidButCancelled: 0,
      queryFailures: ["sla_breach_backlog" as const],
      refundRecordAnomalies: 0,
      slaBreachBacklog: 0,
    })),
    getGoogleAdsConversionUploadHealth(supabase, { lookbackDays: 7 }).catch(() => ({
      notReaching: 0,
      queryFailed: true,
    })),
    getCertificateDeliveryRescueCases(supabase, { days: 14, limit: 20 }).catch(() => ({
      actionCount: 0,
      cases: [],
      queryFailed: true,
      warningCount: 0,
    })),
  ])

  const actionableParchmentFailures = prescriptionWebhookFailures.data
    .filter((row) => !isNonActionableParchmentSandboxError(row))
    .filter((row) => metadataString(row.metadata, "eventType") === "parchment:prescription.created")
  const nonCertificateEmailFailures = filterQuietCronOwnedEmailFailures(emailFailures.data)
    .filter((row) => row.email_type !== "med_cert_patient")
    .slice(0, 20)
  const failureOverview = buildOperationalFailureOverview({
    certificateFailures: [],
    checkoutFailures: checkoutFailures.data,
    emailFailures: nonCertificateEmailFailures,
    prescriptionWebhookFailures: actionableParchmentFailures,
    refundFailures: refundFailures.data,
    staleScriptIntakes: [
      ...staleScriptIntakes.data,
      ...staleApprovedPrescriptionIntakes.data,
      ...staleApprovedConsultScriptIntakes.data,
    ],
    stripeDlq: webhookDlq.data,
  })
  const sourceQueryFailures = [
    webhookDlq,
    emailFailures,
    checkoutFailures,
    prescriptionWebhookFailures,
    staleScriptIntakes,
    staleApprovedPrescriptionIntakes,
    staleApprovedConsultScriptIntakes,
    refundFailures,
  ].flatMap(({ queryFailure }) => queryFailure ? [queryFailure] : [])
  const model = buildOpsActionModel({
    certificateDelivery,
    failureOverview,
    googleAdsConversionHealth,
    identity,
    invariants,
    isAdmin,
    now,
    sourceQueryFailures,
  })

  return <OpsDashboardClient model={model} />
}
