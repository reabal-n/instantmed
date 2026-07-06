import { buildStaffEmailHubHref } from "@/lib/dashboard/routes"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
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

export interface CertificateDeliveryRescueCase {
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
  warningCount: number
  queryFailed: boolean
}

function normalize(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized || null
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

  if (deliveryStatus === "bounced" || deliveryStatus === "complained" || status === "failed") {
    return {
      kind: "failed",
      label: deliveryStatus === "complained" ? "complained" : deliveryStatus === "bounced" ? "bounced" : "failed",
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

  if (normalize(evidence.certificateStatus) === "revoked") {
    return {
      action: "escalate",
      label: "Escalate",
      reason: "The latest certificate record is revoked. Do not resend without clinical review.",
      severity: "critical",
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
    if (!existing || rowTime >= existingTime) {
      map.set(id, row)
    }
  }
  return map
}

function summarizeCertificateDeliveryRescueCases(cases: CertificateDeliveryRescueCase[]) {
  return {
    actionCount: cases.filter((row) => row.recommendation.action !== "none").length,
    warningCount: cases.filter(
      (row) => row.recommendation.action === "none" && row.recommendation.severity === "warning",
    ).length,
  }
}

export async function getCertificateDeliveryRescueCases(
  supabase: SupabaseClient,
  options: { days?: number; limit?: number } = {},
): Promise<CertificateDeliveryRescueOverview> {
  const days = options.days ?? 14
  const limit = options.limit ?? 12
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Seeded-E2E CI intakes and exclude_from_reporting test orders must not
    // surface rescue actions: the panel has to mirror the production scope of
    // the ops invariants (ops_certificate_sent_missing_timestamp counts
    // filtered intakes), otherwise the operator chases phantom test cases the
    // alert never counted — and can't clear the ones it did.
    const { data: intakes, error: intakeError } = await filterReportableIntakes(
      supabase
        .from("intakes")
        .select(`
          id,
          reference_number,
          status,
          document_sent_at,
          created_at,
          updated_at,
          approved_at,
          completed_at,
          service:services!inner(type)
        `)
        .eq("service.type", "med_certs")
        .gte("created_at", since),
    )
      .order("updated_at", { ascending: false })
      .limit(Math.max(limit * 4, 24))

    if (intakeError) {
      log.warn("Failed to load certificate delivery rescue intakes", { error: intakeError.message })
      return { cases: [], actionCount: 0, warningCount: 0, queryFailed: true }
    }

    const intakeRows = (intakes ?? []) as Array<{
      id: string
      reference_number: string | null
      status: string | null
      document_sent_at: string | null
      created_at: string | null
      updated_at: string | null
      approved_at: string | null
      completed_at: string | null
    }>
    const intakeIds = intakeRows.map((row) => row.id)

    if (intakeIds.length === 0) {
      return { cases: [], actionCount: 0, warningCount: 0, queryFailed: false }
    }

    const [certResult, emailResult] = await Promise.all([
      supabase
        .from("issued_certificates")
        .select("id, intake_id, status, created_at, email_sent_at, email_failed_at, email_failure_reason, resend_count")
        .in("intake_id", intakeIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("email_outbox")
        .select("id, intake_id, email_type, status, delivery_status, sent_at, created_at")
        .in("intake_id", intakeIds)
        .in("email_type", [...CERTIFICATE_EMAIL_TYPES, ...RECEIPT_EMAIL_TYPES])
        .order("created_at", { ascending: false }),
    ])

    if (certResult.error || emailResult.error) {
      log.warn("Failed to load certificate delivery rescue details", {
        certError: certResult.error?.message,
        emailError: emailResult.error?.message,
      })
      return { cases: [], actionCount: 0, warningCount: 0, queryFailed: true }
    }

    const certRows = (certResult.data ?? []) as Array<{
      id: string
      intake_id: string
      status: string | null
      created_at: string | null
      email_sent_at: string | null
      email_failed_at: string | null
      email_failure_reason: string | null
      resend_count: number | null
    }>
    const latestCertByIntake = latestBy(certRows, (row) => row.intake_id, (row) => row.created_at)
    const certIds = [...latestCertByIntake.values()].map((row) => row.id)

    let latestDownloadByCertificate = new Map<string, { certificate_id: string; created_at: string | null }>()
    if (certIds.length > 0) {
      const { data: downloads, error: downloadsError } = await supabase
        .from("certificate_audit_log")
        .select("certificate_id, created_at")
        .in("certificate_id", certIds)
        .eq("event_type", "downloaded")
        .order("created_at", { ascending: false })

      if (downloadsError) {
        log.warn("Failed to load certificate download evidence", { error: downloadsError.message })
      } else {
        latestDownloadByCertificate = latestBy(
          (downloads ?? []) as Array<{ certificate_id: string; created_at: string | null }>,
          (row) => row.certificate_id,
          (row) => row.created_at,
        )
      }
    }

    const emailRows = (emailResult.data ?? []) as Array<{
      intake_id: string | null
      email_type: string | null
      status: string | null
      delivery_status: string | null
      sent_at: string | null
      created_at: string | null
    }>
    const certEmailByIntake = latestBy(
      emailRows.filter((row) => row.email_type === "med_cert_patient"),
      (row) => row.intake_id,
      (row) => row.created_at,
    )
    const receiptEmailByIntake = latestBy(
      emailRows.filter((row) => RECEIPT_EMAIL_TYPES.includes(row.email_type as (typeof RECEIPT_EMAIL_TYPES)[number])),
      (row) => row.intake_id,
      (row) => row.created_at,
    )

    const cases = intakeRows
      .map((intake) => {
        const cert = latestCertByIntake.get(intake.id)
        const certEmail = certEmailByIntake.get(intake.id)
        const receiptEmail = receiptEmailByIntake.get(intake.id)
        const download = cert?.id ? latestDownloadByCertificate.get(cert.id) : null

        return buildCertificateDeliveryRescueCase({
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
      })
      .sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority
        return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
      })
      .slice(0, limit)
    const summary = summarizeCertificateDeliveryRescueCases(cases)

    return {
      cases,
      actionCount: summary.actionCount,
      warningCount: summary.warningCount,
      queryFailed: false,
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
