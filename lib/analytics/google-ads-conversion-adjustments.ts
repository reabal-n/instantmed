import "server-only"

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  fireGoogleAdsConversionAdjustment,
  type GoogleAdsConversionAdjustmentType,
  type GoogleAdsConversionUploadResult,
} from "@/lib/analytics/google-ads-conversion-api"
import { retrieveGoogleDataManagerRequestStatus } from "@/lib/analytics/google-ads-data-manager-api"
import { GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION } from "@/lib/analytics/google-ads-post-payment"
import { createLogger } from "@/lib/observability/logger"
import { sanitizeAuditMetadata } from "@/lib/security/sanitize-audit"

const log = createLogger("google-ads-conversion-adjustments")

export const GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION = "google_ads_conversion_adjustment"

/**
 * How long after the ORIGINAL successful purchase upload a CONVERSION_NOT_FOUND
 * adjustment failure stays transient. Google processes conversion uploads
 * asynchronously (up to ~24h for click conversions; Data Manager ingests and
 * user-data matching can take longer), and InstantMed's standard decline flow
 * refunds the SAME DAY as payment — so the first retraction attempt routinely
 * fires before the conversion is queryable. Treating that first
 * CONVERSION_NOT_FOUND as terminal would permanently skip the retraction and
 * leave a real ad-click conversion counted in Google. Past this window the
 * error is truthful ("never imported, or imported but discarded") and final.
 */
export const GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS = 72

const CONVERSION_NOT_FOUND_TERMINAL_REASON = "conversion_not_found"
const DM_REQUEST_REJECTED_ERROR = "dm_request_rejected"
const DM_REQUEST_PROCESSING_ERROR = "dm_request_processing"

type GoogleAdsConversionAdjustmentSource =
  | "cron_backfill"
  | "stripe_charge_dispute_created"
  | "stripe_charge_refunded"

type GoogleAdsConversionAdjustmentStatus =
  | "failed"
  | "skipped_already_adjusted"
  | "skipped_terminal_error"
  | "skipped_invalid_adjustment"
  | "skipped_local_dev"
  | "skipped_missing_successful_upload"
  | "skipped_no_adjustment"
  | "success"
  | "terminal_failed"

type GoogleAdsConversionAdjustmentAuditRow = {
  action?: string | null
  created_at?: string | null
  intake_id?: string | null
  metadata?: {
    adjustment_type?: string | null
    error_code?: string | null
    has_gbraid?: boolean | null
    has_gclid?: boolean | null
    has_wbraid?: boolean | null
    status?: string | null
    target_net_value_cents?: number | null
    terminal?: boolean | null
    terminal_reason?: string | null
    upload_api?: string | null
    upload_identifier?: string | null
  } | null
}

type GoogleAdsConversionAdjustmentIntent = {
  adjustmentType: GoogleAdsConversionAdjustmentType
  adjustedValue?: number
  targetNetValueCents: number
}

function cleanRuntimeValue(value?: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function shouldWriteGoogleAdsAdjustmentAudit(): boolean {
  return !(process.env.VERCEL !== "1" && process.env.NODE_ENV === "development")
}

function getRuntimeMetadata(requestPath?: string | null) {
  return {
    deployment_id: cleanRuntimeValue(process.env.VERCEL_DEPLOYMENT_ID),
    git_sha:
      cleanRuntimeValue(process.env.VERCEL_GIT_COMMIT_SHA) ||
      cleanRuntimeValue(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) ||
      cleanRuntimeValue(process.env.GIT_SHA),
    node_env: cleanRuntimeValue(process.env.NODE_ENV),
    request_path: cleanRuntimeValue(requestPath),
    runtime: cleanRuntimeValue(process.env.NEXT_RUNTIME) || "nodejs",
    runtime_source: process.env.VERCEL === "1" ? "vercel" : "node",
    vercel_env: cleanRuntimeValue(process.env.VERCEL_ENV),
    vercel_region: cleanRuntimeValue(process.env.VERCEL_REGION),
  }
}

function centsToAud(cents: number): number {
  return Math.round(cents) / 100
}

function getGoogleAdsConversionAdjustmentIntent(input: {
  amountCents: number | null
  paymentStatus: string
  refundAmountCents: number | null
}): GoogleAdsConversionAdjustmentIntent | null {
  const amountCents = input.amountCents
  const refundAmountCents = input.refundAmountCents ?? 0
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents) || amountCents <= 0) return null

  if (input.paymentStatus === "refunded" || input.paymentStatus === "disputed") {
    return {
      adjustmentType: "RETRACTION",
      targetNetValueCents: 0,
    }
  }

  if (input.paymentStatus !== "partially_refunded") return null

  const targetNetValueCents = Math.max(amountCents - Math.max(refundAmountCents, 0), 0)
  if (targetNetValueCents <= 0) {
    return {
      adjustmentType: "RETRACTION",
      targetNetValueCents: 0,
    }
  }

  return {
    adjustedValue: centsToAud(targetNetValueCents),
    adjustmentType: "RESTATEMENT",
    targetNetValueCents,
  }
}

async function getAdjustmentAuditRows(
  supabase: SupabaseClient,
  intakeId: string,
  action: string,
): Promise<GoogleAdsConversionAdjustmentAuditRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("action, created_at, intake_id, metadata")
    .eq("action", action)
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Google Ads adjustment audit query failed: ${error.message}`)
  }

  return (data || []) as GoogleAdsConversionAdjustmentAuditRow[]
}

function successfulPurchaseUpload(rows: GoogleAdsConversionAdjustmentAuditRow[]) {
  return rows.find((row) => row.metadata?.status === "success") || null
}

function hasMatchingSuccessfulAdjustment(
  rows: GoogleAdsConversionAdjustmentAuditRow[],
  intent: GoogleAdsConversionAdjustmentIntent,
): boolean {
  return rows.some(
    (row) =>
      row.metadata?.status === "success" &&
      row.metadata?.adjustment_type === intent.adjustmentType &&
      row.metadata?.target_net_value_cents === intent.targetNetValueCents,
  )
}

function getTerminalGoogleAdsAdjustmentReason(error?: string | null): string | null {
  if (!error) return null
  if (error.includes("CONVERSION_NOT_FOUND")) return CONVERSION_NOT_FOUND_TERMINAL_REASON
  if (error.includes(DM_REQUEST_REJECTED_ERROR)) return DM_REQUEST_REJECTED_ERROR
  return null
}

function isUploadPastConversionMatchGrace(
  successfulUpload: GoogleAdsConversionAdjustmentAuditRow | null | undefined,
  nowMs = Date.now(),
): boolean {
  const createdAtMs = Date.parse(successfulUpload?.created_at || "")
  // Unknown upload age must not retry forever: treat as past grace.
  if (!Number.isFinite(createdAtMs)) return true
  return nowMs - createdAtMs > GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS * 60 * 60 * 1000
}

function hasMatchingTerminalAdjustmentFailure(
  rows: GoogleAdsConversionAdjustmentAuditRow[],
  intent: GoogleAdsConversionAdjustmentIntent,
  uploadPastGrace: boolean,
): boolean {
  return rows.some((row) => {
    const metadata = row.metadata
    if (
      metadata?.adjustment_type !== intent.adjustmentType ||
      metadata?.target_net_value_cents !== intent.targetNetValueCents
    ) return false

    const errorCode = typeof metadata.error_code === "string" ? metadata.error_code : null
    const reason =
      (typeof metadata.terminal_reason === "string" ? metadata.terminal_reason : null) ||
      getTerminalGoogleAdsAdjustmentReason(errorCode)
    const isExplicitTerminal =
      metadata.status === "terminal_failed" || (metadata.terminal === true && Boolean(metadata.terminal_reason))
    const isLegacyConversionNotFoundFailure =
      metadata.status === "failed" && reason === CONVERSION_NOT_FOUND_TERMINAL_REASON

    if (!isExplicitTerminal && !isLegacyConversionNotFoundFailure) return false

    // CONVERSION_NOT_FOUND only becomes final once Google has had the full
    // grace window to process the original upload; inside the window a prior
    // failure (even one recorded as terminal) must not block the retry.
    if (reason === CONVERSION_NOT_FOUND_TERMINAL_REASON) return uploadPastGrace
    return true
  })
}

function uploadHadClickIdentifier(
  successfulUpload: GoogleAdsConversionAdjustmentAuditRow | null | undefined,
): boolean {
  const metadata = successfulUpload?.metadata
  return metadata?.has_gclid === true || metadata?.has_gbraid === true || metadata?.has_wbraid === true
}

/**
 * A terminal retraction failure on a click-attributed upload is the one
 * signature of "a refunded order may still be counted as a Google Ads
 * conversion" — exactly what poisons a paid-ads validation read. Fires once
 * per intake (the terminal audit row stops further attempts). User-data-only
 * uploads terminal silently: if the hashed identifiers never matched an ad
 * interaction, no conversion ever counted and there is nothing to retract.
 */
function reportTerminalRetractionFailure({
  error,
  intakeId,
  intent,
  source,
  successfulUpload,
}: {
  error?: string | null
  intakeId: string
  intent: GoogleAdsConversionAdjustmentIntent
  source: GoogleAdsConversionAdjustmentSource
  successfulUpload?: GoogleAdsConversionAdjustmentAuditRow | null
}) {
  if (!uploadHadClickIdentifier(successfulUpload)) return

  Sentry.captureMessage("Google Ads retraction permanently failed for a click-attributed conversion", {
    level: "error",
    fingerprint: ["google-ads-retraction-terminal", intakeId],
    tags: {
      adjustment_type: intent.adjustmentType,
      source,
    },
    extra: {
      intakeId,
      error: error || null,
      uploadApi: successfulUpload?.metadata?.upload_api ?? null,
      uploadIdentifier: successfulUpload?.metadata?.upload_identifier ?? null,
    },
  })
}

type DataManagerAdjustmentPreflight = "proceed" | "processing" | "rejected"

/**
 * The Data Manager API has NO adjustment/retraction surface (no events:remove;
 * confirmed against the v1 reference + release notes, 2026-07). DM-uploaded
 * conversions are therefore still retracted through the Google Ads
 * ConversionAdjustmentUploadService below, matched by order id — the
 * documented mechanism regardless of upload surface. The DM request status is
 * the one extra signal we have: a FAILED ingest means the conversion never
 * landed (nothing to retract, terminal), and PROCESSING means an adjustment
 * attempt now is guaranteed premature.
 */
async function checkDataManagerUploadForAdjustment(
  successfulUpload: GoogleAdsConversionAdjustmentAuditRow,
): Promise<DataManagerAdjustmentPreflight> {
  const uploadApi = successfulUpload.metadata?.upload_api
  const uploadIdentifier = successfulUpload.metadata?.upload_identifier
  if (uploadApi !== "data_manager_api" || !uploadIdentifier) return "proceed"

  try {
    const result = await retrieveGoogleDataManagerRequestStatus(uploadIdentifier)
    if (!result.attempted || !result.ok) return "proceed"
    if (result.status === "FAILED") return "rejected"
    if (result.status === "PROCESSING") return "processing"
    return "proceed"
  } catch {
    // Status lookup must never block a retraction from reaching Google.
    return "proceed"
  }
}

async function recordGoogleAdsConversionAdjustmentAudit({
  amountCents,
  error,
  hasSuccessfulPurchaseUpload,
  intakeId,
  intent,
  requestPath,
  result,
  source,
  status,
  successfulUpload,
  supabase,
  refundAmountCents,
}: {
  amountCents: number | null
  error?: string | null
  hasSuccessfulPurchaseUpload: boolean
  intakeId: string
  intent: GoogleAdsConversionAdjustmentIntent | null
  requestPath?: string | null
  result?: GoogleAdsConversionUploadResult | null
  source: GoogleAdsConversionAdjustmentSource
  status: GoogleAdsConversionAdjustmentStatus
  successfulUpload?: GoogleAdsConversionAdjustmentAuditRow | null
  supabase: SupabaseClient
  refundAmountCents: number | null
}) {
  if (!shouldWriteGoogleAdsAdjustmentAudit()) {
    log.info("Skipping Google Ads conversion adjustment audit row from local development runtime", {
      intakeId,
      source,
      status,
    })
    return
  }

  const metadata = sanitizeAuditMetadata({
    action_type: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
    adjustment_type: intent?.adjustmentType || null,
    adjusted_value: intent?.adjustedValue ?? null,
    amount_cents: amountCents,
    attempted: result?.attempted ?? false,
    currency: "AUD",
    error_code: error || result?.error || null,
    has_successful_purchase_upload: hasSuccessfulPurchaseUpload,
    ok: result?.ok ?? false,
    order_id: intakeId,
    refund_amount_cents: refundAmountCents,
    source,
    status,
    target_net_value_cents: intent?.targetNetValueCents ?? null,
    terminal: status === "terminal_failed",
    terminal_reason: status === "terminal_failed"
      ? getTerminalGoogleAdsAdjustmentReason(error || result?.error || null)
      : null,
    upload_api: successfulUpload?.metadata?.upload_api || null,
    upload_identifier: successfulUpload?.metadata?.upload_identifier || null,
    ...getRuntimeMetadata(requestPath),
  })

  const { error: auditError } = await supabase.from("audit_logs").insert({
    action: GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION,
    actor_type: "system",
    created_at: new Date().toISOString(),
    intake_id: intakeId,
    metadata,
  })

  if (auditError) {
    log.error("Failed to record Google Ads conversion adjustment audit", {
      intakeId,
      source,
      status,
    }, auditError)
  }
}

export async function runGoogleAdsConversionAdjustment({
  adjustmentDateTime,
  amountCents,
  intakeId,
  paymentStatus,
  refundAmountCents,
  requestPath,
  source,
  supabase,
}: {
  adjustmentDateTime?: Date
  amountCents: number | null
  intakeId: string
  paymentStatus: string
  refundAmountCents: number | null
  requestPath?: string | null
  source: GoogleAdsConversionAdjustmentSource
  supabase: SupabaseClient
}): Promise<{
  attempted: boolean
  error?: string
  ok?: boolean
  status: GoogleAdsConversionAdjustmentStatus
}> {
  const intent = getGoogleAdsConversionAdjustmentIntent({
    amountCents,
    paymentStatus,
    refundAmountCents,
  })

  if (!intent) {
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: "no_adjustment",
      hasSuccessfulPurchaseUpload: false,
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "skipped_no_adjustment",
      supabase,
    })
    return { attempted: false, error: "no_adjustment", status: "skipped_no_adjustment" }
  }

  const [uploadAudits, adjustmentAudits] = await Promise.all([
    getAdjustmentAuditRows(supabase, intakeId, GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION),
    getAdjustmentAuditRows(supabase, intakeId, GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION),
  ])

  const successfulUpload = successfulPurchaseUpload(uploadAudits)
  if (!successfulUpload) {
    // The hourly cron re-evaluates every refunded intake in its lookback
    // window; without this dedupe a never-uploaded intake wrote one identical
    // skip row per run (24 junk audit rows/day) until the window lapsed.
    const alreadyRecordedMissingUpload = adjustmentAudits.some(
      (row) => row.metadata?.status === "skipped_missing_successful_upload",
    )
    if (!alreadyRecordedMissingUpload) {
      await recordGoogleAdsConversionAdjustmentAudit({
        amountCents,
        error: "missing_successful_purchase_upload",
        hasSuccessfulPurchaseUpload: false,
        intakeId,
        intent,
        refundAmountCents,
        requestPath,
        source,
        status: "skipped_missing_successful_upload",
        supabase,
      })
    }
    return {
      attempted: false,
      error: "missing_successful_purchase_upload",
      status: "skipped_missing_successful_upload",
    }
  }

  if (hasMatchingSuccessfulAdjustment(adjustmentAudits, intent)) {
    return { attempted: false, status: "skipped_already_adjusted" }
  }

  const uploadPastGrace = isUploadPastConversionMatchGrace(successfulUpload)
  if (hasMatchingTerminalAdjustmentFailure(adjustmentAudits, intent, uploadPastGrace)) {
    return { attempted: false, status: "skipped_terminal_error" }
  }

  const dmPreflight = await checkDataManagerUploadForAdjustment(successfulUpload)
  if (dmPreflight === "rejected") {
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: DM_REQUEST_REJECTED_ERROR,
      hasSuccessfulPurchaseUpload: true,
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "terminal_failed",
      successfulUpload,
      supabase,
    })
    // No alarm here: a rejected ingest means the conversion never landed in
    // Google Ads, so the refunded order was never counted to begin with.
    return { attempted: false, error: DM_REQUEST_REJECTED_ERROR, status: "terminal_failed" }
  }
  if (dmPreflight === "processing") {
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: DM_REQUEST_PROCESSING_ERROR,
      hasSuccessfulPurchaseUpload: true,
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "failed",
      successfulUpload,
      supabase,
    })
    return { attempted: false, error: DM_REQUEST_PROCESSING_ERROR, status: "failed" }
  }

  const result = await fireGoogleAdsConversionAdjustment({
    adjustedValue: intent.adjustedValue,
    adjustmentDateTime,
    adjustmentType: intent.adjustmentType,
    orderId: intakeId,
  })
  const terminalReason = getTerminalGoogleAdsAdjustmentReason(result.error)
  const status: GoogleAdsConversionAdjustmentStatus = result.ok
    ? "success"
    : terminalReason === CONVERSION_NOT_FOUND_TERMINAL_REASON && !uploadPastGrace
      ? "failed"
      : terminalReason
        ? "terminal_failed"
        : "failed"

  await recordGoogleAdsConversionAdjustmentAudit({
    amountCents,
    hasSuccessfulPurchaseUpload: true,
    intakeId,
    intent,
    refundAmountCents,
    requestPath,
    result,
    source,
    status,
    successfulUpload,
    supabase,
  })

  if (status === "terminal_failed") {
    reportTerminalRetractionFailure({
      error: result.error,
      intakeId,
      intent,
      source,
      successfulUpload,
    })
  }

  return {
    attempted: result.attempted,
    error: result.error,
    ok: result.ok,
    status,
  }
}
