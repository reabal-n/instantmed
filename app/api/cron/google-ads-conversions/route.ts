import { NextRequest, NextResponse } from "next/server"

import {
  GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
  runGoogleAdsConversionAdjustment,
} from "@/lib/analytics/google-ads-conversion-adjustments"
import { reportGoogleAdsConversionFailure } from "@/lib/analytics/google-ads-conversion-alarm"
import {
  type GoogleAdsConversionActionPreflightResult,
  preflightGoogleAdsPurchaseConversionAction,
} from "@/lib/analytics/google-ads-conversion-api"
import {
  GOOGLE_ADS_ATTRIBUTION_SELECT,
  type GoogleAdsAttributionRow,
  runGoogleAdsPostPaymentAttribution,
} from "@/lib/analytics/google-ads-post-payment"
import {
  bestGoogleAdsUploadAuditByIntake,
  type GoogleAdsUploadAuditRow,
  shouldRetryGoogleAdsUploadCandidate,
} from "@/lib/analytics/google-ads-upload-audit"
import { acquireCronLock, releaseCronLock, verifyCronRequest } from "@/lib/api/cron-auth"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-google-ads-conversions")

const LOOKBACK_DAYS = 90
const BATCH_LIMIT = 25
const GOOGLE_ADS_BACKFILL_PAYMENT_STATUSES = ["paid", "partially_refunded", "refunded"] as const
const GOOGLE_ADS_ADJUSTMENT_PAYMENT_STATUSES = ["partially_refunded", "refunded", "disputed"] as const

type GoogleAdsCandidate = GoogleAdsAttributionRow & {
  id: string
  patient_id?: string | null
  paid_at?: string | null
}

type GoogleAdsAdjustmentCandidate = {
  amount_cents?: number | null
  id: string
  payment_status: string
  refund_amount_cents?: number | null
  refunded_at?: string | null
  updated_at?: string | null
}

function parsePaidAtConversionDateTime(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function parseAdjustmentDateTime(row: GoogleAdsAdjustmentCandidate): Date | undefined {
  const value = row.refunded_at || row.updated_at
  if (!value) return undefined
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}

function shouldSkipBackfillForPreflight(
  preflight: GoogleAdsConversionActionPreflightResult,
): boolean {
  return preflight.severity === "error"
}

function serializePreflight(preflight: GoogleAdsConversionActionPreflightResult) {
  return {
    ok: preflight.ok,
    severity: preflight.severity,
    code: preflight.code,
    label: preflight.label,
    detail: preflight.detail,
  }
}

/**
 * Retry/backfill Google Ads server-side purchase uploads from Supabase truth.
 *
 * The Stripe webhook fires immediately, but a production-grade Ads pipeline
 * cannot rely on one fire-and-forget serverless call. This cron scans paid
 * intakes, skips already-successful uploads, and retries failed/missing upload
 * records using the stable intake id as Google's order id for deduplication.
 * Enhanced conversions can match with hashed first-party data even when a
 * click id was not captured, so this intentionally does not pre-filter to rows
 * that already look Google-attributed.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("google-ads-conversions")

  const lock = await acquireCronLock("google-ads-conversions")
  if (!lock.acquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : "Already running",
    })
  }

  try {
    const supabase = createServiceRoleClient()
    const force = request.nextUrl.searchParams.get("force") === "1"
    const preflightOnly = request.nextUrl.searchParams.get("preflight") === "1"
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

    if (preflightOnly) {
      const preflight = await preflightGoogleAdsPurchaseConversionAction()
      return NextResponse.json({
        success: preflight.severity !== "error",
        skipped: true,
        reason: "preflight_only",
        preflight: serializePreflight(preflight),
        lookback_days: LOOKBACK_DAYS,
        force,
        processed: 0,
        skipped_already_resolved: 0,
        skipped_uploads: 0,
        failed: 0,
        batch_limit: BATCH_LIMIT,
      })
    }

    const candidateQuery = supabase
      .from("intakes")
      .select(`id, patient_id, paid_at, ${GOOGLE_ADS_ATTRIBUTION_SELECT}`)
      .in("payment_status", [...GOOGLE_ADS_BACKFILL_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", since)
      .order("paid_at", { ascending: true })
      .limit(500)

    const { data, error } = await filterReportableIntakes(candidateQuery)
    if (error) throw new Error(`Google Ads candidate query failed: ${error.message}`)

    const candidates = (data || []) as GoogleAdsCandidate[]
    const candidateIds = candidates.map((row) => row.id)

    let latestAuditByIntake = new Map<string, GoogleAdsUploadAuditRow>()
    if (candidateIds.length > 0) {
      const { data: audits, error: auditError } = await supabase
        .from("audit_logs")
        .select("intake_id, created_at, metadata")
        .eq("action", "google_ads_conversion_upload")
        .in("intake_id", candidateIds)
        .order("created_at", { ascending: false })

      if (auditError) throw new Error(`Google Ads audit query failed: ${auditError.message}`)

      latestAuditByIntake = bestGoogleAdsUploadAuditByIntake((audits || []) as GoogleAdsUploadAuditRow[])
    }

    const retryable = candidates
      .filter((row) => shouldRetryGoogleAdsUploadCandidate(row, latestAuditByIntake.get(row.id), { force }))
      .slice(0, BATCH_LIMIT)

    let preflight: GoogleAdsConversionActionPreflightResult | null = null
    if (retryable.length > 0) {
      preflight = await preflightGoogleAdsPurchaseConversionAction()
      if (shouldSkipBackfillForPreflight(preflight)) {
        logger.warn("Google Ads conversion backfill skipped by preflight", {
          candidates: candidates.length,
          code: preflight.code,
          retryable: retryable.length,
        })

        // A blocking preflight means a misconfigured conversion action / creds:
        // EVERY upload fails until a human fixes the env. Escalate to a fatal,
        // fingerprinted Sentry alarm so this never silently burns ad spend for
        // weeks again (the May 19–Jun 1 2026 NO_CONVERSION_ACTION_FOUND outage).
        await reportGoogleAdsConversionFailure({
          source: "cron_preflight",
          preflightCode: preflight.code,
          preflightSeverity: preflight.severity,
        })

        return NextResponse.json({
          success: true,
          skipped: true,
          reason: "skipped_preflight",
          code: preflight.code,
          preflight: serializePreflight(preflight),
          lookback_days: LOOKBACK_DAYS,
          candidates: candidates.length,
          force,
          processed: 0,
          skipped_already_resolved: candidates.length - retryable.length,
          failed: 0,
          batch_limit: BATCH_LIMIT,
        })
      }
    }

    const results: Array<{ id: string; status?: string; ok?: boolean; error?: string; jobId?: number | string }> = []
    for (const row of retryable) {
      const result = await runGoogleAdsPostPaymentAttribution({
        amountCents: row.amount_cents,
        conversionDateTime: parsePaidAtConversionDateTime(row.paid_at),
        intakeId: row.id,
        posthogDistinctId: row.patient_id || row.id,
        requestPath: request.nextUrl.pathname,
        row,
        source: "cron_backfill",
        supabase,
      })

      results.push({
        id: row.id,
        status: result.status,
        ok: result.ok,
        error: result.error,
        jobId: result.jobId,
      })
    }

    const skipped = results.filter((result) => result.status?.startsWith("skipped"))
    const failed = results.filter((result) => result.status && result.status !== "success" && !result.status.startsWith("skipped"))
    const uploadJobIds = Array.from(
      new Set(results.map((result) => result.jobId).filter((jobId): jobId is number | string => jobId != null)),
    ).sort((a, b) => String(a).localeCompare(String(b)))

    const adjustmentQuery = supabase
      .from("intakes")
      .select("id, amount_cents, refund_amount_cents, payment_status, refunded_at, updated_at")
      .in("payment_status", [...GOOGLE_ADS_ADJUSTMENT_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", since)
      .order("updated_at", { ascending: true })
      .limit(500)

    const { data: adjustmentData, error: adjustmentError } = await filterReportableIntakes(adjustmentQuery)
    if (adjustmentError) throw new Error(`Google Ads adjustment candidate query failed: ${adjustmentError.message}`)

    const adjustmentCandidates = ((adjustmentData || []) as GoogleAdsAdjustmentCandidate[]).slice(0, BATCH_LIMIT)
    const adjustmentResults: Array<{ id: string; status: string; ok?: boolean; error?: string }> = []

    for (const row of adjustmentCandidates) {
      const result = await runGoogleAdsConversionAdjustment({
        adjustmentDateTime: parseAdjustmentDateTime(row),
        amountCents: row.amount_cents ?? null,
        intakeId: row.id,
        paymentStatus: row.payment_status,
        refundAmountCents: row.refund_amount_cents ?? null,
        requestPath: request.nextUrl.pathname,
        source: "cron_backfill",
        supabase,
      })

      adjustmentResults.push({
        id: row.id,
        status: result.status,
        ok: result.ok,
        error: result.error,
      })
    }

    const adjustmentSkipped = adjustmentResults.filter((result) => result.status.startsWith("skipped"))
    const adjustmentFailed = adjustmentResults.filter((result) => result.status === "failed")

    logger.info("Google Ads conversion backfill complete", {
      candidates: candidates.length,
      processed: results.length,
      skipped: skipped.length,
      failed: failed.length,
      adjustmentCandidates: adjustmentCandidates.length,
      adjustmentFailed: adjustmentFailed.length,
    })

    return NextResponse.json({
      success: true,
      lookback_days: LOOKBACK_DAYS,
      candidates: candidates.length,
      force,
      preflight: preflight ? serializePreflight(preflight) : null,
      processed: results.length,
      skipped_already_resolved: candidates.length - retryable.length,
      skipped: skipped.length,
      failed: failed.length,
      adjustment_action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
      adjustment_candidates: adjustmentCandidates.length,
      adjustment_processed: adjustmentResults.length,
      adjustment_skipped: adjustmentSkipped.length,
      adjustment_failed: adjustmentFailed.length,
      upload_job_ids: uploadJobIds,
      batch_limit: BATCH_LIMIT,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const eventId = captureCronError(err, { jobName: "google-ads-conversions" })
    return NextResponse.json(
      { success: false, error: err.message, sentry_event_id: eventId },
      { status: 500 },
    )
  } finally {
    await releaseCronLock("google-ads-conversions")
  }
}
