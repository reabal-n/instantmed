import { describe, expect, it } from "vitest"

import {
  type GoogleAdsUploadAuditRow,
  type GoogleAdsUploadRetryCandidate,
  shouldRetryGoogleAdsUploadCandidate,
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
      configSkipped: 0,
      notReaching: 0,
      total: 0,
      latestErrorCode: null,
      latestFailedAt: null,
    })
  })

  it("counts config-wide skips (missing env / no access token) as not reaching Google", () => {
    const summary = summarizeGoogleAdsUploadFailures([
      row("a", "skipped_missing_env", "2026-06-01T10:00:00Z"),
      row("b", "skipped_no_access_token", "2026-06-02T10:00:00Z"),
      row("c", "success", "2026-06-01T11:00:00Z"),
    ])
    // These orders never reached Google even though status !== "failed".
    expect(summary.failed).toBe(0)
    expect(summary.configSkipped).toBe(2)
    expect(summary.notReaching).toBe(2)
    expect(summary.latestFailedAt).toBe("2026-06-02T10:00:00Z")
  })

  it("does NOT count a per-order missing-click-id skip as not reaching Google", () => {
    const summary = summarizeGoogleAdsUploadFailures([
      row("a", "skipped_missing_click_id", "2026-06-01T10:00:00Z"),
    ])
    expect(summary.configSkipped).toBe(0)
    expect(summary.notReaching).toBe(0)
  })

  it("notReaching sums failed + config skips", () => {
    const summary = summarizeGoogleAdsUploadFailures([
      row("a", "failed", "2026-06-01T10:00:00Z", "http_500"),
      row("b", "skipped_missing_env", "2026-06-02T10:00:00Z"),
    ])
    expect(summary.failed).toBe(1)
    expect(summary.configSkipped).toBe(1)
    expect(summary.notReaching).toBe(2)
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

describe("shouldRetryGoogleAdsUploadCandidate", () => {
  const noClickId: GoogleAdsUploadRetryCandidate = {}
  const withClickId: GoogleAdsUploadRetryCandidate = { gclid: "Cj0Kabc123" }

  function audit(
    status: string,
    opts: { errorCode?: string | null; matchingModel?: string } = {},
  ): GoogleAdsUploadAuditRow {
    return {
      intake_id: "i1",
      created_at: "2026-06-30T00:00:00Z",
      metadata: {
        status,
        error_code: opts.errorCode ?? null,
        matching_model: opts.matchingModel,
      },
    }
  }

  it("NEVER re-fires an already-successful upload (the load-bearing no-double-count guard)", () => {
    // The single most important safety property of the backfill cron: an intake
    // that already uploaded successfully must not be re-uploaded (Google's
    // orderId dedup is the only other backstop).
    expect(shouldRetryGoogleAdsUploadCandidate(withClickId, audit("success"), { force: false })).toBe(false)
    expect(shouldRetryGoogleAdsUploadCandidate(noClickId, audit("success"), { force: false })).toBe(false)
  })

  it("only force (?force=1) overrides the success guard", () => {
    expect(shouldRetryGoogleAdsUploadCandidate(withClickId, audit("success"), { force: true })).toBe(true)
  })

  it("skips a structurally-unfixable expired click identifier", () => {
    expect(
      shouldRetryGoogleAdsUploadCandidate(withClickId, audit("skipped_expired_click_identifier"), { force: false }),
    ).toBe(false)
  })

  it("skips missing-click-id only when no click id exists and user-data matching was possible", () => {
    expect(
      shouldRetryGoogleAdsUploadCandidate(
        noClickId,
        audit("skipped_missing_click_id", { matchingModel: "click_or_user_data" }),
        { force: false },
      ),
    ).toBe(false)
    // …but retries the moment a click id is present on the candidate.
    expect(
      shouldRetryGoogleAdsUploadCandidate(
        withClickId,
        audit("skipped_missing_click_id", { matchingModel: "click_or_user_data" }),
        { force: false },
      ),
    ).toBe(true)
  })

  it("does not retry non-retryable error codes (config/expired)", () => {
    expect(
      shouldRetryGoogleAdsUploadCandidate(withClickId, audit("failed", { errorCode: "INVALID_CONVERSION_ACTION_TYPE" }), { force: false }),
    ).toBe(false)
    expect(
      shouldRetryGoogleAdsUploadCandidate(withClickId, audit("failed", { errorCode: "EXPIRED_EVENT" }), { force: false }),
    ).toBe(false)
  })

  it("retries a transient failure and a never-uploaded intake", () => {
    expect(
      shouldRetryGoogleAdsUploadCandidate(withClickId, audit("failed", { errorCode: "http_500" }), { force: false }),
    ).toBe(true)
    expect(shouldRetryGoogleAdsUploadCandidate(withClickId, undefined, { force: false })).toBe(true)
  })
})
