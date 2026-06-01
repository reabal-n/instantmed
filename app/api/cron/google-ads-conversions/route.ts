import { NextRequest, NextResponse } from "next/server"

import {
  type GoogleAdsConversionActionPreflightResult,
  preflightGoogleAdsPurchaseConversionAction,
} from "@/lib/analytics/google-ads-conversion-api"
import {
  GOOGLE_ADS_ATTRIBUTION_SELECT,
  type GoogleAdsAttributionRow,
  hasGoogleClickId,
  isLikelyGoogleAttributed,
  isNonRetryableGoogleAdsConversionError,
  runGoogleAdsPostPaymentAttribution,
} from "@/lib/analytics/google-ads-post-payment"
import { acquireCronLock, releaseCronLock, verifyCronRequest } from "@/lib/api/cron-auth"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-google-ads-conversions")

const LOOKBACK_DAYS = 90
const BATCH_LIMIT = 25

type GoogleAdsCandidate = GoogleAdsAttributionRow & {
  id: string
  patient_id?: string | null
  paid_at?: string | null
}

type UploadAuditRow = {
  intake_id: string | null
  metadata: {
    error_code?: string
    status?: string
  } | null
}

function shouldRetryCandidate(
  row: GoogleAdsCandidate,
  latestAudit: UploadAuditRow | undefined,
  options: { force: boolean },
): boolean {
  const latestStatus = latestAudit?.metadata?.status
  const latestError = latestAudit?.metadata?.error_code || ""

  if (options.force) return true
  if (latestStatus === "success") return false
  if (latestStatus === "skipped_missing_click_id" && !hasGoogleClickId(row)) return false
  if (isNonRetryableGoogleAdsConversionError(latestError)) return false

  return true
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
 * intakes that look Google-attributed, skips already-successful uploads, and
 * retries failed/missing upload records using the stable intake id as Google's
 * order id for deduplication.
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
      .eq("payment_status", "paid")
      .not("paid_at", "is", null)
      .gte("paid_at", since)
      .order("paid_at", { ascending: true })
      .limit(500)

    const { data, error } = await filterReportableIntakes(candidateQuery)
    if (error) throw new Error(`Google Ads candidate query failed: ${error.message}`)

    const candidates = ((data || []) as GoogleAdsCandidate[]).filter(isLikelyGoogleAttributed)
    const candidateIds = candidates.map((row) => row.id)

    let latestAuditByIntake = new Map<string, UploadAuditRow>()
    if (candidateIds.length > 0) {
      const { data: audits, error: auditError } = await supabase
        .from("audit_logs")
        .select("intake_id, metadata")
        .eq("action", "google_ads_conversion_upload")
        .in("intake_id", candidateIds)
        .order("created_at", { ascending: false })

      if (auditError) throw new Error(`Google Ads audit query failed: ${auditError.message}`)

      latestAuditByIntake = new Map()
      for (const audit of (audits || []) as UploadAuditRow[]) {
        if (audit.intake_id && !latestAuditByIntake.has(audit.intake_id)) {
          latestAuditByIntake.set(audit.intake_id, audit)
        }
      }
    }

    const retryable = candidates
      .filter((row) => shouldRetryCandidate(row, latestAuditByIntake.get(row.id), { force }))
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

    const results: Array<{ id: string; status?: string; ok?: boolean; error?: string }> = []
    for (const row of retryable) {
      const result = await runGoogleAdsPostPaymentAttribution({
        amountCents: row.amount_cents,
        intakeId: row.id,
        posthogDistinctId: row.patient_id || row.id,
        row,
        source: "cron_backfill",
        supabase,
      })

      results.push({
        id: row.id,
        status: result.status,
        ok: result.ok,
        error: result.error,
      })
    }

    const skipped = results.filter((result) => result.status?.startsWith("skipped"))
    const failed = results.filter((result) => result.status && result.status !== "success" && !result.status.startsWith("skipped"))

    logger.info("Google Ads conversion backfill complete", {
      candidates: candidates.length,
      processed: results.length,
      skipped: skipped.length,
      failed: failed.length,
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
