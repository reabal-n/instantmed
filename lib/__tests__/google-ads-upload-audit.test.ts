import { describe, expect, it } from "vitest"

import {
  type GoogleAdsUploadAuditRow,
  summarizeGoogleAdsUploadFailures,
} from "@/lib/analytics/google-ads-upload-audit"

function row(
  intakeId: string,
  status: string,
  createdAt: string,
  errorCode: string | null = null,
): GoogleAdsUploadAuditRow {
  return { intake_id: intakeId, created_at: createdAt, metadata: { status, error_code: errorCode } }
}

describe("summarizeGoogleAdsUploadFailures", () => {
  it("returns an all-clear summary for no rows", () => {
    expect(summarizeGoogleAdsUploadFailures([])).toEqual({
      failed: 0,
      total: 0,
      latestErrorCode: null,
      latestFailedAt: null,
    })
  })

  it("counts one intake whose latest upload failed", () => {
    const summary = summarizeGoogleAdsUploadFailures([
      row("a", "failed", "2026-06-01T10:00:00Z", "conversionUploadError:NO_CONVERSION_ACTION_FOUND:x"),
    ])
    expect(summary.failed).toBe(1)
    expect(summary.total).toBe(1)
    expect(summary.latestErrorCode).toBe("conversionUploadError:NO_CONVERSION_ACTION_FOUND:x")
    expect(summary.latestFailedAt).toBe("2026-06-01T10:00:00Z")
  })

  it("does NOT count an intake that failed earlier but later succeeded (retry recovered)", () => {
    const summary = summarizeGoogleAdsUploadFailures([
      row("a", "success", "2026-06-02T10:00:00Z"),
      row("a", "failed", "2026-06-01T10:00:00Z", "http_500"),
    ])
    expect(summary.failed).toBe(0)
    expect(summary.total).toBe(1)
    expect(summary.latestErrorCode).toBeNull()
  })

  it("counts only intakes whose best status is failed across a mixed set", () => {
    const summary = summarizeGoogleAdsUploadFailures([
      row("a", "failed", "2026-06-01T10:00:00Z", "NO_CONVERSION_ACTION_FOUND"),
      row("b", "success", "2026-06-01T11:00:00Z"),
      row("c", "skipped_missing_click_id", "2026-06-01T12:00:00Z"),
      row("d", "failed", "2026-06-03T09:00:00Z", "http_500"),
    ])
    expect(summary.failed).toBe(2)
    expect(summary.total).toBe(4)
    // latest failed across best audits is intake d at 2026-06-03
    expect(summary.latestFailedAt).toBe("2026-06-03T09:00:00Z")
    expect(summary.latestErrorCode).toBe("http_500")
  })
})
