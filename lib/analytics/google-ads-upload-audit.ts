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
