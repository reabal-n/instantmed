import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { runGoogleAdsPostPaymentAttribution } from "@/lib/analytics/google-ads-post-payment"

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  fireGoogleAdsPurchaseConversion: vi.fn(),
}))

vi.mock("@/lib/analytics/google-ads-conversion-api", () => ({
  fireGoogleAdsPurchaseConversion: mocks.fireGoogleAdsPurchaseConversion,
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  getPostHogBaselineProperties: vi.fn(() => ({ environment: "test" })),
  getPostHogClient: vi.fn(() => ({
    capture: mocks.capture,
  })),
}))

describe("Google Ads post-payment attribution", () => {
  const originalDisabled = process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED

  beforeEach(() => {
    mocks.capture.mockReset()
    mocks.fireGoogleAdsPurchaseConversion.mockReset()
  })

  afterEach(() => {
    if (originalDisabled === undefined) {
      delete process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED
    } else {
      process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED = originalDisabled
    }
  })

  it("audits the server-side kill switch instead of returning a statusless no-op", async () => {
    process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED = "true"
    const inserted: unknown[] = []
    const supabase = {
      from: (table: string) => ({
        insert: async (payload: unknown) => {
          inserted.push({ table, payload })
          return { error: null }
        },
      }),
    }

    const result = await runGoogleAdsPostPaymentAttribution({
      amountCents: 1995,
      intakeId: "intake_google_1",
      posthogDistinctId: "patient_google_1",
      row: {
        amount_cents: 1995,
        category: "medical_certificate",
        campaignid: "123",
        gclid: "gclid-value",
      },
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      error: "server_disabled",
      ok: false,
      status: "skipped_disabled",
    })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      table: "audit_logs",
      payload: {
        action: "google_ads_conversion_upload",
        actor_type: "system",
        intake_id: "intake_google_1",
        metadata: expect.objectContaining({
          attempted: false,
          error_code: "server_disabled",
          has_gclid: true,
          status: "skipped_disabled",
        }),
      },
    })
  })

  it("does not count failed upload attempts as server conversions in PostHog", async () => {
    mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({
      attempted: true,
      ok: false,
      error: "conversionUploadError:TOO_RECENT_CONVERSION_ACTION",
    })

    const supabase = {
      from: () => ({
        insert: async () => ({ error: null }),
      }),
    }

    const result = await runGoogleAdsPostPaymentAttribution({
      amountCents: 1995,
      intakeId: "intake_google_failed",
      posthogDistinctId: "patient_google_failed",
      row: {
        amount_cents: 1995,
        category: "medical_certificate",
        campaignid: "123",
        gclid: "gclid-value",
      },
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result.status).toBe("failed")
    expect(mocks.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "google_ads_server_conversion_attempt",
        properties: expect.objectContaining({
          status: "failed",
        }),
      }),
    )
    expect(mocks.capture).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: "google_ads_server_conversion",
      }),
    )
  })

  it("emits one server conversion event only after a successful Google Ads upload", async () => {
    mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({
      attempted: true,
      ok: true,
    })

    const supabase = {
      from: () => ({
        insert: async () => ({ error: null }),
      }),
    }

    await runGoogleAdsPostPaymentAttribution({
      amountCents: 2995,
      intakeId: "intake_google_success",
      posthogDistinctId: "patient_google_success",
      row: {
        amount_cents: 2995,
        category: "prescription",
        campaignid: "456",
        gclid: "gclid-value",
      },
      source: "checkout_session_completed",
      supabase: supabase as never,
    })

    const conversionEvents = mocks.capture.mock.calls.filter(
      ([payload]) => payload?.event === "google_ads_server_conversion",
    )
    expect(conversionEvents).toHaveLength(1)
    expect(conversionEvents[0]?.[0]).toMatchObject({
      distinctId: "patient_google_success",
      event: "google_ads_server_conversion",
      properties: expect.objectContaining({
        amount_cents: 2995,
        intake_id: "intake_google_success",
        status: "success",
      }),
    })
  })
})
