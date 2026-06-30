import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { getGoogleAdsSpendAuditReport } from "@/lib/analytics/google-ads-report"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-google-ads-diagnostics-watch")

const DEFAULT_PROCESSING_WINDOW_HOURS = 24
const PASSING_WATCH_STATUSES = new Set([
  "diagnostics_accepted",
  "diagnostics_stale_audit_success",
])

function parseProcessingWindowHours(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_PROCESSING_WINDOW_HOURS
  return Math.min(Math.max(Math.floor(parsed), 1), 168)
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed || null
}

function resolveWatchUploadIdentifier(request: NextRequest): {
  jobId: string | null
  requestId: string | null
  uploadIdentifier: string | null
} {
  const requestId =
    clean(request.nextUrl.searchParams.get("requestId")) ||
    clean(process.env.GOOGLE_ADS_DIAGNOSTICS_WATCH_REQUEST_ID)
  if (requestId) {
    return {
      jobId: null,
      requestId,
      uploadIdentifier: requestId,
    }
  }

  const jobId =
    clean(request.nextUrl.searchParams.get("jobId")) ||
    clean(process.env.GOOGLE_ADS_DIAGNOSTICS_WATCH_JOB_ID)
  return {
    jobId,
    requestId: null,
    uploadIdentifier: jobId,
  }
}

function resolveUploadedAt(request: NextRequest): string | null {
  return (
    clean(request.nextUrl.searchParams.get("uploadedAt")) ||
    clean(process.env.GOOGLE_ADS_DIAGNOSTICS_WATCH_UPLOADED_AT) ||
    null
  )
}

function resolveEligibleAt(uploadedAt: string, processingWindowHours: number): Date {
  const uploadedAtMs = Date.parse(uploadedAt)
  if (!Number.isFinite(uploadedAtMs)) return new Date()
  return new Date(uploadedAtMs + processingWindowHours * 60 * 60 * 1000)
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("google-ads-diagnostics-watch")

  const now = new Date()
  const {
    jobId,
    requestId,
    uploadIdentifier,
  } = resolveWatchUploadIdentifier(request)
  const uploadedAt = resolveUploadedAt(request)
  const processingWindowHours = parseProcessingWindowHours(
    request.nextUrl.searchParams.get("processingWindowHours") ||
      process.env.GOOGLE_ADS_DIAGNOSTICS_PROCESSING_WINDOW_HOURS ||
      null,
  )

  if (!uploadIdentifier || !uploadedAt) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "watch_upload_not_configured",
      detail: "Set GOOGLE_ADS_DIAGNOSTICS_WATCH_REQUEST_ID for Data Manager uploads, or legacy GOOGLE_ADS_DIAGNOSTICS_WATCH_JOB_ID, plus GOOGLE_ADS_DIAGNOSTICS_WATCH_UPLOADED_AT after a fresh upload is emitted.",
      checked_at: now.toISOString(),
    })
  }

  const eligibleAt = resolveEligibleAt(uploadedAt, processingWindowHours)

  if (now < eligibleAt) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "processing_window_pending",
      job_id: jobId,
      request_id: requestId,
      upload_identifier: uploadIdentifier,
      uploaded_at: uploadedAt,
      processing_window_hours: processingWindowHours,
      eligible_at: eligibleAt.toISOString(),
      checked_at: now.toISOString(),
    })
  }

  try {
    const report = await getGoogleAdsSpendAuditReport({
      auditSince: uploadedAt,
      days: 30,
      diagnosticsProcessingWindowHours: processingWindowHours,
      now,
      supabase: createServiceRoleClient(),
      watchJobId: uploadIdentifier,
      watchUploadedAt: uploadedAt,
    })
    const diagnosticsWatch = report.diagnosticsWatch
    const failingStatus = !diagnosticsWatch || !PASSING_WATCH_STATUSES.has(diagnosticsWatch.status)

    if (failingStatus) {
      Sentry.captureMessage("Google Ads diagnostics watch failed", {
        level: "error",
        tags: {
          google_ads_upload_job_id: jobId,
          google_ads_upload_request_id: requestId,
          google_ads_upload_identifier: uploadIdentifier,
          google_ads_watch_status: diagnosticsWatch?.status || "missing_watch_result",
          source: "google-ads-diagnostics-watch",
        },
        extra: {
          diagnostics_watch: diagnosticsWatch,
          evidence_comparison: report.evidenceComparison,
          upload_audit_reconciliation: report.uploadAuditReconciliation,
        },
      })
      logger.warn("Google Ads diagnostics watch failed", {
        jobId,
        requestId,
        status: diagnosticsWatch?.status || "missing_watch_result",
        uploadIdentifier,
      })
    } else {
      logger.info("Google Ads diagnostics watch passed", { jobId, requestId, uploadIdentifier })
    }

    return NextResponse.json(
      {
        success: !failingStatus,
        checked_at: now.toISOString(),
        data_manager_request_status: report.dataManagerRequestStatus,
        diagnostics_watch: diagnosticsWatch,
        evidence_comparison: report.evidenceComparison,
        google_ads_diagnostics: report.diagnostics,
        job_id: jobId,
        offline_upload_diagnostics: report.offlineUploadDiagnostics,
        query_errors: report.queryErrors,
        request_id: requestId,
        upload_identifier: uploadIdentifier,
        upload_audit_reconciliation: report.uploadAuditReconciliation,
      },
      { status: failingStatus ? 503 : 200 },
    )
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const eventId = captureCronError(err, { jobName: "google-ads-diagnostics-watch" })
    return NextResponse.json(
      {
        error: err.message,
        job_id: jobId,
        request_id: requestId,
        sentry_event_id: eventId,
        success: false,
        upload_identifier: uploadIdentifier,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
