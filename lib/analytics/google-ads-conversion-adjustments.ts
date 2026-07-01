import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  fireGoogleAdsConversionAdjustment,
  type GoogleAdsConversionAdjustmentType,
  type GoogleAdsConversionUploadResult,
} from "@/lib/analytics/google-ads-conversion-api"
import { GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION } from "@/lib/analytics/google-ads-post-payment"
import { createLogger } from "@/lib/observability/logger"
import { sanitizeAuditMetadata } from "@/lib/security/sanitize-audit"

const log = createLogger("google-ads-conversion-adjustments")

export const GOOGLE_ADS_CONVERSION_ADJUSTMENT_AUDIT_ACTION = "google_ads_conversion_adjustment"

type GoogleAdsConversionAdjustmentSource =
  | "cron_backfill"
  | "stripe_charge_dispute_created"
  | "stripe_charge_refunded"

type GoogleAdsConversionAdjustmentStatus =
  | "failed"
  | "skipped_already_adjusted"
  | "skipped_invalid_adjustment"
  | "skipped_local_dev"
  | "skipped_missing_successful_upload"
  | "skipped_no_adjustment"
  | "success"

type GoogleAdsConversionAdjustmentAuditRow = {
  action?: string | null
  created_at?: string | null
  intake_id?: string | null
  metadata?: {
    adjustment_type?: string | null
    status?: string | null
    target_net_value_cents?: number | null
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
    return {
      attempted: false,
      error: "missing_successful_purchase_upload",
      status: "skipped_missing_successful_upload",
    }
  }

  if (hasMatchingSuccessfulAdjustment(adjustmentAudits, intent)) {
    return { attempted: false, status: "skipped_already_adjusted" }
  }

  const result = await fireGoogleAdsConversionAdjustment({
    adjustedValue: intent.adjustedValue,
    adjustmentDateTime,
    adjustmentType: intent.adjustmentType,
    orderId: intakeId,
  })
  const status: GoogleAdsConversionAdjustmentStatus = result.ok ? "success" : "failed"

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
