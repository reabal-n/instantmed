import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { isNonRetryableGoogleAdsConversionError } from "@/lib/analytics/google-ads-post-payment"

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
    const vercel = read("vercel.json")
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")

    expect(runner).toContain('GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION = "google_ads_conversion_upload"')
    expect(runner).toContain('action: GOOGLE_ADS_CONVERSION_UPLOAD_AUDIT_ACTION')
    expect(runner).toContain('actor_type: "system"')
    expect(runner).not.toContain("metadata: { gclid")

    expect(cron).toContain("runGoogleAdsPostPaymentAttribution")
    expect(cron).toContain("preflightGoogleAdsPurchaseConversionAction")
    expect(cron).toContain("skipped_preflight")
    expect(cron).toContain("skipped_missing_click_id")
    expect(cron).toContain("isNonRetryableGoogleAdsConversionError")
    expect(cron).toContain('searchParams.get("force") === "1"')
    expect(vercel).toContain("/api/cron/google-ads-conversions")
    expect(heartbeat).toContain('"google-ads-conversions"')
  })

  it("does not retry Google's non-retryable conversion-action configuration error", () => {
    expect(
      isNonRetryableGoogleAdsConversionError(
        "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:The_conversion_action_specified_in_the_uplo",
      ),
    ).toBe(true)
    expect(isNonRetryableGoogleAdsConversionError("conversionUploadError:TOO_RECENT")).toBe(false)
  })
})
