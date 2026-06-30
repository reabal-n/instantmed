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
  isLikelyGoogleAttributed,
} from "@/lib/analytics/google-ads-post-payment"
import {
  bestGoogleAdsUploadAuditByIntake,
  type GoogleAdsUploadAuditRow,
  type GoogleAdsUploadFailureSummary,
  hasGoogleAdsUploadClickId,
  isNonRetryableGoogleAdsUploadError,
  summarizeGoogleAdsUploadFailures,
} from "@/lib/analytics/google-ads-upload-audit"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  GOOGLE_ADS_UPLOAD_STREAM_STALL_DAYS,
  type GoogleAdsUploadStreamHealth,
} from "@/lib/monitoring/google-ads-purchase-import-health"

const DEFAULT_LOOKBACK_DAYS = 90
const GOOGLE_ADS_HEALTH_PAYMENT_STATUSES = ["paid", "partially_refunded", "refunded"] as const

function auditTimestampMs(row: GoogleAdsUploadAuditRow): number {
  return row.created_at ? Date.parse(row.created_at) : 0
}

export type GoogleAdsConfigurationIssueCode =
  | "conversion_action_not_enabled"
  | "conversion_action_not_found"
  | "conversion_action_preflight_failed"
  | "invalid_conversion_action_type"
  | "missing_env"
  | "missing_click_id_coverage"
  | "no_access_token"
  | "server_disabled"
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

  if (latestStatus === "skipped_disabled") {
    return {
      action: "Remove GOOGLE_ADS_SERVER_CONVERSION_DISABLED only after the offline purchase conversion action validates.",
      code: "server_disabled",
      detail: "A paid Google-attributed intake was captured, but server-side upload was intentionally disabled.",
      label: "Server uploads disabled",
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
  const best = bestGoogleAdsUploadAuditByIntake(audits)
  let uploaded = 0
  let skipped = 0
  let failed = 0
  let missingUpload = 0
  let retryPaused = 0
  let latestStatus: string | null = null

  for (const candidate of candidates) {
    const bestAudit = best.get(candidate.id)
    const status = getUploadStatus(bestAudit)
    const errorCode = bestAudit?.metadata?.error_code || null

    if (!bestAudit) {
      missingUpload += 1
    } else if (status === "success") {
      uploaded += 1
    } else if (status?.startsWith("skipped")) {
      skipped += 1
    } else {
      failed += 1
    }

    if (isNonRetryableGoogleAdsUploadError(errorCode)) {
      retryPaused += 1
    }
  }

  const currentAudits = Array.from(best.values())
    .sort((a, b) => auditTimestampMs(b) - auditTimestampMs(a))
  const latestError = currentAudits.find((row) => row.metadata?.error_code)
  const lastSuccess = currentAudits.find((row) => row.metadata?.status === "success")
  latestStatus = getUploadStatus(currentAudits[0])
  const candidatesWithClickId = candidates.filter(hasGoogleAdsUploadClickId).length
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

export type GoogleAdsConversionUploadHealthCounter = GoogleAdsUploadFailureSummary & {
  queryFailed: boolean
  lookbackDays: number
}

/**
 * Lightweight DB-only counter of failed server-side conversion uploads in the
 * recent window, for the /admin/ops "Google Ads conversions" card. Unlike
 * getGoogleAdsHealth this makes NO live Google Ads API preflight call, so it is
 * safe on a frequently-rendered ops page. Fail-soft: a query error returns a
 * zeroed counter (with queryFailed=true) rather than throwing the whole page.
 */
export async function getGoogleAdsConversionUploadHealth(
  supabase: SupabaseClient,
  options: { lookbackDays?: number } = {},
): Promise<GoogleAdsConversionUploadHealthCounter> {
  const lookbackDays = options.lookbackDays ?? 7
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  const emptyCounter = {
    failed: 0,
    configSkipped: 0,
    notReaching: 0,
    total: 0,
    latestErrorCode: null,
    latestFailedAt: null,
    lookbackDays,
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("intake_id, created_at, metadata")
    .eq("action", GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000)

  if (error) {
    return { ...emptyCounter, queryFailed: true }
  }

  const rows = (data || []) as GoogleAdsUploadAuditRow[]

  // Exclude CI / E2E test runs from the production health signal. Real prod
  // uploads run on Vercel (metadata.runtime_source 'vercel'); CI E2E checkouts
  // run on node (no Google Ads env → `missing_env`) yet land in prod audit_logs
  // because CI shares the prod Supabase service-role key. Without this, a stray
  // CI `missing_env` row flips this /admin/ops card to a false "missing env"
  // config error. Legacy rows without the fingerprint are treated as prod.
  const prodRows = rows.filter(
    (r) => (r.metadata as { runtime_source?: string } | null)?.runtime_source !== "node",
  )

  // Constrain to REPORTABLE intakes only — a seeded/E2E or excluded intake with
  // a failed upload row must not surface as a critical production conversion
  // leak on /admin/ops. Mirrors the filterReportableIntakes() boundary the
  // heavier getGoogleAdsHealth path applies. Fail-soft: if this lookup errors,
  // fall back to the unfiltered rows rather than throwing the ops page.
  let reportableRows = prodRows
  const intakeIds = [...new Set(prodRows.map((r) => r.intake_id).filter((id): id is string => Boolean(id)))]
  if (intakeIds.length > 0) {
    const { data: reportable, error: reportableError } = await filterReportableIntakes(
      supabase.from("intakes").select("id").in("id", intakeIds),
    )
    if (!reportableError && reportable) {
      const reportableIds = new Set((reportable as Array<{ id: string }>).map((r) => r.id))
      reportableRows = prodRows.filter((r) => r.intake_id != null && reportableIds.has(r.intake_id))
    }
  }

  const summary = summarizeGoogleAdsUploadFailures(reportableRows)
  return { ...summary, queryFailed: false, lookbackDays }
}

/**
 * Upload-stream health for the stall detector (business-alerts cron). Counts
 * successful PROD server-side conversion uploads against ALL reportable paid
 * orders in the window — the denominator the reporting-side
 * `purchase_imports_zero` alert cannot use (it is gated on click-id orders, so a
 * Data-Manager enhanced-conversions-only stream is invisible to it). Fail-soft:
 * a query error returns queryFailed=true so the alert builder never pages on a
 * transient DB blip. Mirrors getGoogleAdsConversionUploadHealth's prod-row
 * filter (runtime_source !== "node" drops local-dev / CI noise).
 */
export async function getGoogleAdsUploadStreamHealth(
  supabase: SupabaseClient,
  options: { lookbackDays?: number; now?: Date } = {},
): Promise<GoogleAdsUploadStreamHealth> {
  const lookbackDays = options.lookbackDays ?? GOOGLE_ADS_UPLOAD_STREAM_STALL_DAYS
  const now = options.now ?? new Date()
  const since = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
  const generatedAt = now.toISOString()

  const empty: GoogleAdsUploadStreamHealth = {
    dataManagerSuccesses: 0,
    generatedAt,
    lastSuccessfulUploadAt: null,
    legacySuccesses: 0,
    lookbackDays,
    paidOrders: 0,
    queryFailed: false,
    successfulUploads: 0,
  }

  const { count: paidCount, error: paidError } = await filterReportableIntakes(
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("payment_status", [...GOOGLE_ADS_HEALTH_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", since),
  )
  if (paidError) return { ...empty, queryFailed: true }

  const paidOrders = paidCount ?? 0

  const { data, error } = await supabase
    .from("audit_logs")
    .select("intake_id, created_at, metadata")
    .eq("action", GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000)
  if (error) return { ...empty, paidOrders, queryFailed: true }

  // Prod-only rows (drop local-dev / CI `node` noise) — same boundary as
  // getGoogleAdsConversionUploadHealth so a stalled-stream check is never
  // satisfied by a dev success row, nor falsely tripped by dev noise.
  const prodRows = ((data || []) as GoogleAdsUploadAuditRow[]).filter(
    (r) => (r.metadata as { runtime_source?: string } | null)?.runtime_source !== "node",
  )

  const best = bestGoogleAdsUploadAuditByIntake(prodRows)
  let successfulUploads = 0
  let dataManagerSuccesses = 0
  let legacySuccesses = 0
  let lastSuccessfulUploadAt: string | null = null
  let lastSuccessMs = -1

  for (const audit of best.values()) {
    if (audit.metadata?.status !== "success") continue
    successfulUploads += 1
    const uploadApi = (audit.metadata as { upload_api?: string | null } | null)?.upload_api
    if (uploadApi === "data_manager_api") dataManagerSuccesses += 1
    else legacySuccesses += 1
    const at = auditTimestampMs(audit)
    if (at > lastSuccessMs) {
      lastSuccessMs = at
      lastSuccessfulUploadAt = audit.created_at ?? null
    }
  }

  return {
    dataManagerSuccesses,
    generatedAt,
    lastSuccessfulUploadAt,
    legacySuccesses,
    lookbackDays,
    paidOrders,
    queryFailed: false,
    successfulUploads,
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
    .in("payment_status", [...GOOGLE_ADS_HEALTH_PAYMENT_STATUSES])
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
