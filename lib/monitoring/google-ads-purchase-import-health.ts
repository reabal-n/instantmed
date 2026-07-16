export const GOOGLE_ADS_PURCHASE_IMPORT_HEALTH_DAYS = 30

export type GoogleAdsPurchaseImportHealthSnapshot = {
  acceptedCustomerDataTerms: boolean | null
  enhancedConversionsForLeadsEnabled: boolean | null
  generatedAt: string
  localNetRevenueAud: number
  localOrders: number
  preflightOk: boolean
  purchaseAllConversions: number
  purchaseAllConversionsValueAud: number
  purchaseConversions: number
  purchaseConversionValueAud: number
  queryErrors: Array<{ name: string; error: string }>
  rangeDays: number
  uploadAuditReconciliation?: {
    byRequestPath: Record<string, number>
    byRuntimeSource: Record<string, number>
    bySource: Record<string, number>
    byVercelEnv: Record<string, number>
    orphanRows: {
      invalidIntakeJoin: number
      missingIntakeId: number
      samples: Array<{
        at: string | null
        deploymentId: string | null
        requestPath: string | null
        runtimeSource: string | null
        source: string | null
        status: string | null
        uploadJobId: string | null
        vercelEnv: string | null
      }>
      total: number
    }
  } | null
}

export type GoogleAdsPurchaseImportAlert = {
  count: number
  detail: string
  metadata: {
    count: number
    generated_at: string
    accepted_customer_data_terms: boolean | null
    enhanced_conversions_for_leads_enabled: boolean | null
    local_net_revenue_aud: number
    local_orders: number
    preflight_ok: boolean
    purchase_all_conversions: number
    purchase_all_conversions_value_aud: number
    purchase_conversion_value_aud: number
    purchase_conversions: number
    query_errors: string[]
    upload_audit_orphan_rows?: number
    upload_audit_orphan_samples?: GoogleAdsPurchaseImportHealthSnapshot["uploadAuditReconciliation"] extends infer T
      ? T extends { orphanRows: { samples: infer S } }
        ? S
        : never
      : never
    upload_audit_orphan_alert_reason?: "fresh_orphan" | "high_volume" | "stale_low_volume" | "unknown_age"
    upload_audit_orphan_newest_at?: string | null
    upload_audit_orphan_newest_age_hours?: number | null
    upload_audit_request_paths?: string[]
    upload_audit_runtime_sources?: string[]
    upload_audit_sources?: string[]
    upload_audit_vercel_envs?: string[]
    window: string
    window_days: number
  }
  metric:
    | "google_ads_purchase_enhanced_conversions_setup_incomplete"
    | "google_ads_purchase_import_health_unavailable"
    | "google_ads_purchase_imports_zero"
    | "google_ads_purchase_primary_conversions_zero"
    | "google_ads_upload_audit_source_anomaly"
  severity: "critical" | "info" | "warning"
}

export const GOOGLE_ADS_ADJUSTMENT_HEALTH_DAYS = 90

export type GoogleAdsAdjustmentHealth = {
  adjustmentFailureRows: number
  clickAttributedFailures: number
  dedupedFailedIntakes: number
  failedIntakesWithoutSuccessfulUpload: number
  generatedAt: string
  latestFailureAt: string | null
  lookbackDays: number
  queryFailed: boolean
  terminalClickAttributedFailures: number
  terminalFailures: number
  terminalNonClickAttributedFailures: number
  transientFailures: number
}

export type GoogleAdsAdjustmentTerminalRiskAlert = {
  count: number
  detail: string
  metadata: {
    adjustment_failure_rows: number
    click_attributed_failures: number
    deduped_failed_intakes: number
    failed_intakes_without_successful_upload: number
    generated_at: string
    latest_failure_at: string | null
    terminal_click_attributed_failures: number
    terminal_failures: number
    terminal_non_click_attributed_failures: number
    transient_failures: number
    window: string
    window_days: number
  }
  metric: "google_ads_adjustment_terminal_click_attributed_failures"
  severity: "critical"
}

const GOOGLE_ADS_UPLOAD_AUDIT_SOURCE_ANOMALY_FRESH_HOURS = 2
const GOOGLE_ADS_UPLOAD_AUDIT_SOURCE_ANOMALY_CRITICAL_ROWS = 5
/**
 * How long a stale low-volume orphan keeps its Sentry-warning trail. At the
 * ~4h business-alerts cadence this is ~24 warnings — enough to survive a long
 * weekend unseen — after which the SAME aged orphan goes quiet instead of
 * re-warning forever (a single Jul-2026 orphan re-fired 265 times over 10+
 * days). High-volume anomalies stay critical regardless of age, and any NEW
 * orphan restarts the trail because the newest-row age drops.
 */
const GOOGLE_ADS_UPLOAD_AUDIT_SOURCE_ANOMALY_TRAIL_HOURS = 96

function getNewestOrphanAt(snapshot: GoogleAdsPurchaseImportHealthSnapshot): string | null {
  const samples = snapshot.uploadAuditReconciliation?.orphanRows.samples ?? []
  let newestAt: string | null = null
  let newestMs = -1

  for (const sample of samples) {
    if (!sample.at) continue
    const sampleMs = Date.parse(sample.at)
    if (!Number.isFinite(sampleMs)) continue
    if (sampleMs > newestMs) {
      newestMs = sampleMs
      newestAt = sample.at
    }
  }

  return newestAt
}

function classifyUploadAuditSourceAnomaly(snapshot: GoogleAdsPurchaseImportHealthSnapshot): {
  newestAt: string | null
  newestAgeHours: number | null
  reason: NonNullable<GoogleAdsPurchaseImportAlert["metadata"]["upload_audit_orphan_alert_reason"]>
  severity: GoogleAdsPurchaseImportAlert["severity"]
} {
  const orphanRows = snapshot.uploadAuditReconciliation?.orphanRows.total ?? 0
  const newestAt = getNewestOrphanAt(snapshot)
  const generatedMs = Date.parse(snapshot.generatedAt)
  const newestMs = newestAt ? Date.parse(newestAt) : Number.NaN
  const newestAgeHours = Number.isFinite(generatedMs) && Number.isFinite(newestMs)
    ? Math.max(0, Math.round(((generatedMs - newestMs) / (60 * 60 * 1000)) * 10) / 10)
    : null

  if (orphanRows >= GOOGLE_ADS_UPLOAD_AUDIT_SOURCE_ANOMALY_CRITICAL_ROWS) {
    return { newestAt, newestAgeHours, reason: "high_volume", severity: "critical" }
  }

  if (newestAgeHours === null) {
    return { newestAt, newestAgeHours, reason: "unknown_age", severity: "warning" }
  }

  if (newestAgeHours <= GOOGLE_ADS_UPLOAD_AUDIT_SOURCE_ANOMALY_FRESH_HOURS) {
    return { newestAt, newestAgeHours, reason: "fresh_orphan", severity: "critical" }
  }

  // "warning" routes to a deduped Sentry breadcrumb (not Telegram) so a genuine
  // small orphan that goes stale before the next cron still leaves a trail,
  // instead of being muted off every channel as "info".
  return { newestAt, newestAgeHours, reason: "stale_low_volume", severity: "warning" }
}

function buildMetadata(
  snapshot: GoogleAdsPurchaseImportHealthSnapshot,
  anomalyClassification?: ReturnType<typeof classifyUploadAuditSourceAnomaly>,
): GoogleAdsPurchaseImportAlert["metadata"] {
  return {
    accepted_customer_data_terms: snapshot.acceptedCustomerDataTerms,
    count: snapshot.localOrders,
    enhanced_conversions_for_leads_enabled: snapshot.enhancedConversionsForLeadsEnabled,
    generated_at: snapshot.generatedAt,
    local_net_revenue_aud: snapshot.localNetRevenueAud,
    local_orders: snapshot.localOrders,
    preflight_ok: snapshot.preflightOk,
    purchase_all_conversions: snapshot.purchaseAllConversions,
    purchase_all_conversions_value_aud: snapshot.purchaseAllConversionsValueAud,
    purchase_conversion_value_aud: snapshot.purchaseConversionValueAud,
    purchase_conversions: snapshot.purchaseConversions,
    query_errors: snapshot.queryErrors.map((error) => `${error.name}:${error.error}`),
    upload_audit_orphan_alert_reason: anomalyClassification?.reason,
    upload_audit_orphan_newest_age_hours: anomalyClassification?.newestAgeHours,
    upload_audit_orphan_newest_at: anomalyClassification?.newestAt,
    upload_audit_orphan_rows: snapshot.uploadAuditReconciliation?.orphanRows.total,
    upload_audit_orphan_samples: snapshot.uploadAuditReconciliation?.orphanRows.samples,
    upload_audit_request_paths: Object.keys(snapshot.uploadAuditReconciliation?.byRequestPath ?? {}).sort(),
    upload_audit_runtime_sources: Object.keys(snapshot.uploadAuditReconciliation?.byRuntimeSource ?? {}).sort(),
    upload_audit_sources: Object.keys(snapshot.uploadAuditReconciliation?.bySource ?? {}).sort(),
    upload_audit_vercel_envs: Object.keys(snapshot.uploadAuditReconciliation?.byVercelEnv ?? {}).sort(),
    window: `${snapshot.rangeDays}d`,
    window_days: snapshot.rangeDays,
  }
}

/**
 * Re-page window for terminal click-attributed adjustment failures. The health
 * lookback is 90d, so without a freshness gate one terminal failure pages
 * every ~4h for three months (the Jul-2026 refunded-ED failure re-fired 234
 * times). The per-intake fingerprinted Sentry error from the adjustment module
 * already records each failure durably; this alert exists to get eyes on it,
 * which a week of pages either achieves or never will. Gated on the latest
 * failure row of ANY kind (the health snapshot has no terminal-specific
 * timestamp), which errs toward re-paging while related failures are active.
 */
export const GOOGLE_ADS_ADJUSTMENT_TERMINAL_REPAGE_DAYS = 7

export function buildGoogleAdsAdjustmentTerminalRiskAlert(
  health: GoogleAdsAdjustmentHealth,
): GoogleAdsAdjustmentTerminalRiskAlert | null {
  if (health.queryFailed) return null
  if (health.terminalClickAttributedFailures <= 0) return null

  if (health.latestFailureAt) {
    const generatedMs = Date.parse(health.generatedAt)
    const latestFailureMs = Date.parse(health.latestFailureAt)
    if (
      Number.isFinite(generatedMs) &&
      Number.isFinite(latestFailureMs) &&
      generatedMs - latestFailureMs >
        GOOGLE_ADS_ADJUSTMENT_TERMINAL_REPAGE_DAYS * 24 * 60 * 60 * 1000
    ) {
      return null
    }
  }

  return {
    count: health.terminalClickAttributedFailures,
    detail:
      `Google Ads has ${health.terminalClickAttributedFailures} terminal refunded-order adjustment failure` +
      `${health.terminalClickAttributedFailures === 1 ? "" : "s"} tied to a click-attributed purchase import; ` +
      "Smart Bidding may still be counting refunded ad-click revenue.",
    metadata: {
      adjustment_failure_rows: health.adjustmentFailureRows,
      click_attributed_failures: health.clickAttributedFailures,
      deduped_failed_intakes: health.dedupedFailedIntakes,
      failed_intakes_without_successful_upload: health.failedIntakesWithoutSuccessfulUpload,
      generated_at: health.generatedAt,
      latest_failure_at: health.latestFailureAt,
      terminal_click_attributed_failures: health.terminalClickAttributedFailures,
      terminal_failures: health.terminalFailures,
      terminal_non_click_attributed_failures: health.terminalNonClickAttributedFailures,
      transient_failures: health.transientFailures,
      window: `${health.lookbackDays}d`,
      window_days: health.lookbackDays,
    },
    metric: "google_ads_adjustment_terminal_click_attributed_failures",
    severity: "critical",
  }
}

export function buildGoogleAdsUploadAuditSourceAnomalyAlert(
  snapshot: GoogleAdsPurchaseImportHealthSnapshot,
): GoogleAdsPurchaseImportAlert | null {
  const orphanRows = snapshot.uploadAuditReconciliation?.orphanRows.total ?? 0
  if (orphanRows <= 0) return null

  const classification = classifyUploadAuditSourceAnomaly(snapshot)
  if (
    classification.reason === "stale_low_volume" &&
    classification.newestAgeHours !== null &&
    classification.newestAgeHours > GOOGLE_ADS_UPLOAD_AUDIT_SOURCE_ANOMALY_TRAIL_HOURS
  ) {
    return null
  }
  return {
    count: orphanRows,
    detail:
      `Google Ads upload audit has ${orphanRows} orphan row` +
      `${orphanRows === 1 ? "" : "s"} with no valid intake join; classify as audit-source anomaly` +
      (classification.reason === "stale_low_volume" ? " (stale low-volume; Sentry warning only, not paging Telegram)" : ""),
    metadata: buildMetadata(snapshot, classification),
    metric: "google_ads_upload_audit_source_anomaly",
    severity: classification.severity,
  }
}

export function buildGoogleAdsPurchaseImportAlert(
  snapshot: GoogleAdsPurchaseImportHealthSnapshot,
): GoogleAdsPurchaseImportAlert | null {
  if (snapshot.localOrders <= 0) return null

  const metadata = buildMetadata(snapshot)
  if (!snapshot.preflightOk || snapshot.queryErrors.length > 0) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads purchase import health unavailable for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_import_health_unavailable",
      severity: "critical",
    }
  }

  if (
    snapshot.acceptedCustomerDataTerms !== true ||
    snapshot.enhancedConversionsForLeadsEnabled !== true
  ) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads enhanced-conversion setup is incomplete for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_enhanced_conversions_setup_incomplete",
      severity: "critical",
    }
  }

  if (snapshot.purchaseAllConversions <= 0) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads shows zero imported purchase conversions for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_imports_zero",
      severity: "critical",
    }
  }

  if (snapshot.purchaseConversions <= 0) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads purchase import has ${snapshot.purchaseAllConversions} all-conversion event` +
        `${snapshot.purchaseAllConversions === 1 ? "" : "s"} but zero primary purchase conversions ` +
        `for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_primary_conversions_zero",
      severity: "critical",
    }
  }

  return null
}

/**
 * Default window for the upload-stream stall detector. 3 days, not 24h: the
 * backfill cron is hourly and the per-order webhook is immediate, so a 3-day
 * run of zero successful uploads while paid orders exist is unambiguous, not
 * weekend-volume jitter.
 */
export const GOOGLE_ADS_UPLOAD_STREAM_STALL_DAYS = 3

/**
 * Our-side upload-stream health: did paid orders actually produce successful
 * server-side conversion uploads? This is the COMPLEMENT of
 * buildGoogleAdsPurchaseImportAlert (which reads the Google Ads *reporting* API
 * return side). The reporting-side alert is denominated on click-id-attributed
 * `localOrders`, so it is structurally blind to a Data-Manager enhanced-
 * conversions stall (those orders match on hashed email/phone, no click id, and
 * never enter that denominator). This snapshot denominates on ALL reportable
 * paid orders and counts our own successful upload audit rows.
 */
export type GoogleAdsUploadStreamHealth = {
  dataManagerSuccesses: number
  failedUploads: number
  generatedAt: string
  latestFailedAt: string | null
  latestFailureCode: string | null
  lastSuccessfulUploadAt: string | null
  legacySuccesses: number
  lookbackDays: number
  /** Reportable paid orders in the window (NOT click-id gated). */
  paidOrders: number
  /** True when the DB read failed — alert fail-soft, never page on our own blip. */
  queryFailed: boolean
  /** Successful PROD (Vercel) uploads in the window, best-per-intake. */
  successfulUploads: number
}

export type GoogleAdsUploadStreamStalledAlert = {
  count: number
  detail: string
  metadata: {
    data_manager_successes: number
    generated_at: string
    last_successful_upload_at: string | null
    legacy_successes: number
    paid_orders: number
    successful_uploads: number
    window: string
    window_days: number
  }
  metric: "google_ads_conversion_uploads_stalled"
  severity: "critical"
}

export type GoogleAdsUploadPartialFailureAlert = {
  count: number
  detail: string
  metadata: {
    data_manager_successes: number
    failed_uploads: number
    failure_rate: number
    generated_at: string
    latest_failed_at: string | null
    latest_failure_code: string | null
    legacy_successes: number
    paid_orders: number
    successful_uploads: number
    upload_attempts: number
    window: string
    window_days: number
  }
  metric: "google_ads_conversion_upload_partial_failures"
  severity: "critical"
}

/**
 * Page when paid orders exist but ZERO successful server-side uploads reached
 * Google in the window — i.e. the upload stream silently stopped (cron died,
 * every attempt errors a status the failure counter misses, or a Data-Manager-
 * only stall the reporting-side `purchase_imports_zero` alert cannot see). This
 * is the "absence of success" detector that complements the existing "presence
 * of failure" counter on /admin/ops. Fail-soft on query error; no alert when
 * there are no paid orders to upload.
 */
export function buildGoogleAdsUploadStreamStalledAlert(
  health: GoogleAdsUploadStreamHealth,
): GoogleAdsUploadStreamStalledAlert | null {
  if (health.queryFailed) return null
  if (health.paidOrders <= 0) return null
  if (health.successfulUploads > 0) return null

  return {
    count: health.paidOrders,
    detail:
      `Google Ads conversion uploads stalled: ${health.paidOrders} paid order` +
      `${health.paidOrders === 1 ? "" : "s"} in ${health.lookbackDays}d but zero successful ` +
      `server-side uploads reached Google (Data Manager + legacy). Smart Bidding is optimising blind.`,
    metadata: {
      data_manager_successes: health.dataManagerSuccesses,
      generated_at: health.generatedAt,
      last_successful_upload_at: health.lastSuccessfulUploadAt,
      legacy_successes: health.legacySuccesses,
      paid_orders: health.paidOrders,
      successful_uploads: health.successfulUploads,
      window: `${health.lookbackDays}d`,
      window_days: health.lookbackDays,
    },
    metric: "google_ads_conversion_uploads_stalled",
    severity: "critical",
  }
}

export const GOOGLE_ADS_UPLOAD_PARTIAL_FAILURE_MIN_FAILED = 3
export const GOOGLE_ADS_UPLOAD_PARTIAL_FAILURE_RATE_THRESHOLD = 0.25

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function buildGoogleAdsUploadPartialFailureAlert(
  health: GoogleAdsUploadStreamHealth,
): GoogleAdsUploadPartialFailureAlert | null {
  if (health.queryFailed) return null
  if (health.paidOrders <= 0) return null
  if (health.successfulUploads <= 0) return null
  if (health.failedUploads < GOOGLE_ADS_UPLOAD_PARTIAL_FAILURE_MIN_FAILED) return null

  const uploadAttempts = health.successfulUploads + health.failedUploads
  if (uploadAttempts <= 0) return null

  const failureRate = roundRate(health.failedUploads / uploadAttempts)
  if (failureRate < GOOGLE_ADS_UPLOAD_PARTIAL_FAILURE_RATE_THRESHOLD) return null

  return {
    count: health.failedUploads,
    detail:
      `Partial Google Ads conversion upload failures: ${health.failedUploads} failed ` +
      `of ${uploadAttempts} completed upload attempt${uploadAttempts === 1 ? "" : "s"} ` +
      `(${Math.round(failureRate * 100)}%) in ${health.lookbackDays}d while ` +
      `${health.successfulUploads} still succeeded. Smart Bidding may be partially blind.`,
    metadata: {
      data_manager_successes: health.dataManagerSuccesses,
      failed_uploads: health.failedUploads,
      failure_rate: failureRate,
      generated_at: health.generatedAt,
      latest_failed_at: health.latestFailedAt,
      latest_failure_code: health.latestFailureCode,
      legacy_successes: health.legacySuccesses,
      paid_orders: health.paidOrders,
      successful_uploads: health.successfulUploads,
      upload_attempts: uploadAttempts,
      window: `${health.lookbackDays}d`,
      window_days: health.lookbackDays,
    },
    metric: "google_ads_conversion_upload_partial_failures",
    severity: "critical",
  }
}
