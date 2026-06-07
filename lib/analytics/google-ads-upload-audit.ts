export type GoogleAdsUploadAuditRow = {
  created_at?: string | null
  intake_id: string | null
  metadata: {
    error_code?: string | null
    status?: string | null
  } | null
}

export type GoogleAdsUploadRetryCandidate = {
  gbraid?: string | null
  gclid?: string | null
  wbraid?: string | null
}

function uploadStatusRank(status: string | null | undefined): number {
  if (status === "success") return 3
  if (status === "failed") return 2
  if (status?.startsWith("skipped")) return 1
  return 0
}

export function isNonRetryableGoogleAdsUploadError(errorCode?: string | null): boolean {
  return Boolean(errorCode?.includes("INVALID_CONVERSION_ACTION_TYPE"))
}

export function hasGoogleAdsUploadClickId(row: GoogleAdsUploadRetryCandidate): boolean {
  return Boolean(row.gclid?.trim() || row.gbraid?.trim() || row.wbraid?.trim())
}

export function shouldRetryGoogleAdsUploadCandidate(
  row: GoogleAdsUploadRetryCandidate,
  latestAudit: GoogleAdsUploadAuditRow | undefined,
  options: { force: boolean },
): boolean {
  const latestStatus = latestAudit?.metadata?.status
  const latestError = latestAudit?.metadata?.error_code || ""

  if (options.force) return true
  if (latestStatus === "success") return false
  if (latestStatus === "skipped_missing_click_id" && !hasGoogleAdsUploadClickId(row)) return false
  if (isNonRetryableGoogleAdsUploadError(latestError)) return false

  return true
}

export type GoogleAdsUploadFailureSummary = {
  failed: number
  total: number
  latestErrorCode: string | null
  latestFailedAt: string | null
}

/**
 * Reduce raw `google_ads_conversion_upload` audit rows to a failure summary,
 * deduped to the best (latest, highest-rank) upload per intake. An intake that
 * failed then later succeeded on retry does NOT count as failed. Powers the
 * "is the conversion pipeline leaking right now" counter on /admin/ops without
 * a live Google Ads API call.
 */
export function summarizeGoogleAdsUploadFailures(
  rows: GoogleAdsUploadAuditRow[],
): GoogleAdsUploadFailureSummary {
  const best = bestGoogleAdsUploadAuditByIntake(rows)

  let failed = 0
  let latestErrorCode: string | null = null
  let latestFailedAtMs = -1
  let latestFailedAt: string | null = null

  for (const audit of best.values()) {
    if (audit.metadata?.status !== "failed") continue
    failed += 1

    const at = audit.created_at ? Date.parse(audit.created_at) : 0
    if (at > latestFailedAtMs) {
      latestFailedAtMs = at
      latestFailedAt = audit.created_at ?? null
      latestErrorCode = audit.metadata?.error_code || null
    }
  }

  return { failed, total: best.size, latestErrorCode, latestFailedAt }
}

export function bestGoogleAdsUploadAuditByIntake(
  rows: GoogleAdsUploadAuditRow[],
): Map<string, GoogleAdsUploadAuditRow> {
  const best = new Map<string, GoogleAdsUploadAuditRow>()

  for (const row of rows) {
    if (!row.intake_id) continue

    const current = best.get(row.intake_id)
    if (!current) {
      best.set(row.intake_id, row)
      continue
    }

    const rowRank = uploadStatusRank(row.metadata?.status)
    const currentRank = uploadStatusRank(current.metadata?.status)
    const rowCreatedAt = row.created_at ? Date.parse(row.created_at) : 0
    const currentCreatedAt = current.created_at ? Date.parse(current.created_at) : 0

    if (rowRank > currentRank || (rowRank === currentRank && rowCreatedAt > currentCreatedAt)) {
      best.set(row.intake_id, row)
    }
  }

  return best
}
