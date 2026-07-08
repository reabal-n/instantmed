import { describe, expect, it } from "vitest"

import { buildGoogleAdsHealth, summarizeGoogleAdsAdjustmentHealth } from "@/lib/analytics/google-ads-health"

describe("Google Ads health", () => {
  it("summarises captured, uploaded, skipped, failed, and paused uploads from latest audit state", () => {
    const health = buildGoogleAdsHealth({
      audits: [
        {
          intake_id: "failed-intake",
          created_at: "2026-05-19T06:00:00.000Z",
          metadata: {
            error_code: "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:The_conversion_action_specified",
            status: "failed",
          },
        },
        {
          intake_id: "skipped-intake",
          created_at: "2026-05-19T05:00:00.000Z",
          metadata: { status: "skipped_missing_click_id" },
        },
        {
          intake_id: "uploaded-intake",
          created_at: "2026-05-19T04:00:00.000Z",
          metadata: { status: "success" },
        },
      ],
      candidates: [
        { id: "uploaded-intake", paid_at: "2026-05-19T01:00:00.000Z", gclid: "gclid-1" },
        { id: "skipped-intake", paid_at: "2026-05-19T01:00:00.000Z", campaignid: "123" },
        { id: "failed-intake", paid_at: "2026-05-19T01:00:00.000Z", gbraid: "gbraid-1" },
        { id: "missing-intake", paid_at: "2026-05-19T01:00:00.000Z", wbraid: "wbraid-1" },
      ],
    })

    expect(health.captured).toBe(4)
    expect(health.uploaded).toBe(1)
    expect(health.skipped).toBe(1)
    expect(health.failed).toBe(1)
    expect(health.missingUpload).toBe(1)
    expect(health.candidatesWithClickId).toBe(3)
    expect(health.candidatesMissingClickId).toBe(1)
    expect(health.uploadable).toBe(3)
    expect(health.clickIdCoveragePercent).toBe(75)
    expect(health.retryPaused).toBe(1)
    expect(health.latestErrorCode).toContain("INVALID_CONVERSION_ACTION_TYPE")
    expect(health.configuration.severity).toBe("error")
    expect(health.configuration.code).toBe("invalid_conversion_action_type")
    expect(health.configuration.action).toContain("conversion action")
    expect(health.lastSuccessfulUploadAt).toBe("2026-05-19T04:00:00.000Z")
  })

  it("surfaces conversion-action preflight failures before another upload attempt", () => {
    const health = buildGoogleAdsHealth({
      audits: [],
      candidates: [
        { id: "pending-intake", paid_at: "2026-05-19T01:00:00.000Z", gclid: "gclid-1" },
      ],
      conversionActionPreflight: {
        action: "Create or select a Google Ads offline click-import purchase action with type UPLOAD_CLICKS.",
        code: "invalid_conversion_action_type",
        conversionAction: {
          id: "9876543210",
          name: "Website purchase",
          resourceName: "customers/1234567890/conversionActions/9876543210",
          status: "ENABLED",
          type: "WEBPAGE",
        },
        detail: "Website purchase is type WEBPAGE, but uploadClickConversions requires UPLOAD_CLICKS.",
        label: "Wrong conversion action type",
        ok: false,
        severity: "error",
      },
    })

    expect(health.configuration.code).toBe("invalid_conversion_action_type")
    expect(health.configuration.label).toBe("Wrong conversion action type")
    expect(health.configuration.detail).toContain("WEBPAGE")
    expect(health.configuration.action).toContain("UPLOAD_CLICKS")
  })

  it("surfaces disabled server-side uploads as a blocking configuration state", () => {
    const health = buildGoogleAdsHealth({
      audits: [
        {
          intake_id: "disabled-intake",
          created_at: "2026-06-01T03:00:00.000Z",
          metadata: { status: "skipped_disabled" },
        },
      ],
      candidates: [
        { id: "disabled-intake", paid_at: "2026-06-01T02:00:00.000Z", gclid: "gclid-1" },
      ],
    })

    expect(health.skipped).toBe(1)
    expect(health.configuration.severity).toBe("error")
    expect(health.configuration.code).toBe("server_disabled")
    expect(health.configuration.label).toBe("Server uploads disabled")
  })

  it("does not downgrade an order after an earlier successful upload", () => {
    const health = buildGoogleAdsHealth({
      audits: [
        {
          intake_id: "uploaded-intake",
          created_at: "2026-06-05T05:00:00.000Z",
          metadata: {
            error_code: "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:The_conversion_action_specified",
            status: "failed",
          },
        },
        {
          intake_id: "uploaded-intake",
          created_at: "2026-06-05T04:00:00.000Z",
          metadata: { status: "success" },
        },
      ],
      candidates: [
        { id: "uploaded-intake", paid_at: "2026-06-05T03:00:00.000Z", gclid: "gclid-1" },
      ],
      conversionActionPreflight: {
        action: "No action needed.",
        code: null,
        conversionAction: {
          id: "9876543210",
          name: "InstantMed purchase upload",
          resourceName: "customers/1234567890/conversionActions/9876543210",
          status: "ENABLED",
          type: "UPLOAD_CLICKS",
        },
        detail: "InstantMed purchase upload is enabled and accepts uploadClickConversions imports.",
        label: "Conversion action accepts uploads",
        ok: true,
        severity: "ok",
      },
    })

    expect(health.uploaded).toBe(1)
    expect(health.failed).toBe(0)
    expect(health.retryPaused).toBe(0)
    expect(health.latestErrorCode).toBeNull()
    expect(health.configuration.severity).toBe("ok")
  })
})

describe("Google Ads adjustment health", () => {
  it("dedupes raw adjustment failures and separates transient from terminal click-attributed risk", () => {
    const health = summarizeGoogleAdsAdjustmentHealth({
      adjustmentRows: [
        {
          intake_id: "click-refund",
          created_at: "2026-07-03T08:45:26.732Z",
          metadata: {
            error_code: "conversionAdjustmentUploadError:CONVERSION_NOT_FOUND:The conversion was not found",
            status: "failed",
          },
        },
        {
          intake_id: "click-refund",
          created_at: "2026-07-02T08:45:26.732Z",
          metadata: {
            error_code: "conversionAdjustmentUploadError:CONVERSION_NOT_FOUND:The conversion was not found",
            status: "failed",
          },
        },
        {
          intake_id: "user-data-refund",
          created_at: "2026-07-03T08:30:00.000Z",
          metadata: {
            error_code: "conversionAdjustmentUploadError:CONVERSION_NOT_FOUND:The conversion was not found",
            status: "failed",
          },
        },
        {
          intake_id: "fresh-refund",
          created_at: "2026-07-08T08:30:00.000Z",
          metadata: {
            error_code: "conversionAdjustmentUploadError:CONVERSION_NOT_FOUND:The conversion was not found",
            status: "failed",
          },
        },
        {
          intake_id: "processing-refund",
          created_at: "2026-07-08T08:35:00.000Z",
          metadata: {
            error_code: "dm_request_processing",
            status: "failed",
          },
        },
      ],
      generatedAt: "2026-07-08T09:00:00.000Z",
      lookbackDays: 90,
      now: new Date("2026-07-08T09:00:00.000Z"),
      purchaseUploadRows: [
        {
          intake_id: "click-refund",
          created_at: "2026-06-20T23:24:43.356Z",
          metadata: {
            has_gclid: true,
            has_user_data: true,
            status: "success",
          },
        },
        {
          intake_id: "user-data-refund",
          created_at: "2026-06-24T05:46:00.244Z",
          metadata: {
            has_gclid: false,
            has_user_data: true,
            status: "success",
          },
        },
        {
          intake_id: "fresh-refund",
          created_at: "2026-07-08T07:30:00.000Z",
          metadata: {
            has_user_data: true,
            status: "success",
          },
        },
        {
          intake_id: "processing-refund",
          created_at: "2026-07-08T07:20:00.000Z",
          metadata: {
            has_user_data: true,
            status: "success",
          },
        },
      ],
    })

    expect(health).toMatchObject({
      adjustmentFailureRows: 5,
      clickAttributedFailures: 1,
      dedupedFailedIntakes: 4,
      failedIntakesWithoutSuccessfulUpload: 0,
      latestFailureAt: "2026-07-08T08:35:00.000Z",
      terminalClickAttributedFailures: 1,
      terminalFailures: 2,
      terminalNonClickAttributedFailures: 1,
      transientFailures: 2,
    })
  })

  it("excludes dm_request_rejected terminals from the pageable click-attributed count", () => {
    const health = summarizeGoogleAdsAdjustmentHealth({
      adjustmentRows: [
        {
          intake_id: "dm-rejected-click",
          created_at: "2026-07-08T08:30:00.000Z",
          metadata: {
            status: "terminal_failed",
            terminal: true,
            terminal_reason: "dm_request_rejected",
          },
        },
      ],
      generatedAt: "2026-07-08T09:00:00.000Z",
      lookbackDays: 90,
      now: new Date("2026-07-08T09:00:00.000Z"),
      purchaseUploadRows: [
        {
          intake_id: "dm-rejected-click",
          created_at: "2026-06-20T23:24:43.356Z",
          metadata: {
            has_gclid: true,
            has_user_data: true,
            status: "success",
          },
        },
      ],
    })

    // Ingest rejected → conversion never landed → nothing counted → must not page.
    expect(health.terminalClickAttributedFailures).toBe(0)
    // Still observed as a terminal + click-attributed failure, just not pageable.
    expect(health.terminalFailures).toBe(1)
    expect(health.clickAttributedFailures).toBe(1)
    expect(health.terminalNonClickAttributedFailures).toBe(0)
  })
})
