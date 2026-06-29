"use server"

import {
  CERTIFICATE_DOCUMENT_SENT_REPAIR_LIMIT,
  type CertificateDocumentSentRepairSummary,
  repairCertificateDocumentSentAt,
} from "@/lib/admin/certificate-document-sent-repair"
import { CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS } from "@/lib/admin/ops-invariants"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ActionResult } from "@/types/shared"

const log = createLogger("certificate-document-sent-repair-action")

export async function repairCertificateDocumentSentAtAction(): Promise<ActionResult<CertificateDocumentSentRepairSummary>> {
  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(
    `admin:${authResult.profile.id}:certificate-document-sent-repair`,
    "admin",
  )
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
  }

  try {
    const supabase = createServiceRoleClient()
    const result = await repairCertificateDocumentSentAt(supabase, {
      dryRun: false,
      days: CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS,
      limit: CERTIFICATE_DOCUMENT_SENT_REPAIR_LIMIT,
    })

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "certificate_document_sent_at_repair",
        status: result.queryFailed ? "failed" : "repaired",
        dry_run: result.dryRun,
        window_days: result.windowDays,
        limit: result.limit,
        candidate_count: result.candidateCount,
        updated_count: result.updatedCount,
        skipped_count: result.skippedCount,
        failed_count: result.failedCount,
        error_code: result.errorCode,
      },
    })

    revalidateStaff({ ops: true })

    if (result.queryFailed) {
      return {
        success: false,
        error: "Could not repair certificate timestamps. Check logs before retrying.",
        data: result,
      }
    }

    return { success: true, data: result }
  } catch (error) {
    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "certificate_document_sent_at_repair",
        status: "failed",
        dry_run: false,
        window_days: CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS,
        limit: CERTIFICATE_DOCUMENT_SENT_REPAIR_LIMIT,
        error_type: error instanceof Error ? error.name : "UnknownError",
        error_code: "certificate_document_sent_at_repair_exception",
      },
    })

    log.error("Certificate document_sent_at repair action failed", {
      adminId: authResult.profile.id,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      error: "Could not repair certificate timestamps. Check logs before retrying.",
    }
  }
}
