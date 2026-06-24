import "server-only"

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import { reportGoogleAdsConversionFailure } from "@/lib/analytics/google-ads-conversion-alarm"
import {
  fireGoogleAdsPurchaseConversion,
  type GoogleAdsConversionUploadResult,
  type GoogleAdsEnhancedUserData,
  hashEmailForGoogleAds,
  hashPhoneForGoogleAds,
} from "@/lib/analytics/google-ads-conversion-api"
import {
  hasGoogleAdsUploadClickId,
  isNonRetryableGoogleAdsUploadError,
} from "@/lib/analytics/google-ads-upload-audit"
import { getPostHogBaselineProperties, getPostHogClient } from "@/lib/analytics/posthog-server"
import { createLogger } from "@/lib/observability/logger"
import { decryptField } from "@/lib/security/encryption"
import { sanitizeAuditMetadata } from "@/lib/security/sanitize-audit"

const log = createLogger("google-ads-post-payment")

export const GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION = "google_ads_conversion_upload"

export const GOOGLE_ADS_ATTRIBUTION_SELECT =
  "utm_source, utm_medium, utm_id, utm_campaign, utm_content, utm_term, referrer, landing_page, attribution_captured_at, category, subtype, gclid, gbraid, wbraid, campaignid, adgroupid, keyword, creative, matchtype, device, network, amount_cents"

export type GoogleAdsAttributionRow = {
  adgroupid?: string | null
  amount_cents?: number | null
  attribution_captured_at?: string | null
  campaignid?: string | null
  category?: string | null
  creative?: string | null
  device?: string | null
  gbraid?: string | null
  gclid?: string | null
  keyword?: string | null
  landing_page?: string | null
  matchtype?: string | null
  network?: string | null
  referrer?: string | null
  subtype?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_id?: string | null
  utm_medium?: string | null
  utm_source?: string | null
  utm_term?: string | null
  wbraid?: string | null
}

export type GoogleAdsConversionSource =
  | "checkout_session_completed"
  | "checkout_session_async_payment_succeeded"
  | "cron_backfill"

type GoogleAdsConversionStatus =
  | "success"
  | "failed"
  | "skipped_disabled"
  | "skipped_missing_click_id"
  | "skipped_missing_env"
  | "skipped_no_access_token"

function clean(value?: string | null): string {
  return value?.trim() ?? ""
}

export function hasGoogleClickId(row: GoogleAdsAttributionRow): boolean {
  return hasGoogleAdsUploadClickId(row)
}

export function isLikelyGoogleAttributed(row: GoogleAdsAttributionRow): boolean {
  const tokens = [
    row.utm_source,
    row.utm_medium,
    row.utm_campaign,
    row.referrer,
    row.campaignid,
    row.adgroupid,
    row.creative,
    row.network,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return (
    hasGoogleClickId(row) ||
    Boolean(
      clean(row.campaignid) ||
        clean(row.adgroupid) ||
        clean(row.keyword) ||
        clean(row.creative) ||
        clean(row.matchtype) ||
        clean(row.device) ||
        clean(row.network),
    ) ||
    tokens.includes("google") ||
    tokens.includes("adwords") ||
    tokens.includes("cpc") ||
    tokens.includes("paid_search") ||
    tokens.includes("doubleclick")
  )
}

export function isNonRetryableGoogleAdsConversionError(errorCode?: string | null): boolean {
  return isNonRetryableGoogleAdsUploadError(errorCode)
}

function statusFromResult(result: {
  attempted: boolean
  ok?: boolean
  error?: string
}): GoogleAdsConversionStatus {
  if (result.ok) return "success"
  if (result.error === "missing_env") return "skipped_missing_env"
  if (result.error === "no_access_token") return "skipped_no_access_token"
  if (result.error === "missing_click_id") return "skipped_missing_click_id"
  return result.attempted ? "failed" : "failed"
}

async function recordGoogleAdsConversionAudit({
  amountCents,
  error,
  hasUserData,
  intakeId,
  result,
  row,
  source,
  status,
  supabase,
}: {
  amountCents: number | null
  error?: string | null
  hasUserData: boolean
  intakeId: string
  result: GoogleAdsConversionUploadResult
  row: GoogleAdsAttributionRow
  source: GoogleAdsConversionSource
  status: GoogleAdsConversionStatus
  supabase: SupabaseClient
}) {
  const metadata = sanitizeAuditMetadata({
    action_type: GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION,
    amount_cents: amountCents,
    attempted: result.attempted,
    campaignid: row.campaignid || null,
    adgroupid: row.adgroupid || null,
    creative: row.creative || null,
    currency: "AUD",
    device: row.device || null,
    error_code: error || null,
    has_gbraid: Boolean(row.gbraid),
    has_gclid: Boolean(row.gclid),
    has_user_data: hasUserData,
    has_wbraid: Boolean(row.wbraid),
    matchtype: row.matchtype || null,
    matching_model: "click_or_user_data",
    network: row.network || null,
    ok: result.ok ?? false,
    order_id: intakeId,
    upload_job_id: result.jobId ?? null,
    service_type: row.category || null,
    service_slug: row.subtype || row.category || null,
    source,
    status,
  })

  const { error: auditError } = await supabase.from("audit_logs").insert({
    action: GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION,
    actor_type: "system",
    intake_id: intakeId,
    metadata,
    created_at: new Date().toISOString(),
  })

  if (auditError) {
    log.warn("Failed to record Google Ads conversion audit row", {
      error: auditError.message,
      intakeId,
      status,
    })
  }
}

function trackGoogleAdsPostHogEvent({
  amountCents,
  error,
  hasUserData,
  intakeId,
  posthogDistinctId,
  result,
  row,
  source,
  status,
}: {
  amountCents: number | null
  error?: string | null
  hasUserData: boolean
  intakeId: string
  posthogDistinctId: string
  result: GoogleAdsConversionUploadResult
  row: GoogleAdsAttributionRow
  source: GoogleAdsConversionSource
  status: GoogleAdsConversionStatus
}) {
  try {
    const posthog = getPostHogClient()
    const attemptInsertId = [
      "google_ads_server_conversion_attempt",
      intakeId,
      source,
      status,
      error || "no_error",
    ].join(":")
    const successInsertId = ["google_ads_server_conversion", intakeId].join(":")
    const properties = {
      ...getPostHogBaselineProperties(),
      $insert_id: attemptInsertId,
      adgroupid: row.adgroupid || null,
      amount_cents: amountCents,
      attempted: result.attempted,
      campaignid: row.campaignid || null,
      creative: row.creative || null,
      device: row.device || null,
      error: error || null,
      has_gbraid: Boolean(row.gbraid),
      has_gclid: Boolean(row.gclid),
      has_user_data: hasUserData,
      has_wbraid: Boolean(row.wbraid),
      intake_id: intakeId,
      keyword: row.keyword || null,
      likely_google_attributed: isLikelyGoogleAttributed(row),
      matchtype: row.matchtype || null,
      network: row.network || null,
      ok: result.ok ?? false,
      service_category: row.category || null,
      source,
      status,
      upload_job_id: result.jobId ?? null,
    }

    posthog.capture({
      distinctId: posthogDistinctId,
      event: "google_ads_server_conversion_attempt",
      properties,
    })

    if (status === "success") {
      posthog.capture({
        distinctId: posthogDistinctId,
        event: "google_ads_server_conversion",
        properties: {
          ...properties,
          $insert_id: successInsertId,
        },
      })
    }
  } catch {
    // Analytics must never block Stripe webhook completion.
  }
}

/**
 * Resolve the patient's plaintext email + phone for enhanced conversions from
 * their profile (email is stored plaintext; phone is field-level encrypted).
 * Resilient by design — any failure returns `{}` so a conversion upload is
 * never blocked by an identity lookup. Raw values are hashed downstream and
 * never logged. Powers both the live webhook and the cron-backfill paths.
 */
async function resolveEnhancedUserData(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<GoogleAdsEnhancedUserData> {
  try {
    const { data: intake } = await supabase
      .from("intakes")
      .select("patient_id")
      .eq("id", intakeId)
      .maybeSingle()
    const patientId = (intake as { patient_id?: string | null } | null)?.patient_id
    if (!patientId) return {}

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone_encrypted")
      .eq("id", patientId)
      .maybeSingle()
    if (!profile) return {}

    const profileRow = profile as { email?: string | null; phone_encrypted?: string | null }
    const email = profileRow.email?.trim() ? profileRow.email : null

    let phone: string | null = null
    if (profileRow.phone_encrypted) {
      try {
        const decrypted = decryptField<string>(profileRow.phone_encrypted)
        phone = typeof decrypted === "string" && decrypted.trim() ? decrypted : null
      } catch {
        phone = null
      }
    }

    return { email, phone }
  } catch {
    return {}
  }
}

export async function runGoogleAdsPostPaymentAttribution({
  amountCents,
  intakeId,
  posthogDistinctId,
  row,
  source,
  supabase,
  userData,
}: {
  amountCents?: number | null
  intakeId: string
  posthogDistinctId: string
  row: GoogleAdsAttributionRow
  source: GoogleAdsConversionSource
  supabase: SupabaseClient
  /**
   * Raw (un-hashed) first-party customer data for enhanced conversions —
   * pass the email the customer checked out with (Stripe `customer_details`).
   * Hashed inside the Conversion API client before leaving the server.
   */
  userData?: GoogleAdsEnhancedUserData | null
}): Promise<{
  attempted: boolean
  ok?: boolean
  status?: GoogleAdsConversionStatus
  error?: string
  jobId?: number | string
}> {
  const resolvedAmountCents =
    typeof amountCents === "number"
      ? amountCents
      : typeof row.amount_cents === "number"
        ? row.amount_cents
        : null

  // Enhanced conversions: attach hashed first-party data (email + phone) to the
  // upload for higher match rates than gclid alone. Independent kill switch from
  // the server-conversion one below — set GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED=true
  // to fall back to gclid-only matching WITHOUT disabling server uploads. Values
  // are normalized + SHA-256 hashed inside the Conversion API client; raw
  // email/phone never leave the server, and only `has_user_data` (a boolean) is logged.
  const enhancedConversionsDisabled =
    process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED === "true"

  // Operator kill switch. Set GOOGLE_ADS_SERVER_CONVERSION_DISABLED=true
  // in Vercel env to disable server-side Conversion API uploads entirely.
  //
  // When to use: the conversion action that `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE`
  // points at is the wrong TYPE (INVALID_CONVERSION_ACTION_TYPE errors in
  // audit_logs), or when GA4 → Ads native attribution is the canonical
  // source of truth and you don't need the server-side belt-and-braces.
  //
  // This kill switch does NOT stop client-side gtag fires (those go via
  // lib/analytics/conversion-tracking.ts and remain the primary
  // attribution path for browser-side conversions). It only short-circuits
  // the server-side Conversion API upload that runs after Stripe webhooks.
  //
  // Flip back to false (or unset) once a proper UPLOAD_CLICKS conversion
  // action exists in Google Ads and GOOGLE_ADS_CONVERSION_ACTION_PURCHASE
  // points at its numeric ID.
  if (process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED === "true") {
    const result = { attempted: false, ok: false, error: "server_disabled" }
    const status = "skipped_disabled"

    await recordGoogleAdsConversionAudit({
      amountCents: resolvedAmountCents,
      error: result.error,
      hasUserData: false,
      intakeId,
      result,
      row,
      source,
      status,
      supabase,
    })

    trackGoogleAdsPostHogEvent({
      amountCents: resolvedAmountCents,
      error: result.error,
      hasUserData: false,
      intakeId,
      posthogDistinctId,
      result,
      row,
      source,
      status,
    })

    return {
      attempted: false,
      ok: false,
      status,
      error: result.error,
    }
  }

  const enhancedUserData = enhancedConversionsDisabled
    ? null
    : (userData ?? (await resolveEnhancedUserData(supabase, intakeId)))
  const hasUserData = Boolean(
    hashEmailForGoogleAds(enhancedUserData?.email) ||
      hashPhoneForGoogleAds(enhancedUserData?.phone),
  )
  const hasClickId = hasGoogleClickId(row)
  const likelyGoogleAttributed = isLikelyGoogleAttributed(row)

  if (!likelyGoogleAttributed && !hasUserData) return { attempted: false }

  let result: GoogleAdsConversionUploadResult
  if (hasClickId || hasUserData) {
    result = await fireGoogleAdsPurchaseConversion({
      orderId: intakeId,
      gclid: row.gclid,
      gbraid: row.gbraid,
      wbraid: row.wbraid,
      value: resolvedAmountCents != null ? resolvedAmountCents / 100 : 0,
      ...(hasUserData ? { userData: enhancedUserData } : {}),
    })
  } else {
    result = { attempted: false, ok: false, error: "missing_click_id" }
  }

  const status = statusFromResult(result)
  const error = result.error || null

  await recordGoogleAdsConversionAudit({
    amountCents: resolvedAmountCents,
    error,
    hasUserData,
    intakeId,
    result,
    row,
    source,
    status,
    supabase,
  })

  trackGoogleAdsPostHogEvent({
    amountCents: resolvedAmountCents,
    error,
    hasUserData,
    intakeId,
    posthogDistinctId,
    result,
    row,
    source,
    status,
  })

  if (status !== "success") {
    Sentry.captureMessage("Google Ads conversion upload did not succeed", {
      level: status === "skipped_missing_click_id" ? "warning" : "error",
      tags: {
        google_ads_conversion_status: status,
        source,
      },
      extra: {
        intakeId,
        attempted: result.attempted,
        error,
        has_gclid: Boolean(row.gclid),
        has_gbraid: Boolean(row.gbraid),
        has_wbraid: Boolean(row.wbraid),
        has_valuetrack: Boolean(row.campaignid || row.adgroupid || row.creative),
      },
    })

    // The webhook path never preflights, so a misconfigured conversion action
    // (NO_CONVERSION_ACTION_FOUND) surfaces here. Escalate config-class failures
    // to a fatal, fingerprinted alarm — one alert per config break, not one per
    // failed upload. Transient errors return false and keep the warn/error above.
    await reportGoogleAdsConversionFailure({
      source: "upload",
      uploadErrorCode: error,
      intakeId,
    })
  }

  return {
    attempted: result.attempted,
    ok: result.ok,
    status,
    error: result.error,
    jobId: result.jobId,
  }
}
