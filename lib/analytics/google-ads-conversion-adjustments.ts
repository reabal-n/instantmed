import "server-only"

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
 * refunds the SAME DAY as payment — so the first restatement attempt routinely
 * fires before the conversion is queryable. Treating that first
 * CONVERSION_NOT_FOUND as terminal would permanently skip the adjustment and
 * leave a real ad-click conversion counted in Google. Past this window the
 * error is truthful ("never imported, or imported but discarded") and is
 * durably resolved as not counted rather than treated as a mutation failure.
 */
export const GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS = 72
/** Google rejects conversion adjustments more than 54 days after conversion. */
export const GOOGLE_ADS_ADJUSTMENT_MAX_AGE_DAYS = 54

const CONVERSION_NOT_FOUND_TERMINAL_REASON = "conversion_not_found"
const DM_REQUEST_REJECTED_ERROR = "dm_request_rejected"
const DM_REQUEST_PROCESSING_ERROR = "dm_request_processing"

export type GoogleAdsConversionAdjustmentSource =
  | "cron_backfill"
  | "stripe_charge_dispute_lost"
  | "stripe_charge_refunded"
  | "stripe_refund_lifecycle"

type GoogleAdsConversionAdjustmentStatus =
  | "failed"
  | "resolved_not_counted"
  | "skipped_already_adjusted"
  | "skipped_in_progress"
  | "skipped_terminal_error"
  | "skipped_invalid_adjustment"
  | "skipped_local_dev"
  | "skipped_missing_successful_upload"
  | "skipped_no_adjustment"
  | "success"
  | "terminal_failed"
  | "unknown_outcome"

type GoogleAdsConversionAdjustmentAuditRow = {
  action?: string | null
  created_at?: string | null
  intake_id?: string | null
  metadata?: {
    adjustment_type?: string | null
    error_code?: string | null
    exact_target_net_value_cents?: number | null
    has_gbraid?: boolean | null
    has_gclid?: boolean | null
    has_wbraid?: boolean | null
    resolution_reason?: string | null
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
  exactTargetNetValueCents: number
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
  targetNetValueCents?: number | null
}): GoogleAdsConversionAdjustmentIntent | null {
  const amountCents = input.amountCents
  const refundAmountCents = input.refundAmountCents ?? 0
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents) || amountCents <= 0) return null

  if (input.targetNetValueCents !== undefined && input.targetNetValueCents !== null) {
    const exactTargetNetValueCents = input.targetNetValueCents
    if (
      !Number.isInteger(exactTargetNetValueCents) ||
      exactTargetNetValueCents < 0 ||
      exactTargetNetValueCents > amountCents
    ) {
      return null
    }
    // Google permanently removes conversions restated to zero and ignores a
    // later restoration. Preserve exact zero in the cash ledger, but upload a
    // reversible A$0.01 floor to Ads. See:
    // https://support.google.com/google-ads/answer/7686447
    // https://support.google.com/google-ads/answer/7686280
    const targetNetValueCents = Math.max(exactTargetNetValueCents, 1)
    return {
      adjustedValue: centsToAud(targetNetValueCents),
      adjustmentType: "RESTATEMENT",
      exactTargetNetValueCents,
      targetNetValueCents,
    }
  }

  if (input.paymentStatus === "refunded" || input.paymentStatus === "disputed") {
    return {
      adjustedValue: 0.01,
      adjustmentType: "RESTATEMENT",
      exactTargetNetValueCents: 0,
      targetNetValueCents: 1,
    }
  }

  if (input.paymentStatus !== "partially_refunded") return null

  const targetNetValueCents = Math.max(amountCents - Math.max(refundAmountCents, 0), 0)
  if (targetNetValueCents <= 0) {
    return {
      adjustedValue: 0.01,
      adjustmentType: "RESTATEMENT",
      exactTargetNetValueCents: 0,
      targetNetValueCents: 1,
    }
  }

  return {
    adjustedValue: centsToAud(targetNetValueCents),
    adjustmentType: "RESTATEMENT",
    exactTargetNetValueCents: targetNetValueCents,
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

function conversionNotFoundOccurredPastGrace(
  failure: GoogleAdsConversionAdjustmentAuditRow,
  successfulUpload: GoogleAdsConversionAdjustmentAuditRow,
): boolean {
  const failureAtMs = Date.parse(failure.created_at || "")
  const uploadAtMs = Date.parse(successfulUpload.created_at || "")
  if (!Number.isFinite(failureAtMs) || !Number.isFinite(uploadAtMs)) return false
  return failureAtMs - uploadAtMs >
    GOOGLE_ADS_ADJUSTMENT_CONVERSION_MATCH_GRACE_HOURS * 60 * 60 * 1000
}

function matchingPostGraceConversionNotFound(
  rows: GoogleAdsConversionAdjustmentAuditRow[],
  intent: GoogleAdsConversionAdjustmentIntent,
  successfulUpload: GoogleAdsConversionAdjustmentAuditRow,
): GoogleAdsConversionAdjustmentAuditRow | null {
  return rows.find((row) => {
    const metadata = row.metadata
    const legacyExactTarget = metadata?.adjustment_type === "RETRACTION"
      ? 0
      : metadata?.target_net_value_cents
    const exactTarget = Number.isInteger(metadata?.exact_target_net_value_cents)
      ? metadata?.exact_target_net_value_cents
      : legacyExactTarget
    if (exactTarget !== intent.exactTargetNetValueCents) return false

    const errorCode = typeof metadata?.error_code === "string" ? metadata.error_code : null
    const terminalReason = typeof metadata?.terminal_reason === "string"
      ? metadata.terminal_reason
      : null
    const isConversionNotFound = terminalReason === CONVERSION_NOT_FOUND_TERMINAL_REASON ||
      errorCode?.includes("CONVERSION_NOT_FOUND")
    return Boolean(isConversionNotFound) &&
      conversionNotFoundOccurredPastGrace(row, successfulUpload)
  }) ?? null
}

type GoogleAdsAdjustmentErrorDisposition =
  | { kind: "not_found"; reason: string }
  | { kind: "terminal"; reason: string }
  | { kind: "unknown"; reason: string }

const TERMINAL_GOOGLE_ADS_ADJUSTMENT_ERRORS = [
  "CONVERSION_EXPIRED",
  "TOO_MANY_ADJUSTMENTS",
  "INVALID_ADJUSTMENT_TYPE",
  "INVALID_CONVERSION_ACTION",
  "ORDER_ID_REQUIRED",
  "VALUE_MUST_BE_SET_FOR_RESTATEMENT",
  "VALUE_MUST_BE_UNSET_FOR_RETRACTION",
  "CURRENCY_CODE_MUST_BE_SET_FOR_RESTATEMENT",
  "CURRENCY_CODE_MUST_BE_UNSET_FOR_RETRACTION",
] as const

const UNCERTAIN_GOOGLE_ADS_ADJUSTMENT_ERRORS = [
  "RESTATEMENT_ALREADY_EXISTS",
  "MORE_RECENT_RESTATEMENT_FOUND",
  "CONVERSION_ALREADY_RETRACTED",
] as const

function classifyGoogleAdsAdjustmentError(
  error?: string | null,
): GoogleAdsAdjustmentErrorDisposition | null {
  if (!error) return null
  if (error.includes("CONVERSION_NOT_FOUND")) {
    return { kind: "not_found", reason: CONVERSION_NOT_FOUND_TERMINAL_REASON }
  }
  const uncertain = UNCERTAIN_GOOGLE_ADS_ADJUSTMENT_ERRORS.find((code) => error.includes(code))
  if (uncertain) return { kind: "unknown", reason: uncertain.toLowerCase() }
  const terminal = TERMINAL_GOOGLE_ADS_ADJUSTMENT_ERRORS.find((code) => error.includes(code))
  if (terminal) return { kind: "terminal", reason: terminal.toLowerCase() }
  if (error.includes(DM_REQUEST_REJECTED_ERROR)) {
    return { kind: "terminal", reason: DM_REQUEST_REJECTED_ERROR }
  }
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

type DataManagerAdjustmentPreflight = "proceed" | "processing" | "rejected"

/**
 * The Data Manager API has NO conversion-adjustment surface (no events:remove;
 * confirmed against the v1 reference + release notes, 2026-07). DM-uploaded
 * conversions are therefore still adjusted through the Google Ads
 * ConversionAdjustmentUploadService below, matched by order id — the
 * documented mechanism regardless of upload surface. The DM request status is
 * the one extra signal we have: a FAILED ingest means the conversion never
 * landed (nothing to adjust, terminal), and PROCESSING means an adjustment
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
    // Status lookup must never block a restatement from reaching Google.
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
    exact_target_net_value_cents: intent?.exactTargetNetValueCents ?? null,
    has_successful_purchase_upload: hasSuccessfulPurchaseUpload,
    ok: result?.ok ?? false,
    order_id: intakeId,
    refund_amount_cents: refundAmountCents,
    resolution_reason: status === "resolved_not_counted"
      ? classifyGoogleAdsAdjustmentError(error || result?.error || null)?.reason ||
        error || result?.error || "not_counted"
      : null,
    source,
    status,
    target_net_value_cents: intent?.targetNetValueCents ?? null,
    zero_value_floor_applied: intent?.exactTargetNetValueCents === 0,
    terminal: status === "terminal_failed",
    terminal_reason: status === "terminal_failed"
      ? classifyGoogleAdsAdjustmentError(error || result?.error || null)?.reason ?? null
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

type GoogleAdsAdjustmentReservation = {
  adjustmentDateTime: Date
  claimId: string
  leaseToken: string
}

async function reserveGoogleAdsConversionAdjustment(input: {
  intakeId: string
  intent: GoogleAdsConversionAdjustmentIntent
  adjustmentDateTime: Date
  source: GoogleAdsConversionAdjustmentSource
  supabase: SupabaseClient
}): Promise<{
  error: string | null
  reservation: GoogleAdsAdjustmentReservation | null
  state: string | null
}> {
  const { data, error } = await input.supabase.rpc(
    "reserve_google_ads_conversion_adjustment",
    {
      p_adjustment_type: input.intent.adjustmentType,
      p_adjustment_at: input.adjustmentDateTime.toISOString(),
      p_intake_id: input.intakeId,
      p_lease_seconds: 600,
      p_source: input.source,
      p_target_net_value_cents: input.intent.targetNetValueCents,
    },
  )
  if (error) {
    return {
      error: `Google Ads adjustment reservation failed: ${error.message}`,
      reservation: null,
      state: null,
    }
  }

  const result = (data ?? {}) as {
    claim_id?: unknown
    adjustment_at?: unknown
    lease_token?: unknown
    reserved?: unknown
    state?: unknown
  }
  if (result.reserved !== true) {
    return {
      error: null,
      reservation: null,
      state: typeof result.state === "string" ? result.state : null,
    }
  }
  const durableAdjustmentTime = typeof result.adjustment_at === "string"
    ? new Date(result.adjustment_at)
    : null
  if (
    typeof result.claim_id !== "string" ||
    typeof result.lease_token !== "string" ||
    !durableAdjustmentTime ||
    !Number.isFinite(durableAdjustmentTime.getTime())
  ) {
    return {
      error: "Google Ads adjustment reservation returned incomplete evidence",
      reservation: null,
      state: null,
    }
  }
  return {
    error: null,
    reservation: {
      adjustmentDateTime: durableAdjustmentTime,
      claimId: result.claim_id,
      leaseToken: result.lease_token,
    },
    state: "reserved",
  }
}

async function completeGoogleAdsConversionAdjustmentReservation(input: {
  error?: string | null
  outcome: "resolved_not_counted" | "retryable_failed" | "succeeded" | "terminal_failed" | "unknown_outcome"
  reservation: GoogleAdsAdjustmentReservation
  supabase: SupabaseClient
}): Promise<void> {
  const { data, error } = await input.supabase.rpc(
    "complete_google_ads_conversion_adjustment_claim",
    {
      p_claim_id: input.reservation.claimId,
      p_error: input.error ?? null,
      p_lease_token: input.reservation.leaseToken,
      p_outcome: input.outcome,
    },
  )
  if (error || data !== true) {
    log.error("Failed to complete Google Ads conversion adjustment reservation", {
      claimId: input.reservation.claimId,
      outcome: input.outcome,
    }, error ?? undefined)
  }
}

/**
 * Persist the exact desired value before a webhook is acknowledged. The
 * external upload remains in `after()`/cron, but a process exit cannot erase
 * the work item. Unknown in-flight outcomes block newer generations until an
 * operator reconciles Google.
 */
export async function queueExactGoogleAdsConversionAdjustment(input: {
  adjustmentDateTime: Date
  amountCents: number | null
  intakeId: string
  source: GoogleAdsConversionAdjustmentSource
  supabase: SupabaseClient
  targetNetValueCents: number
}): Promise<{ error: string | null; state: string | null }> {
  if (!shouldWriteGoogleAdsAdjustmentAudit()) {
    return { error: null, state: "skipped_local_dev" }
  }
  const intent = getGoogleAdsConversionAdjustmentIntent({
    amountCents: input.amountCents,
    paymentStatus: "paid",
    refundAmountCents: 0,
    targetNetValueCents: input.targetNetValueCents,
  })
  if (!intent || !Number.isFinite(input.adjustmentDateTime.getTime())) {
    return { error: "Google Ads exact desired state is invalid", state: null }
  }

  const { data, error } = await input.supabase.rpc(
    "queue_google_ads_conversion_adjustment",
    {
      p_adjustment_at: input.adjustmentDateTime.toISOString(),
      p_adjustment_type: intent.adjustmentType,
      p_intake_id: input.intakeId,
      p_source: input.source,
      p_target_net_value_cents: intent.targetNetValueCents,
    },
  )
  if (error) {
    return {
      error: `Google Ads desired-state queue failed: ${error.message}`,
      state: null,
    }
  }
  const result = (data ?? {}) as { state?: unknown }
  const state = typeof result.state === "string" ? result.state : null
  if (
    state === "blocked_in_progress" ||
    state === "blocked_unknown_outcome" ||
    state === "blocked_irreversible_zero" ||
    state === "unknown_outcome"
  ) {
    return {
      error: `Google Ads desired-state queue is blocked by ${state}`,
      state,
    }
  }
  return { error: null, state }
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
  targetNetValueCents,
}: {
  adjustmentDateTime?: Date
  amountCents: number | null
  intakeId: string
  paymentStatus: string
  refundAmountCents: number | null
  requestPath?: string | null
  source: GoogleAdsConversionAdjustmentSource
  supabase: SupabaseClient
  targetNetValueCents?: number | null
}): Promise<{
  attempted: boolean
  error?: string
  ok?: boolean
  status: GoogleAdsConversionAdjustmentStatus
}> {
  if (!shouldWriteGoogleAdsAdjustmentAudit()) {
    log.info("Skipping Google Ads conversion adjustment from local development runtime", {
      intakeId,
      source,
    })
    return { attempted: false, status: "skipped_local_dev" }
  }

  const intent = getGoogleAdsConversionAdjustmentIntent({
    amountCents,
    paymentStatus,
    refundAmountCents,
    targetNetValueCents,
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
  const claim = await reserveGoogleAdsConversionAdjustment({
    adjustmentDateTime: adjustmentDateTime ?? new Date(),
    intakeId,
    intent,
    source,
    supabase,
  })
  if (claim.error) {
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: "adjustment_reservation_unavailable",
      hasSuccessfulPurchaseUpload: Boolean(successfulUpload),
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "failed",
      successfulUpload,
      supabase,
    })
    log.error(claim.error, { intakeId, source })
    return {
      attempted: false,
      error: "adjustment_reservation_unavailable",
      status: "failed",
    }
  }
  if (!claim.reservation) {
    if (claim.state === "succeeded") {
      return { attempted: false, status: "skipped_already_adjusted" }
    }
    if (claim.state === "resolved_not_counted") {
      return { attempted: false, status: "resolved_not_counted" }
    }
    if (claim.state === "terminal_failed") {
      return { attempted: false, status: "skipped_terminal_error" }
    }
    if (claim.state === "unknown_outcome" || claim.state === "blocked_unknown_outcome") {
      return {
        attempted: false,
        error: "adjustment_outcome_unknown",
        status: "unknown_outcome",
      }
    }
    return { attempted: false, status: "skipped_in_progress" }
  }

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
    await completeGoogleAdsConversionAdjustmentReservation({
      error: "missing_successful_purchase_upload",
      // Absence of a successful upload audit is not proof that Google will
      // never count the purchase: payment finalization or the upload backfill
      // can still persist one after this refund/dispute run. Keep every target
      // retryable until positive external evidence proves it was not counted.
      outcome: "retryable_failed",
      reservation: claim.reservation,
      supabase,
    })
    return {
      attempted: false,
      error: "missing_successful_purchase_upload",
      status: "skipped_missing_successful_upload",
    }
  }

  const priorPostGraceNotFound = matchingPostGraceConversionNotFound(
    adjustmentAudits,
    intent,
    successfulUpload,
  )
  if (priorPostGraceNotFound) {
    const priorError = typeof priorPostGraceNotFound.metadata?.error_code === "string"
      ? priorPostGraceNotFound.metadata.error_code
      : CONVERSION_NOT_FOUND_TERMINAL_REASON
    await completeGoogleAdsConversionAdjustmentReservation({
      error: priorError,
      outcome: "resolved_not_counted",
      reservation: claim.reservation,
      supabase,
    })
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: priorError,
      hasSuccessfulPurchaseUpload: true,
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "resolved_not_counted",
      successfulUpload,
      supabase,
    })
    return { attempted: false, status: "resolved_not_counted" }
  }

  const dmPreflight = await checkDataManagerUploadForAdjustment(successfulUpload)
  if (dmPreflight === "rejected") {
    await completeGoogleAdsConversionAdjustmentReservation({
      error: DM_REQUEST_REJECTED_ERROR,
      outcome: "resolved_not_counted",
      reservation: claim.reservation,
      supabase,
    })
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: DM_REQUEST_REJECTED_ERROR,
      hasSuccessfulPurchaseUpload: true,
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "resolved_not_counted",
      successfulUpload,
      supabase,
    })
    // No alarm here: a rejected ingest means the conversion never landed in
    // Google Ads, so the refunded order was never counted to begin with.
    return {
      attempted: false,
      error: DM_REQUEST_REJECTED_ERROR,
      status: "resolved_not_counted",
    }
  }
  if (dmPreflight === "processing") {
    await completeGoogleAdsConversionAdjustmentReservation({
      error: DM_REQUEST_PROCESSING_ERROR,
      outcome: "retryable_failed",
      reservation: claim.reservation,
      supabase,
    })
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

  let result: GoogleAdsConversionUploadResult
  try {
    result = await fireGoogleAdsConversionAdjustment({
      adjustedValue: intent.adjustedValue,
      adjustmentDateTime: claim.reservation.adjustmentDateTime,
      adjustmentType: intent.adjustmentType,
      orderId: intakeId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "google_ads_adjustment_threw"
    await completeGoogleAdsConversionAdjustmentReservation({
      error: message,
      outcome: "unknown_outcome",
      reservation: claim.reservation,
      supabase,
    })
    await recordGoogleAdsConversionAdjustmentAudit({
      amountCents,
      error: message,
      hasSuccessfulPurchaseUpload: true,
      intakeId,
      intent,
      refundAmountCents,
      requestPath,
      source,
      status: "unknown_outcome",
      successfulUpload,
      supabase,
    })
    return { attempted: true, error: message, status: "unknown_outcome" }
  }
  const uploadPastGrace = isUploadPastConversionMatchGrace(successfulUpload)
  const errorDisposition = classifyGoogleAdsAdjustmentError(result.error)
  let status: GoogleAdsConversionAdjustmentStatus = "failed"
  if (result.ok) {
    status = "success"
  } else if (result.unknownOutcome) {
    status = "unknown_outcome"
  } else if (errorDisposition?.kind === "not_found") {
    status = uploadPastGrace ? "resolved_not_counted" : "failed"
  } else if (errorDisposition?.kind === "terminal") {
    status = "terminal_failed"
  } else if (errorDisposition?.kind === "unknown") {
    status = "unknown_outcome"
  }

  await completeGoogleAdsConversionAdjustmentReservation({
    error: result.error,
    outcome: status === "success"
      ? "succeeded"
      : status === "resolved_not_counted"
        ? "resolved_not_counted"
        : status === "terminal_failed"
          ? "terminal_failed"
          : status === "unknown_outcome"
            ? "unknown_outcome"
          : "retryable_failed",
    reservation: claim.reservation,
    supabase,
  })

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

  return {
    attempted: result.attempted,
    error: result.error,
    ok: result.ok,
    status,
  }
}
