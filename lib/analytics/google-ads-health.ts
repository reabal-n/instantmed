import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  type GoogleAdsConversionActionPreflightResult,
  preflightGoogleAdsPurchaseConversionAction,
} from "@/lib/analytics/google-ads-conversion-api"
import {
  GOOGLE_ADS_ATTRIBUTION_SELECT,
  GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION,
  type GoogleAdsAttributionRow,
  hasGoogleClickId,
  isLikelyGoogleAttributed,
  isNonRetryableGoogleAdsConversionError,
} from "@/lib/analytics/google-ads-post-payment"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"

const DEFAULT_LOOKBACK_DAYS = 90

export type GoogleAdsConfigurationIssueCode =
  | "conversion_action_not_enabled"
  | "conversion_action_not_found"
  | "conversion_action_preflight_failed"
  | "invalid_conversion_action_type"
  | "missing_env"
  | "missing_click_id_coverage"
  | "no_access_token"
  | null

export interface GoogleAdsConfigurationDiagnosis {
  action: string
  code: GoogleAdsConfigurationIssueCode
  detail: string
  label: string
  severity: "ok" | "warning" | "error"
}

type GoogleAdsCandidateRow = GoogleAdsAttributionRow & {
  id: string
  paid_at: string | null
}

type GoogleAdsUploadAuditRow = {
  intake_id: string | null
  created_at: string
  metadata: {
    error_code?: string | null
    status?: string | null
  } | null
}

export interface GoogleAdsHealth {
  captured: number
  clickIdCoveragePercent: number
  configuration: GoogleAdsConfigurationDiagnosis
  uploaded: number
  uploadable: number
  skipped: number
  failed: number
  missingUpload: number
  candidatesWithClickId: number
  candidatesMissingClickId: number
  latestErrorCode: string | null
  latestErrorAt: string | null
  lastSuccessfulUploadAt: string | null
  retryPaused: number
  lookbackDays: number
}

const OK_CONFIGURATION: GoogleAdsConfigurationDiagnosis = {
  action: "No action needed.",
  code: null,
  detail: "No blocking Google Ads upload issue is visible in the current lookback window.",
  label: "Configuration looks healthy",
  severity: "ok",
}

export const EMPTY_GOOGLE_ADS_HEALTH: GoogleAdsHealth = {
  captured: 0,
  clickIdCoveragePercent: 0,
  configuration: {
    action: "No action needed until Google Ads traffic is captured.",
    code: null,
    detail: "No paid Google-attributed intakes are visible in the current lookback window.",
    label: "No Google Ads signal yet",
    severity: "ok",
  },
  uploaded: 0,
  uploadable: 0,
  skipped: 0,
  failed: 0,
  missingUpload: 0,
  candidatesWithClickId: 0,
  candidatesMissingClickId: 0,
  latestErrorCode: null,
  latestErrorAt: null,
  lastSuccessfulUploadAt: null,
  retryPaused: 0,
  lookbackDays: DEFAULT_LOOKBACK_DAYS,
}

function latestAuditByIntake(rows: GoogleAdsUploadAuditRow[]): Map<string, GoogleAdsUploadAuditRow> {
  const latest = new Map<string, GoogleAdsUploadAuditRow>()

  for (const row of rows) {
    if (row.intake_id && !latest.has(row.intake_id)) {
      latest.set(row.intake_id, row)
    }
  }

  return latest
}

function getUploadStatus(row: GoogleAdsUploadAuditRow | undefined): string | null {
  return row?.metadata?.status?.trim() || null
}

function buildConfigurationDiagnosis({
  candidatesMissingClickId,
  captured,
  conversionActionPreflight,
  latestErrorCode,
  latestStatus,
}: {
  candidatesMissingClickId: number
  captured: number
  conversionActionPreflight?: GoogleAdsConversionActionPreflightResult | null
  latestErrorCode: string | null
  latestStatus: string | null
}): GoogleAdsConfigurationDiagnosis {
  if (latestErrorCode?.includes("INVALID_CONVERSION_ACTION_TYPE")) {
    return {
      action: "Use an offline click-import purchase conversion action with type UPLOAD_CLICKS, then re-run the backfill.",
      code: "invalid_conversion_action_type",
      detail: "Google accepted the request shape but rejected the configured conversion action type.",
      label: "Wrong conversion action type",
      severity: "error",
    }
  }

  if (latestStatus === "skipped_missing_env") {
    return {
      action: "Set the required Google Ads OAuth, developer token, customer id, and conversion action env vars in production.",
      code: "missing_env",
      detail: "A paid Google-attributed intake was captured, but upload was skipped because required env vars were missing.",
      label: "Missing Google Ads env",
      severity: "error",
    }
  }

  if (latestStatus === "skipped_no_access_token") {
    return {
      action: "Regenerate the Google Ads OAuth refresh token and confirm the account can mint access tokens.",
      code: "no_access_token",
      detail: "Upload could not start because the server could not obtain a Google Ads access token.",
      label: "OAuth token unavailable",
      severity: "error",
    }
  }

  if (conversionActionPreflight && conversionActionPreflight.severity !== "ok") {
    return {
      action: conversionActionPreflight.action,
      code: conversionActionPreflight.code,
      detail: conversionActionPreflight.detail,
      label: conversionActionPreflight.label,
      severity: conversionActionPreflight.severity,
    }
  }

  if (captured > 0 && candidatesMissingClickId > 0) {
    return {
      action: "Confirm landing pages preserve gclid, gbraid, and wbraid through the intake and Stripe redirect.",
      code: "missing_click_id_coverage",
      detail: "Some paid Google-attributed intakes have ValueTrack signals but no uploadable click identifier.",
      label: "Click ID coverage gap",
      severity: "warning",
    }
  }

  return OK_CONFIGURATION
}

export function buildGoogleAdsHealth({
  audits,
  candidates,
  conversionActionPreflight = null,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
}: {
  audits: GoogleAdsUploadAuditRow[]
  candidates: GoogleAdsCandidateRow[]
  conversionActionPreflight?: GoogleAdsConversionActionPreflightResult | null
  lookbackDays?: number
}): GoogleAdsHealth {
  const latest = latestAuditByIntake(audits)
  let uploaded = 0
  let skipped = 0
  let failed = 0
  let missingUpload = 0
  let retryPaused = 0
  let latestStatus: string | null = null

  for (const candidate of candidates) {
    const latestAudit = latest.get(candidate.id)
    const status = getUploadStatus(latestAudit)
    const errorCode = latestAudit?.metadata?.error_code || null

    if (!latestAudit) {
      missingUpload += 1
    } else if (status === "success") {
      uploaded += 1
    } else if (status?.startsWith("skipped")) {
      skipped += 1
    } else {
      failed += 1
    }

    if (isNonRetryableGoogleAdsConversionError(errorCode)) {
      retryPaused += 1
    }
  }

  const latestError = audits.find((row) => row.metadata?.error_code)
  const lastSuccess = audits.find((row) => row.metadata?.status === "success")
  latestStatus = getUploadStatus(audits[0])
  const candidatesWithClickId = candidates.filter(hasGoogleClickId).length
  const candidatesMissingClickId = candidates.length - candidatesWithClickId
  const latestErrorCode = latestError?.metadata?.error_code || null

  return {
    captured: candidates.length,
    clickIdCoveragePercent: candidates.length > 0
      ? Math.round((candidatesWithClickId / candidates.length) * 100)
      : 0,
    configuration: buildConfigurationDiagnosis({
      candidatesMissingClickId,
      captured: candidates.length,
      conversionActionPreflight,
      latestErrorCode,
      latestStatus,
    }),
    uploaded,
    uploadable: candidatesWithClickId,
    skipped,
    failed,
    missingUpload,
    candidatesWithClickId,
    candidatesMissingClickId,
    latestErrorCode,
    latestErrorAt: latestError?.created_at || null,
    lastSuccessfulUploadAt: lastSuccess?.created_at || null,
    retryPaused,
    lookbackDays,
  }
}

export async function getGoogleAdsHealth(
  supabase: SupabaseClient,
  options: { lookbackDays?: number } = {},
): Promise<GoogleAdsHealth> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  const candidateQuery = supabase
    .from("intakes")
    .select(`id, paid_at, ${GOOGLE_ADS_ATTRIBUTION_SELECT}`)
    .eq("payment_status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", since)
    .order("paid_at", { ascending: false })
    .limit(1000)

  const [{ data, error }, conversionActionPreflight] = await Promise.all([
    filterReportableIntakes(candidateQuery),
    preflightGoogleAdsPurchaseConversionAction(),
  ])

  if (error) {
    throw new Error(`Google Ads health candidate query failed: ${error.message}`)
  }

  const candidates = ((data || []) as GoogleAdsCandidateRow[]).filter(isLikelyGoogleAttributed)
  const candidateIds = candidates.map((candidate) => candidate.id)

  if (candidateIds.length === 0) {
    return buildGoogleAdsHealth({
      audits: [],
      candidates: [],
      conversionActionPreflight,
      lookbackDays,
    })
  }

  const { data: audits, error: auditError } = await supabase
    .from("audit_logs")
    .select("intake_id, created_at, metadata")
    .eq("action", GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION)
    .in("intake_id", candidateIds)
    .order("created_at", { ascending: false })

  if (auditError) {
    throw new Error(`Google Ads health audit query failed: ${auditError.message}`)
  }

  return buildGoogleAdsHealth({
    audits: (audits || []) as GoogleAdsUploadAuditRow[],
    candidates,
    conversionActionPreflight,
    lookbackDays,
  })
}
