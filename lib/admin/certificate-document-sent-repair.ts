import type { SupabaseClient } from "@supabase/supabase-js"

import { CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS } from "@/lib/admin/ops-invariants"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("certificate-document-sent-repair")

export const CERTIFICATE_DOCUMENT_SENT_REPAIR_LIMIT = 50

const REPAIRABLE_INTAKE_STATUSES = ["approved", "completed"] as const

export type CertificateDocumentSentRepairErrorCode =
  | "email_query_failed"
  | "intake_query_failed"
  | "certificate_query_failed"
  | "unexpected_failure"

export interface SentCertificateEmailRepairRow {
  id: string
  intake_id: string | null
  status: string | null
  sent_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CertificateDocumentSentRepairIntakeRow {
  id: string
  category: string | null
  status: string | null
  document_sent_at: string | null
  generated_document_type: string | null
  exclude_from_reporting: boolean | null
}

export interface CertificateDocumentSentRepairCertificateRow {
  id: string
  intake_id: string
  status: string | null
  created_at: string | null
}

export interface CertificateDocumentSentRepairCandidate {
  intakeId: string
  certificateId: string
  emailOutboxId: string
  documentSentAt: string
}

export interface CertificateDocumentSentRepairPlan {
  candidates: CertificateDocumentSentRepairCandidate[]
  skippedCount: number
}

export interface CertificateDocumentSentRepairSummary {
  dryRun: boolean
  windowDays: number
  limit: number
  candidateCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  queryFailed: boolean
  errorCode?: CertificateDocumentSentRepairErrorCode
}

function normalize(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized || null
}

function timestampOf(value: string | null | undefined): number {
  if (!value) return -1
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? -1 : timestamp
}

function sentTimestamp(row: SentCertificateEmailRepairRow): string | null {
  return row.sent_at || row.updated_at || row.created_at || null
}

function isRepairableIntake(row: CertificateDocumentSentRepairIntakeRow | undefined): row is CertificateDocumentSentRepairIntakeRow {
  return Boolean(
    row
    && row.category === "medical_certificate"
    && REPAIRABLE_INTAKE_STATUSES.includes(row.status as (typeof REPAIRABLE_INTAKE_STATUSES)[number])
    && !row.document_sent_at
    && row.exclude_from_reporting !== true,
  )
}

export function buildCertificateDocumentSentRepairPlan({
  emails,
  intakes,
  certificates,
  limit = CERTIFICATE_DOCUMENT_SENT_REPAIR_LIMIT,
}: {
  emails: SentCertificateEmailRepairRow[]
  intakes: CertificateDocumentSentRepairIntakeRow[]
  certificates: CertificateDocumentSentRepairCertificateRow[]
  limit?: number
}): CertificateDocumentSentRepairPlan {
  const latestEmailByIntake = new Map<string, SentCertificateEmailRepairRow>()
  const intakeById = new Map(intakes.map((row) => [row.id, row]))
  const validCertificateByIntake = new Map<string, CertificateDocumentSentRepairCertificateRow>()

  for (const certificate of certificates) {
    if (normalize(certificate.status) !== "valid") continue
    const existing = validCertificateByIntake.get(certificate.intake_id)
    if (!existing || timestampOf(certificate.created_at) >= timestampOf(existing.created_at)) {
      validCertificateByIntake.set(certificate.intake_id, certificate)
    }
  }

  for (const email of emails) {
    if (!email.intake_id || normalize(email.status) !== "sent" || !sentTimestamp(email)) continue
    const existing = latestEmailByIntake.get(email.intake_id)
    if (!existing || timestampOf(sentTimestamp(email)) >= timestampOf(sentTimestamp(existing))) {
      latestEmailByIntake.set(email.intake_id, email)
    }
  }

  const candidates: CertificateDocumentSentRepairCandidate[] = []

  for (const [intakeId, email] of latestEmailByIntake.entries()) {
    const intake = intakeById.get(intakeId)
    const certificate = validCertificateByIntake.get(intakeId)
    const documentSentAt = sentTimestamp(email)

    if (!isRepairableIntake(intake) || !certificate || !documentSentAt) continue

    candidates.push({
      intakeId,
      certificateId: certificate.id,
      emailOutboxId: email.id,
      documentSentAt,
    })
  }

  candidates.sort((a, b) => timestampOf(b.documentSentAt) - timestampOf(a.documentSentAt))

  return {
    candidates: candidates.slice(0, limit),
    skippedCount: Math.max(0, latestEmailByIntake.size - candidates.length),
  }
}

function baseSummary({
  dryRun,
  days,
  limit,
}: {
  dryRun: boolean
  days: number
  limit: number
}): CertificateDocumentSentRepairSummary {
  return {
    dryRun,
    windowDays: days,
    limit,
    candidateCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    queryFailed: false,
  }
}

function queryFailedSummary(
  options: {
    dryRun: boolean
    days: number
    limit: number
  },
  errorCode: CertificateDocumentSentRepairErrorCode,
): CertificateDocumentSentRepairSummary {
  return {
    ...baseSummary(options),
    queryFailed: true,
    errorCode,
  }
}

export async function repairCertificateDocumentSentAt(
  supabase: SupabaseClient,
  options: {
    dryRun?: boolean
    days?: number
    limit?: number
  } = {},
): Promise<CertificateDocumentSentRepairSummary> {
  const dryRun = options.dryRun ?? true
  const days = options.days ?? CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS
  const limit = options.limit ?? CERTIFICATE_DOCUMENT_SENT_REPAIR_LIMIT
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data: emails, error: emailError } = await supabase
      .from("email_outbox")
      .select("id, intake_id, status, sent_at, created_at, updated_at")
      .eq("email_type", "med_cert_patient")
      .eq("status", "sent")
      .gte("created_at", since)
      .not("intake_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(Math.max(limit * 6, 300))

    if (emailError) {
      log.warn("Failed to load sent certificate emails for document_sent_at repair", {
        error: emailError.message,
      })
      return queryFailedSummary({ dryRun, days, limit }, "email_query_failed")
    }

    const emailRows = (emails ?? []) as SentCertificateEmailRepairRow[]
    const intakeIds = [
      ...new Set(
        emailRows
          .map((row) => row.intake_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ]

    if (intakeIds.length === 0) {
      return baseSummary({ dryRun, days, limit })
    }

    const { data: intakes, error: intakeError } = await filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id, category, status, document_sent_at, generated_document_type, exclude_from_reporting")
        .in("id", intakeIds)
        .eq("category", "medical_certificate")
        .in("status", [...REPAIRABLE_INTAKE_STATUSES])
        .is("document_sent_at", null)
        .or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false"),
    )

    if (intakeError) {
      log.warn("Failed to load intakes for document_sent_at repair", {
        error: intakeError.message,
      })
      return queryFailedSummary({ dryRun, days, limit }, "intake_query_failed")
    }

    const { data: certificates, error: certificateError } = await supabase
      .from("issued_certificates")
      .select("id, intake_id, status, created_at")
      .in("intake_id", intakeIds)
      .eq("status", "valid")
      .order("created_at", { ascending: false })

    if (certificateError) {
      log.warn("Failed to load issued certificates for document_sent_at repair", {
        error: certificateError.message,
      })
      return queryFailedSummary({ dryRun, days, limit }, "certificate_query_failed")
    }

    const plan = buildCertificateDocumentSentRepairPlan({
      emails: emailRows,
      intakes: (intakes ?? []) as CertificateDocumentSentRepairIntakeRow[],
      certificates: (certificates ?? []) as CertificateDocumentSentRepairCertificateRow[],
      limit,
    })

    const summary: CertificateDocumentSentRepairSummary = {
      ...baseSummary({ dryRun, days, limit }),
      candidateCount: plan.candidates.length,
      skippedCount: plan.skippedCount,
    }

    if (dryRun || plan.candidates.length === 0) {
      return summary
    }

    for (const candidate of plan.candidates) {
      // PostgREST rejects nullable `.or()` filters on this PATCH path (42703).
      // Preserve the reportable-row union as two guarded updates while keeping
      // every candidate/status/document/E2E constraint on both attempts.
      const repairWithReportingGuard = (reportingGuard: "null" | "false") => {
        let updateQuery = supabase
          .from("intakes")
          .update({
            document_sent_at: candidate.documentSentAt,
            generated_document_type: "medical_certificate",
          })
          .eq("id", candidate.intakeId)
          .eq("category", "medical_certificate")
          .in("status", [...REPAIRABLE_INTAKE_STATUSES])
          .is("document_sent_at", null)

        updateQuery = reportingGuard === "null"
          ? updateQuery.is("exclude_from_reporting", null)
          : updateQuery.eq("exclude_from_reporting", false)

        return filterSeededE2EIntakes(updateQuery).select("id")
      }

      let { data: updatedRows, error: updateError } = await repairWithReportingGuard("null")
      if (!updateError && (!updatedRows || updatedRows.length === 0)) {
        const fallbackRepair = await repairWithReportingGuard("false")
        updatedRows = fallbackRepair.data
        updateError = fallbackRepair.error
      }

      if (updateError) {
        summary.failedCount += 1
        log.warn("Failed to repair certificate document_sent_at mirror", {
          error: updateError.message,
        })
        continue
      }

      if ((updatedRows ?? []).length > 0) {
        summary.updatedCount += 1
      } else {
        summary.skippedCount += 1
      }
    }

    return summary
  } catch (error) {
    log.error(
      "Unexpected certificate document_sent_at repair failure",
      {},
      error instanceof Error ? error : undefined,
    )

    return queryFailedSummary({ dryRun, days, limit }, "unexpected_failure")
  }
}
