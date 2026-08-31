import { getCertificateDeliveryRescueCases } from "@/lib/admin/certificate-delivery-rescue"
import { getHistoricalAutoIssuedReviewLane } from "@/lib/admin/historical-auto-issued-review"
import { buildOpsActionModel } from "@/lib/admin/ops-action-model"
import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"
import { getOperationalInvariants } from "@/lib/admin/ops-invariants"
import { getGoogleAdsConversionUploadHealth } from "@/lib/analytics/google-ads-health"
import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES } from "@/lib/doctor/parchment-claim"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"
import { buildPrescribingIdentityBlockerReport } from "@/lib/doctor/prescribing-identity-blockers"
import { filterNonActionableEmailFailures } from "@/lib/email/quiet-failures"
import {
  filterRecoveredStandaloneParchmentFailures,
  filterUnresolvedParchmentFailures,
  type ParchmentStandaloneFailureCandidate,
} from "@/lib/parchment/failure-reconciliation"
import { readStandaloneParchmentPrescriptionEvidence } from "@/lib/parchment/failure-reconciliation-data"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { OpsDashboardClient } from "./ops-client"

export const dynamic = "force-dynamic"

type AuditRow = {
  action: string
  created_at: string
  id: string
  intake_id: string | null
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
  totalCount: number
}

async function readRows<T>(
  label: string,
  query: PromiseLike<{ count: number | null; data: T[] | null; error: unknown }>,
): Promise<RowRead<T>> {
  try {
    const result = await query
    return result.error
      ? { data: [], queryFailure: label, totalCount: 0 }
      : result.count === null
        ? { data: result.data ?? [], queryFailure: `${label} count`, totalCount: 0 }
        : { data: result.data ?? [], queryFailure: null, totalCount: result.count }
  } catch {
    return { data: [], queryFailure: label, totalCount: 0 }
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

function toStandaloneFailureCandidate(row: AuditRow): ParchmentStandaloneFailureCandidate {
  return {
    id: row.id,
    intakeId: row.intake_id,
    reason: metadataString(row.metadata, "error") || "unknown_error",
    scid: metadataString(row.metadata, "scid"),
    patientProfileId: metadataString(row.metadata, "patient_profile_id")
      || metadataString(row.metadata, "patient_id"),
    partnerPatientId: metadataString(row.metadata, "partner_patient_id"),
  }
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
    successfulParchmentRetries,
    staleScriptIntakes,
    staleApprovedPrescriptionIntakes,
    staleApprovedConsultScriptIntakes,
    refundFailures,
    identity,
    invariants,
    googleAdsConversionHealth,
    certificateDelivery,
    historicalReview,
  ] = await Promise.all([
    readRows<StripeDlqRow>("Stripe webhook DLQ", supabase
      .from("stripe_webhook_dead_letter")
      .select("id, created_at, event_type", { count: "exact" })
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20)),
    readRows<EmailFailureRow>("email delivery", supabase
      .from("email_outbox")
      .select("id, email_type, status, error_message, delivery_status, created_at", { count: "exact" })
      .or("status.eq.failed,delivery_status.eq.bounced,delivery_status.eq.complained")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50)),
    readRows<CheckoutFailureRow>("checkout failures", supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype, checkout_error", { count: "exact" })
      .eq("status", "checkout_failed")
      .order("updated_at", { ascending: false })
      .limit(20)),
    readRows<AuditRow>("Parchment webhooks", supabase
      .from("audit_logs")
      .select("id, action, intake_id, created_at, metadata", { count: "exact" })
      .eq("action", "webhook_failed")
      .gte("created_at", weekAgo.toISOString())
      .contains("metadata", { eventType: "parchment:prescription.created" })
      .not("metadata", "cs", JSON.stringify({ error: "no_awaiting_script_intake" }))
      .not("metadata", "cs", JSON.stringify({ error: "patient_not_found" }))
      .not("metadata", "cs", JSON.stringify({ parchment_patient_id: "nonexistent-parchment-patient" }))
      .order("created_at", { ascending: false })
      .limit(50)),
    readRows<AuditRow>("Parchment retry receipts", supabase
      .from("audit_logs")
      .select("id, action, intake_id, created_at, metadata", { count: "exact" })
      .eq("action", "admin_action")
      .gte("created_at", weekAgo.toISOString())
      .contains("metadata", { action_type: "parchment_webhook_retry", result: "success" })
      .order("created_at", { ascending: false })
      .limit(100)),
    readRows<StaleScriptRow>("stale script handoffs", supabase
      .from("intakes")
      .select("id, created_at, updated_at, approved_at, category, subtype, status", { count: "exact" })
      .eq("status", "awaiting_script")
      .eq("payment_status", "paid")
      .lt("updated_at", fortyEightHoursAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)),
    readRows<StaleScriptRow>("approved prescription handoffs", supabase
      .from("intakes")
      .select("id, created_at, updated_at, approved_at, category, subtype, status", { count: "exact" })
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
      .select("id, created_at, updated_at, approved_at, category, subtype, status", { count: "exact" })
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
      .select("id, intake_id, created_at, updated_at, refund_reason", { count: "exact" })
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
    isAdmin
      ? getHistoricalAutoIssuedReviewLane(supabase).catch(() => ({
        cases: [],
        cohortCount: 0,
        expectedCount: 9,
        queryFailed: true,
        resolvedCount: 0,
        unresolvedCount: 0,
      }))
      : Promise.resolve(null),
  ])

  const unresolvedParchmentFailures = filterUnresolvedParchmentFailures(
    prescriptionWebhookFailures.data,
    successfulParchmentRetries.data,
  )
  const standaloneFailureCandidates = unresolvedParchmentFailures
    .map(toStandaloneFailureCandidate)
  const standaloneEvidenceRead = await readStandaloneParchmentPrescriptionEvidence(
    supabase,
    standaloneFailureCandidates,
  )
  const unrecoveredFailureIds = new Set(
    filterRecoveredStandaloneParchmentFailures(
      standaloneFailureCandidates,
      standaloneEvidenceRead.error ? [] : standaloneEvidenceRead.data,
    ).map((failure) => failure.id),
  )
  const unrecoveredParchmentFailures = unresolvedParchmentFailures
    .filter((row) => unrecoveredFailureIds.has(row.id))
  const actionableParchmentFailures = unrecoveredParchmentFailures
    .filter((row) => !isNonActionableParchmentSandboxError(row))
    .filter((row) => metadataString(row.metadata, "eventType") === "parchment:prescription.created")
  const resolvedVisibleParchmentFailures = Math.max(
    0,
    prescriptionWebhookFailures.data.length - unrecoveredParchmentFailures.length,
  )
  const nonCertificateEmailFailures = filterNonActionableEmailFailures(emailFailures.data)
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
    exactCounts: {
      checkout: checkoutFailures.totalCount,
      prescription_delivery: Math.max(
        0,
        prescriptionWebhookFailures.totalCount - resolvedVisibleParchmentFailures,
      ),
      refund_failures: refundFailures.totalCount,
      stale_scripts:
        staleScriptIntakes.totalCount
        + staleApprovedPrescriptionIntakes.totalCount
        + staleApprovedConsultScriptIntakes.totalCount,
      stripe_webhooks: webhookDlq.totalCount,
    },
  })
  const boundedEmailDetailWasCapped = emailFailures.totalCount > emailFailures.data.length
  const sourceQueryFailures = [
    webhookDlq,
    emailFailures,
    checkoutFailures,
    prescriptionWebhookFailures,
    successfulParchmentRetries,
    staleScriptIntakes,
    staleApprovedPrescriptionIntakes,
    staleApprovedConsultScriptIntakes,
    refundFailures,
  ].flatMap(({ queryFailure }) => queryFailure ? [queryFailure] : [])
  if (boundedEmailDetailWasCapped) {
    sourceQueryFailures.push("email delivery monitor detail cap")
  }
  if (standaloneEvidenceRead.error) {
    sourceQueryFailures.push("Parchment standalone prescription evidence")
  }
  const model = buildOpsActionModel({
    certificateDelivery,
    failureOverview,
    googleAdsConversionHealth,
    identity,
    historicalReview,
    invariants,
    isAdmin,
    now,
    sourceQueryFailures,
  })

  return <OpsDashboardClient isAdmin={isAdmin} model={model} />
}
