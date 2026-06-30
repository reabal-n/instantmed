import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { isNonRetryableGoogleAdsConversionError } from "@/lib/analytics/google-ads-post-payment"
import {
  bestGoogleAdsUploadAuditByIntake,
  shouldRetryGoogleAdsUploadCandidate,
} from "@/lib/analytics/google-ads-upload-audit"

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("Google Ads attribution contract", () => {
  it("runs the durable Google Ads post-payment uploader from every paid Stripe path", () => {
    const completed = read("app/api/stripe/webhook/handlers/checkout-session-completed.ts")
    const asyncSucceeded = read("app/api/stripe/webhook/handlers/checkout-session-async-payment-succeeded.ts")

    for (const source of [completed, asyncSucceeded]) {
      expect(source).toContain("GOOGLE_ADS_ATTRIBUTION_SELECT")
      expect(source).toContain("runGoogleAdsPostPaymentAttribution")
    }

    expect(completed).toContain('source: "checkout_session_completed"')
    expect(asyncSucceeded).toContain('source: "checkout_session_async_payment_succeeded"')
  })

  it("keeps failed Google Ads uploads retryable from cron and visible in audit logs", () => {
    const runner = read("lib/analytics/google-ads-post-payment.ts")
    const cron = read("app/api/cron/google-ads-conversions/route.ts")
    const uploadAudit = read("lib/analytics/google-ads-upload-audit.ts")
    const vercel = read("vercel.json")
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")

    expect(runner).toContain('GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION = "google_ads_conversion_upload"')
    expect(runner).toContain('action: GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION')
    expect(runner).toContain('actor_type: "system"')
    expect(runner).toContain("audit_source_anomaly")
    expect(runner).toContain("deployment_id")
    expect(runner).toContain("env_preflight")
    expect(runner).toContain("has_valid_intake_join")
    expect(runner).toContain("request_path")
    expect(runner).toContain("runtime_source")
    expect(runner).not.toContain("metadata: { gclid")

    expect(cron).toContain("runGoogleAdsPostPaymentAttribution")
    expect(cron).toContain("preflightGoogleAdsPurchaseConversionAction")
    expect(cron).toContain("Enhanced conversions can match with hashed first-party data")
    expect(cron).not.toContain(".filter(isLikelyGoogleAttributed)")
    expect(cron).toContain("skipped_preflight")
    expect(cron).toContain("bestGoogleAdsUploadAuditByIntake")
    expect(cron).toContain("shouldRetryGoogleAdsUploadCandidate")
    expect(uploadAudit).toContain("skipped_missing_click_id")
    expect(uploadAudit).toContain("INVALID_CONVERSION_ACTION_TYPE")
    expect(cron).toContain('searchParams.get("force") === "1"')
    expect(cron).toContain('searchParams.get("preflight") === "1"')
    expect(cron).toContain("serializePreflight")
    expect(vercel).toContain("/api/cron/google-ads-conversions")
    expect(vercel).toContain("/api/cron/google-ads-diagnostics-watch")
    expect(heartbeat).toContain('"google-ads-conversions"')
    expect(heartbeat).toContain('"google-ads-diagnostics-watch"')
  })

  it("does not expose Google Ads account mutation from the scheduled backfill route", () => {
    const cron = read("app/api/cron/google-ads-conversions/route.ts")

    expect(cron).not.toContain("create_upload_click_action")
    expect(cron).not.toContain("createGoogleAdsUploadClickConversionAction")
    expect(cron).not.toContain("conversionActions:mutate")
  })

  it("does not retry Google's non-retryable conversion-action configuration error", () => {
    expect(
      isNonRetryableGoogleAdsConversionError(
        "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:The_conversion_action_specified_in_the_uplo",
      ),
    ).toBe(true)
    expect(
      isNonRetryableGoogleAdsConversionError(
        "conversionUploadError:EXPIRED_EVENT:The_click_happened_too_long_before_the_conversion",
      ),
    ).toBe(true)
    expect(isNonRetryableGoogleAdsConversionError("conversionUploadError:TOO_RECENT")).toBe(false)
  })

  it("does not pin diagnostics watch to the stale June 24 recovery job", () => {
    const watch = read("app/api/cron/google-ads-diagnostics-watch/route.ts")

    expect(watch).not.toContain("2265599116648626375")
    expect(watch).not.toContain("2026-06-24T05:45:00.000Z")
    expect(watch).toContain("GOOGLE_ADS_DIAGNOSTICS_WATCH_REQUEST_ID")
    expect(watch).toContain("GOOGLE_ADS_DIAGNOSTICS_WATCH_JOB_ID")
    expect(watch).toContain('request.nextUrl.searchParams.get("requestId")')
    expect(watch).toContain("upload_identifier")
  })

  it("does not pin conversion uploads to a static diagnostics job id or request id", () => {
    const uploadApi = read("lib/analytics/google-ads-conversion-api.ts")
    const dataManagerApi = read("lib/analytics/google-ads-data-manager-api.ts")
    const runner = read("lib/analytics/google-ads-post-payment.ts")

    expect(uploadApi).not.toContain("GOOGLE_ADS_PURCHASE_UPLOAD_JOB_ID")
    expect(uploadApi).not.toContain("jobId: 20260624")
    expect(uploadApi).not.toContain("2265599116648626375")
    expect(uploadApi).toContain("Google assigns a unique diagnostics job id")
    expect(dataManagerApi).toContain("requestId")
    expect(runner).toContain("request_id")
    expect(runner).toContain("upload_identifier")
  })

  it("does not reprocess an order that already has a successful upload", () => {
    const bestAudit = bestGoogleAdsUploadAuditByIntake([
      {
        intake_id: "uploaded-intake",
        metadata: {
          error_code: "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:The_conversion_action_specified",
          status: "failed",
        },
      },
      {
        intake_id: "uploaded-intake",
        metadata: { status: "success" },
      },
    ]).get("uploaded-intake")

    expect(shouldRetryGoogleAdsUploadCandidate({ gclid: "gclid-1" }, bestAudit, {
      force: false,
    })).toBe(false)
  })

  it("retries legacy no-click skips once the uploader can use enhanced user data", () => {
    const legacyNoClickAudit = bestGoogleAdsUploadAuditByIntake([
      {
        intake_id: "legacy-no-click-intake",
        metadata: { status: "skipped_missing_click_id" },
      },
    ]).get("legacy-no-click-intake")

    expect(shouldRetryGoogleAdsUploadCandidate({}, legacyNoClickAudit, {
      force: false,
    })).toBe(true)

    const newNoSignalAudit = bestGoogleAdsUploadAuditByIntake([
      {
        intake_id: "new-no-signal-intake",
        metadata: {
          matching_model: "click_or_user_data",
          status: "skipped_missing_click_id",
        },
      },
    ]).get("new-no-signal-intake")

    expect(shouldRetryGoogleAdsUploadCandidate({}, newNoSignalAudit, {
      force: false,
    })).toBe(false)
  })

  it("does not retry expired click-identifier skips unless explicitly forced", () => {
    const expiredClickAudit = bestGoogleAdsUploadAuditByIntake([
      {
        intake_id: "expired-click-intake",
        metadata: {
          error_code: "expired_click_identifier",
          matching_model: "click_or_user_data",
          status: "skipped_expired_click_identifier",
        },
      },
    ]).get("expired-click-intake")

    expect(shouldRetryGoogleAdsUploadCandidate({ gclid: "stale-gclid" }, expiredClickAudit, {
      force: false,
    })).toBe(false)
    expect(shouldRetryGoogleAdsUploadCandidate({ gclid: "stale-gclid" }, expiredClickAudit, {
      force: true,
    })).toBe(true)
  })
})
