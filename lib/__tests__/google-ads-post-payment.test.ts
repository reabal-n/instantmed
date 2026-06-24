import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { runGoogleAdsPostPaymentAttribution } from "@/lib/analytics/google-ads-post-payment"

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  fireGoogleAdsPurchaseConversion: vi.fn(),
}))

vi.mock("@/lib/analytics/google-ads-conversion-api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/analytics/google-ads-conversion-api")>()),
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
  const originalEnhancedDisabled = process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED

  beforeEach(() => {
    mocks.capture.mockReset()
    mocks.fireGoogleAdsPurchaseConversion.mockReset()
    delete process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED
  })

  afterEach(() => {
    if (originalDisabled === undefined) {
      delete process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED
    } else {
      process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED = originalDisabled
    }
    if (originalEnhancedDisabled === undefined) {
      delete process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED
    } else {
      process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED = originalEnhancedDisabled
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
          $insert_id: "google_ads_server_conversion_attempt:intake_google_failed:cron_backfill:failed:conversionUploadError:TOO_RECENT_CONVERSION_ACTION",
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
        $insert_id: "google_ads_server_conversion:intake_google_success",
        amount_cents: 2995,
        intake_id: "intake_google_success",
        status: "success",
      }),
    })

    const attemptEvents = mocks.capture.mock.calls.filter(
      ([payload]) => payload?.event === "google_ads_server_conversion_attempt",
    )
    expect(attemptEvents[0]?.[0]).toMatchObject({
      properties: expect.objectContaining({
        $insert_id: "google_ads_server_conversion_attempt:intake_google_success:checkout_session_completed:success:no_error",
      }),
    })
  })

  it("forwards enhanced-conversions user data to the upload and flags has_user_data", async () => {
    mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({ attempted: true, ok: true })

    const supabase = {
      from: () => ({
        insert: async () => ({ error: null }),
      }),
    }

    // userData override is injected directly (the live path resolves it from the
    // patient profile; here we skip the DB + decrypt and assert the wiring).
    await runGoogleAdsPostPaymentAttribution({
      amountCents: 4995,
      intakeId: "intake_ec",
      posthogDistinctId: "patient_ec",
      row: {
        amount_cents: 4995,
        category: "consult",
        campaignid: "789",
        gclid: "gclid-value",
      },
      source: "checkout_session_completed",
      supabase: supabase as never,
      userData: { email: "test@example.com", phone: "0412 345 678" },
    })

    expect(mocks.fireGoogleAdsPurchaseConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "intake_ec",
        gclid: "gclid-value",
        userData: { email: "test@example.com", phone: "0412 345 678" },
      }),
    )

    const attemptEvents = mocks.capture.mock.calls.filter(
      ([payload]) => payload?.event === "google_ads_server_conversion_attempt",
    )
    expect(attemptEvents[0]?.[0]).toMatchObject({
      properties: expect.objectContaining({ has_user_data: true }),
    })
  })

  it("uploads enhanced-conversion user data even when the click id was not captured", async () => {
    mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({ attempted: true, ok: true })

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
      amountCents: 4995,
      intakeId: "intake_ec_no_click",
      posthogDistinctId: "patient_ec_no_click",
      row: {
        amount_cents: 4995,
        category: "consult",
      },
      source: "checkout_session_completed",
      supabase: supabase as never,
      userData: { email: "test@example.com", phone: "0412 345 678" },
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsPurchaseConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "intake_ec_no_click",
        gclid: undefined,
        gbraid: undefined,
        wbraid: undefined,
        userData: { email: "test@example.com", phone: "0412 345 678" },
      }),
    )
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          attempted: true,
          has_gbraid: false,
          has_gclid: false,
          has_user_data: true,
          has_wbraid: false,
          matching_model: "click_or_user_data",
          status: "success",
        }),
      },
    })
  })

  it("audits a no-click skip when enhanced conversions are disabled", async () => {
    process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED = "true"
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
      intakeId: "intake_google_no_click",
      posthogDistinctId: "patient_google_no_click",
      row: {
        amount_cents: 1995,
        campaignid: "123",
        category: "medical_certificate",
      },
      source: "cron_backfill",
      supabase: supabase as never,
      userData: { email: "test@example.com" },
    })

    expect(result).toMatchObject({
      attempted: false,
      error: "missing_click_id",
      ok: false,
      status: "skipped_missing_click_id",
    })
    expect(mocks.fireGoogleAdsPurchaseConversion).not.toHaveBeenCalled()
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          attempted: false,
          has_user_data: false,
          matching_model: "click_or_user_data",
          status: "skipped_missing_click_id",
        }),
      },
    })
  })
})
