import { createHash } from "node:crypto"

import { buildStaffEmailHubHref } from "@/lib/dashboard/routes"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { isProviderUndeliveredStatus } from "@/lib/email/delivery-status"
import { createLogger } from "@/lib/observability/logger"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("certificate-delivery-rescue")

const CERTIFICATE_EMAIL_TYPES = ["med_cert_patient"] as const
// "payment-received" is the hyphenated DB template slug written verbatim to
// email_outbox.email_type by sendTemplateEmail (underscore rows never existed).
const RECEIPT_EMAIL_TYPES = ["request_received", "payment_confirmed", "payment-received"] as const

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

export type DeliverySignalKind =
  | "missing"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "failed"
  | "test"

export type CertificateSupportAction =
  | "resend_secure_link"
  | "resend_receipt"
  | "escalate"
  | "none"

export type CertificateDeliverySeverity = "critical" | "warning" | "neutral"

export interface EmailEvidence {
  status?: string | null
  deliveryStatus?: string | null
  sentAt?: string | null
  createdAt?: string | null
}

export interface DeliverySignal {
  kind: DeliverySignalKind
  label: string
  at: string | null
}

export interface CertificateDeliveryEvidence {
  intakeId: string
  referenceNumber?: string | null
  intakeStatus: string | null
  documentSentAt?: string | null
  certificateId?: string | null
  certificateStatus?: string | null
  certificateCreatedAt?: string | null
  certificateEmailSentAt?: string | null
  certificateEmailFailedAt?: string | null
  certificateEmailFailureReason?: string | null
  deliveryReconciledAt?: string | null
  resendCount?: number | null
  certificateEmail?: EmailEvidence | null
  receiptEmail?: EmailEvidence | null
  downloadedAt?: string | null
}

export interface CertificateDeliveryRecommendation {
  action: CertificateSupportAction
  label: string
  reason: string
  severity: CertificateDeliverySeverity
}

interface CertificateDeliveryRescueCase {
  intakeId: string
  shortIntakeId: string
  referenceNumber: string | null
  intakeStatus: string | null
  generated: boolean
  certificateStatus: string | null
  documentSentAt: string | null
  certificateEmail: DeliverySignal
  receiptEmail: DeliverySignal
  accessEvidence: "downloaded" | "email_clicked" | "email_opened" | "none"
  accessedAt: string | null
  resendCount: number
  warnings: string[]
  recommendation: CertificateDeliveryRecommendation
  emailHubHref: string
  sortPriority: number
  updatedAt: string | null
}

export interface CertificateDeliveryRescueOverview {
  cases: CertificateDeliveryRescueCase[]
  actionCount: number
  escalationCount?: number
  warningCount: number
  queryFailed: boolean
  coverageCapped?: boolean
}

function normalize(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized || null
}

function certificateStorageVersion(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null
  return createHash("sha256").update(storagePath).digest("hex").slice(0, 32)
}

function metadataCertificateStorageVersion(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const value = metadata?.certificate_storage_version
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value) ? value : null
}

function certificateVersionKey(
  certificateId: string | null | undefined,
  storageVersion: string | null | undefined,
): string | null {
  return certificateId && storageVersion ? `${certificateId}:${storageVersion}` : null
}

function firstTimestamp(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value) return value
  }
  return null
}

export function interpretEmailDelivery(
  email: EmailEvidence | null | undefined,
  fallback?: {
    sentAt?: string | null
    failedAt?: string | null
  },
): DeliverySignal {
  const deliveryStatus = normalize(email?.deliveryStatus)
  const status = normalize(email?.status)

  if (isProviderUndeliveredStatus(deliveryStatus) || (status === "failed" && deliveryStatus !== "complained")) {
    return {
      kind: "failed",
      label: isProviderUndeliveredStatus(deliveryStatus)
        ? deliveryStatus!
        : "failed",
      at: firstTimestamp(email?.sentAt, email?.createdAt, fallback?.failedAt),
    }
  }

  if (deliveryStatus === "clicked") {
    return { kind: "clicked", label: "clicked", at: firstTimestamp(email?.sentAt, email?.createdAt) }
  }

  if (deliveryStatus === "opened") {
    return { kind: "opened", label: "opened", at: firstTimestamp(email?.sentAt, email?.createdAt) }
  }

  if (deliveryStatus === "delivered") {
    return { kind: "delivered", label: "delivered", at: firstTimestamp(email?.sentAt, email?.createdAt) }
  }

  if (status === "skipped_e2e") {
    return { kind: "test", label: "sent (test)", at: firstTimestamp(email?.sentAt, email?.createdAt) }
  }

  if (status === "pending" || status === "sending") {
    return { kind: "queued", label: status, at: firstTimestamp(email?.createdAt, email?.sentAt) }
  }

  if (status === "sent" || fallback?.sentAt) {
    return { kind: "sent", label: "sent", at: firstTimestamp(email?.sentAt, fallback?.sentAt, email?.createdAt) }
  }

  if (fallback?.failedAt) {
    return { kind: "failed", label: "failed", at: fallback.failedAt }
  }

  return { kind: "missing", label: "not found", at: null }
}

function isTerminalDeliveryStatus(status: string | null): boolean {
  return status === "approved" || status === "completed"
}

function accessEvidenceFor(certificateEmail: DeliverySignal, downloadedAt?: string | null) {
  if (downloadedAt) {
    return { accessEvidence: "downloaded" as const, accessedAt: downloadedAt }
  }
  if (certificateEmail.kind === "clicked") {
    return { accessEvidence: "email_clicked" as const, accessedAt: certificateEmail.at }
  }
  if (certificateEmail.kind === "opened") {
    return { accessEvidence: "email_opened" as const, accessedAt: certificateEmail.at }
  }
  return { accessEvidence: "none" as const, accessedAt: null }
}

export function selectCertificateDeliverySupportAction(
  evidence: CertificateDeliveryEvidence,
): CertificateDeliveryRecommendation {
  const certificateEmail = interpretEmailDelivery(evidence.certificateEmail, {
    sentAt: evidence.certificateEmailSentAt,
    failedAt: evidence.certificateEmailFailedAt,
  })
  const receiptEmail = interpretEmailDelivery(evidence.receiptEmail)
  const hasCertificate = Boolean(evidence.certificateId)
  const access = accessEvidenceFor(certificateEmail, evidence.downloadedAt)

  if (!hasCertificate) {
    if (isTerminalDeliveryStatus(normalize(evidence.intakeStatus))) {
      return {
        action: "escalate",
        label: "Escalate",
        reason: "The intake is approved or completed, but no certificate record is visible.",
        severity: "critical",
      }
    }

    if (receiptEmail.kind === "failed") {
      return {
        action: "resend_receipt",
        label: "Resend receipt",
        reason: "No certificate exists yet and the receipt/request email failed.",
        severity: "warning",
      }
    }

    return {
      action: "none",
      label: "Do nothing",
      reason: "No certificate should be available yet for this intake state.",
      severity: "neutral",
    }
  }

  const certificateStatus = normalize(evidence.certificateStatus)
  if (certificateStatus && certificateStatus !== "valid") {
    return {
      action: "escalate",
      label: "Escalate",
      reason: `The latest certificate record is ${certificateStatus}. Do not resend or restore it without clinical review.`,
      severity: "critical",
    }
  }

  if (evidence.deliveryReconciledAt) {
    return {
      action: "none",
      label: "Do nothing",
      reason: "Manual delivery was reconciled for this certificate. Resend only if the patient reports non-receipt.",
      severity: "neutral",
    }
  }

  if (access.accessEvidence === "downloaded") {
    return {
      action: "none",
      label: "Do nothing",
      reason: "The patient has already downloaded the certificate.",
      severity: "neutral",
    }
  }

  if (access.accessEvidence === "email_clicked" || access.accessEvidence === "email_opened") {
    return {
      action: "none",
      label: "Do nothing",
      reason: "Email engagement is already tracked. Resend only if the patient reports non-receipt.",
      severity: "neutral",
    }
  }

  if (certificateEmail.kind === "failed" || certificateEmail.kind === "missing") {
    return {
      action: "resend_secure_link",
      label: "Resend secure link",
      reason: certificateEmail.kind === "missing"
        ? "The certificate exists but no patient certificate email is visible."
        : "The certificate email failed or bounced.",
      severity: "critical",
    }
  }

  if (certificateEmail.kind === "queued") {
    return {
      action: "none",
      label: "Do nothing",
      reason: "The certificate email is queued or sending. Let the dispatcher finish before resending.",
      severity: "warning",
    }
  }

  return {
    action: "none",
    label: "Do nothing",
    reason: "The certificate email has been sent or delivered.",
    severity: "neutral",
  }
}

export function buildCertificateDeliveryRescueCase(
  evidence: CertificateDeliveryEvidence,
): CertificateDeliveryRescueCase {
  const certificateEmail = interpretEmailDelivery(evidence.certificateEmail, {
    sentAt: evidence.certificateEmailSentAt,
    failedAt: evidence.certificateEmailFailedAt,
  })
  const receiptEmail = interpretEmailDelivery(evidence.receiptEmail)
  const access = accessEvidenceFor(certificateEmail, evidence.downloadedAt)
  const recommendation = selectCertificateDeliverySupportAction(evidence)
  const warnings: string[] = []

  if (evidence.certificateId && !evidence.documentSentAt && evidence.certificateEmailSentAt) {
    warnings.push("document_sent_at missing")
  }

  if (evidence.certificateId && certificateEmail.kind === "missing" && evidence.certificateEmailSentAt) {
    warnings.push("Outbox row missing but certificate has email_sent_at")
  }

  const warningPriority = warnings.length > 0 ? 1 : 0
  const actionPriority: Record<CertificateSupportAction, number> = {
    escalate: 0,
    resend_secure_link: 1,
    resend_receipt: 2,
    none: 4,
  }

  return {
    intakeId: evidence.intakeId,
    shortIntakeId: evidence.intakeId.slice(0, 8),
    referenceNumber: evidence.referenceNumber ?? null,
    intakeStatus: evidence.intakeStatus,
    generated: Boolean(evidence.certificateId),
    certificateStatus: evidence.certificateStatus ?? null,
    documentSentAt: evidence.documentSentAt ?? null,
    certificateEmail,
    receiptEmail,
    accessEvidence: access.accessEvidence,
    accessedAt: access.accessedAt,
    resendCount: evidence.resendCount ?? 0,
    warnings,
    recommendation,
    emailHubHref: buildStaffEmailHubHref({ tab: "queue", intakeId: evidence.intakeId }),
    sortPriority: actionPriority[recommendation.action] * 10 - warningPriority,
    updatedAt: firstTimestamp(
      access.accessedAt,
      certificateEmail.at,
      evidence.deliveryReconciledAt,
      evidence.documentSentAt,
      evidence.certificateCreatedAt,
    ),
  }
}

function latestBy<T>(rows: T[], key: (row: T) => string | null | undefined, dateKey: (row: T) => string | null | undefined) {
  const map = new Map<string, T>()
  for (const row of rows) {
    const id = key(row)
    if (!id) continue
    const existing = map.get(id)
    const existingTime = existing ? new Date(dateKey(existing) ?? 0).getTime() : -1
    const rowTime = new Date(dateKey(row) ?? 0).getTime()
    // Queries are ordered by timestamp DESC, id DESC. Preserve that first row
    // when timestamps tie instead of allowing a later (older-id) row to win.
    if (!existing || rowTime > existingTime) {
      map.set(id, row)
    }
  }
  return map
}

function summarizeCertificateDeliveryRescueCases(cases: CertificateDeliveryRescueCase[]) {
  return {
    actionCount: cases.filter((row) => row.recommendation.action !== "none").length,
    escalationCount: cases.filter((row) => row.recommendation.action === "escalate").length,
    warningCount: cases.filter(
      (row) => row.recommendation.action === "none" && row.recommendation.severity === "warning",
    ).length,
  }
}

const CERTIFICATE_DELIVERY_ID_BATCH_SIZE = 100
const CERTIFICATE_DELIVERY_CANDIDATE_LIMIT = 5000

function idBatches(ids: string[]): string[][] {
  const batches: string[][] = []
  for (let index = 0; index < ids.length; index += CERTIFICATE_DELIVERY_ID_BATCH_SIZE) {
    batches.push(ids.slice(index, index + CERTIFICATE_DELIVERY_ID_BATCH_SIZE))
  }
  return batches
}

export async function getCertificateDeliveryRescueCases(
  supabase: SupabaseClient,
  options: { days?: number; limit?: number } = {},
): Promise<CertificateDeliveryRescueOverview> {
  const days = options.days ?? 14
  const limit = Math.max(1, Math.min(options.limit ?? 12, CERTIFICATE_DELIVERY_CANDIDATE_LIMIT))
  // Recent rows include watch-only evidence. Historical rows are limited to
  // paid terminal obligations by the query and then reduced to unresolved
  // actions below. The generous cap prevents a small render limit from hiding
  // an old obligation while still making incomplete coverage explicit.
  const candidateLimit = CERTIFICATE_DELIVERY_CANDIDATE_LIMIT
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Seeded-E2E CI intakes and exclude_from_reporting test orders must not
    // surface rescue actions: the panel has to mirror the production scope of
    // the ops invariants (ops_certificate_sent_missing_timestamp counts
    // filtered intakes), otherwise the operator chases phantom test cases the
    // alert never counted — and can't clear the ones it did.
    const { data: intakes, count: intakeCount, error: intakeError } = await filterReportableIntakes(
      supabase
        .from("intakes")
        .select(`
          id,
          reference_number,
          status,
          payment_status,
          document_sent_at,
          created_at,
          updated_at,
          approved_at,
          completed_at,
          service:services!inner(type)
        `, { count: "exact" })
        .eq("service.type", "med_certs")
        .or(
          `created_at.gte.${since},and(status.in.(approved,completed),payment_status.in.(paid,partially_refunded))`,
        ),
    )
      .order("updated_at", { ascending: false })
      .limit(candidateLimit)

    if (intakeError || intakeCount === null) {
      log.warn("Failed to load certificate delivery rescue intakes", {
        error: intakeError?.message ?? "exact count unavailable",
      })
      return { cases: [], actionCount: 0, warningCount: 0, queryFailed: true }
    }

    const intakeRows = (intakes ?? []) as Array<{
      id: string
      reference_number: string | null
      status: string | null
      payment_status: string | null
      document_sent_at: string | null
      created_at: string | null
      updated_at: string | null
      approved_at: string | null
      completed_at: string | null
    }>
    const intakeIds = intakeRows.map((row) => row.id)

    if (intakeIds.length === 0) {
      return {
        cases: [],
        actionCount: 0,
        warningCount: 0,
        queryFailed: false,
        coverageCapped: intakeCount > 0,
      }
    }

    type CertificateRow = {
      id: string
      intake_id: string
      status: string | null
      storage_path: string | null
      created_at: string | null
      email_sent_at: string | null
      email_failed_at: string | null
      email_failure_reason: string | null
      resend_count: number | null
      delivery_reconciliation:
        | { certificate_storage_version: string; recorded_at: string | null }
        | Array<{ certificate_storage_version: string; recorded_at: string | null }>
        | null
    }
    type EmailRow = {
      intake_id: string | null
      certificate_id: string | null
      email_type: string | null
      status: string | null
      delivery_status: string | null
      sent_at: string | null
      created_at: string | null
      metadata: Record<string, unknown> | null
    }
    const certRows: CertificateRow[] = []
    const emailRows: EmailRow[] = []
    for (const batch of idBatches(intakeIds)) {
      const [certResult, emailResult] = await Promise.all([
        supabase
          .from("issued_certificates")
          .select("id, intake_id, status, storage_path, created_at, email_sent_at, email_failed_at, email_failure_reason, resend_count, delivery_reconciliation:certificate_delivery_reconciliations(certificate_storage_version, recorded_at)")
          .in("intake_id", batch)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false }),
        supabase
          .from("email_outbox")
          .select("id, intake_id, certificate_id, email_type, status, delivery_status, sent_at, created_at, metadata")
          .in("intake_id", batch)
          .in("email_type", [...CERTIFICATE_EMAIL_TYPES, ...RECEIPT_EMAIL_TYPES])
          .order("created_at", { ascending: false })
          .order("id", { ascending: false }),
      ])

      if (certResult.error || emailResult.error) {
        log.warn("Failed to load certificate delivery rescue details", {
          certError: certResult.error?.message,
          emailError: emailResult.error?.message,
        })
        return { cases: [], actionCount: 0, warningCount: 0, queryFailed: true }
      }
      certRows.push(...(certResult.data ?? []) as CertificateRow[])
      emailRows.push(...(emailResult.data ?? []) as EmailRow[])
    }
    const latestCertByIntake = latestBy(certRows, (row) => row.intake_id, (row) => row.created_at)
    const certIds = [...latestCertByIntake.values()].map((row) => row.id)

    let latestPatientDownloadByCertificateVersion = new Map<string, {
      id: string
      certificate_id: string
      actor_role: string | null
      event_data: Record<string, unknown> | null
      created_at: string | null
    }>()
    if (certIds.length > 0) {
      const patientDownloads: Array<{
          id: string
          certificate_id: string
          actor_role: string | null
          event_data: Record<string, unknown> | null
          created_at: string | null
      }> = []
      for (const batch of idBatches(certIds)) {
        const { data: downloads, error: downloadsError } = await supabase
          .from("certificate_audit_log")
          .select("id, certificate_id, actor_role, event_data, created_at")
          .in("certificate_id", batch)
          .eq("event_type", "downloaded")
          .eq("actor_role", "patient")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })

        if (downloadsError) {
          log.warn("Failed to load certificate download evidence", { error: downloadsError.message })
          return { cases: [], actionCount: 0, warningCount: 0, queryFailed: true }
        }
        patientDownloads.push(...(downloads ?? []) as typeof patientDownloads)
      }
      latestPatientDownloadByCertificateVersion = latestBy(
        patientDownloads.filter((row) => row.actor_role === "patient"),
        (row) => certificateVersionKey(
          row.certificate_id,
          metadataCertificateStorageVersion(row.event_data),
        ),
        (row) => row.created_at,
      )
    }

    const certEmailByCertificateVersion = latestBy(
      emailRows.filter((row) => row.email_type === "med_cert_patient"),
      (row) => certificateVersionKey(
        row.certificate_id,
        metadataCertificateStorageVersion(row.metadata),
      ),
      (row) => row.created_at,
    )
    const receiptEmailByIntake = latestBy(
      emailRows.filter((row) => RECEIPT_EMAIL_TYPES.includes(row.email_type as (typeof RECEIPT_EMAIL_TYPES)[number])),
      (row) => row.intake_id,
      (row) => row.created_at,
    )

    const allCases = intakeRows
      .map((intake) => {
        const cert = latestCertByIntake.get(intake.id)
        const receiptEmail = receiptEmailByIntake.get(intake.id)
        const currentStorageVersion = certificateStorageVersion(cert?.storage_path)
        const certificateVersion = certificateVersionKey(cert?.id, currentStorageVersion)
        const download = certificateVersion
          ? latestPatientDownloadByCertificateVersion.get(certificateVersion)
          : null
        const certEmailKey = certificateVersion
        const certEmail = certEmailKey
          ? certEmailByCertificateVersion.get(certEmailKey)
          : undefined
        const deliveryReconciliations = Array.isArray(cert?.delivery_reconciliation)
          ? cert.delivery_reconciliation
          : cert?.delivery_reconciliation
            ? [cert.delivery_reconciliation]
            : []
        const deliveryReconciliation = deliveryReconciliations.find(
          (row) => row.certificate_storage_version === currentStorageVersion,
        )

        const rescueCase = buildCertificateDeliveryRescueCase({
          intakeId: intake.id,
          referenceNumber: intake.reference_number,
          intakeStatus: intake.status,
          documentSentAt: intake.document_sent_at,
          certificateId: cert?.id ?? null,
          certificateStatus: cert?.status ?? null,
          certificateCreatedAt: cert?.created_at ?? null,
          certificateEmailSentAt: cert?.email_sent_at ?? null,
          certificateEmailFailedAt: cert?.email_failed_at ?? null,
          certificateEmailFailureReason: cert?.email_failure_reason ?? null,
          deliveryReconciledAt: deliveryReconciliation?.recorded_at ?? null,
          resendCount: cert?.resend_count ?? 0,
          certificateEmail: certEmail
            ? {
                status: certEmail.status,
                deliveryStatus: certEmail.delivery_status,
                sentAt: certEmail.sent_at,
                createdAt: certEmail.created_at,
              }
            : null,
          receiptEmail: receiptEmail
            ? {
                status: receiptEmail.status,
                deliveryStatus: receiptEmail.delivery_status,
                sentAt: receiptEmail.sent_at,
                createdAt: receiptEmail.created_at,
              }
            : null,
          downloadedAt: download?.created_at ?? null,
        })

        const isHistoricalTerminalObligation = Boolean(
          intake.created_at
          && intake.created_at < since
          && (intake.status === "approved" || intake.status === "completed")
          && (intake.payment_status === "paid" || intake.payment_status === "partially_refunded"),
        )

        return { rescueCase, isHistoricalTerminalObligation }
      })
      .filter(({ rescueCase, isHistoricalTerminalObligation }) => (
        !isHistoricalTerminalObligation
        || rescueCase.recommendation.action !== "none"
        || rescueCase.recommendation.severity === "warning"
      ))
      .map(({ rescueCase }) => rescueCase)
      .sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority
        return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
      })
    const summary = summarizeCertificateDeliveryRescueCases(allCases)

    return {
      cases: allCases.slice(0, limit),
      actionCount: summary.actionCount,
      escalationCount: summary.escalationCount,
      warningCount: summary.warningCount,
      queryFailed: false,
      coverageCapped: intakeCount > intakeRows.length,
    }
  } catch (error) {
    log.error(
      "Unexpected certificate delivery rescue query failure",
      {},
      error instanceof Error ? error : undefined,
    )
    return { cases: [], actionCount: 0, warningCount: 0, queryFailed: true }
  }
}
