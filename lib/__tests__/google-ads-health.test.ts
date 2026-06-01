import { describe, expect, it } from "vitest"

import { buildGoogleAdsHealth } from "@/lib/analytics/google-ads-health"

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
})
