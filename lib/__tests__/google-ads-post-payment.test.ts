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

function googleAdsSupabaseMock(options: { validIntake?: boolean } = {}) {
  const inserted: unknown[] = []
  const validIntake = options.validIntake ?? true
  const supabase = {
    from: (table: string) => {
      if (table === "intakes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: validIntake ? { id: "intake_google_1" } : null,
                error: null,
              }),
            }),
          }),
        }
      }

      return {
        insert: async (payload: unknown) => {
          inserted.push({ table, payload })
          return { error: null }
        },
      }
    },
  }

  return { inserted, supabase }
}

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
    const { inserted, supabase } = googleAdsSupabaseMock()

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
          audit_source_anomaly: false,
          error_code: "server_disabled",
          has_gclid: true,
          has_valid_intake_join: true,
          request_path: null,
          runtime_source: "node",
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

    const { supabase } = googleAdsSupabaseMock()

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

    const { supabase } = googleAdsSupabaseMock()

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

    const { supabase } = googleAdsSupabaseMock()
    const paidAt = new Date("2026-06-24T05:45:00.000Z")

    // userData override is injected directly (the live path resolves it from the
    // patient profile; here we skip the DB + decrypt and assert the wiring).
    await runGoogleAdsPostPaymentAttribution({
      amountCents: 4995,
      conversionDateTime: paidAt,
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
        conversionDateTime: paidAt,
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

    const { inserted, supabase } = googleAdsSupabaseMock()

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
          has_valid_intake_join: true,
          has_wbraid: false,
          matching_model: "click_or_user_data",
          status: "success",
        }),
      },
    })
  })

  it("drops expired click identifiers while preserving enhanced-conversion user data", async () => {
    mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({ attempted: true, ok: true })

    const { inserted, supabase } = googleAdsSupabaseMock()
    const paidAt = new Date("2026-06-30T01:00:00.000Z")

    const result = await runGoogleAdsPostPaymentAttribution({
      amountCents: 2995,
      conversionDateTime: paidAt,
      intakeId: "intake_stale_click_with_user_data",
      posthogDistinctId: "patient_stale_click_with_user_data",
      row: {
        amount_cents: 2995,
        attribution_captured_at: "2026-03-20T00:00:00.000Z",
        campaignid: "123",
        category: "medical_certificate",
        gclid: "stale-gclid",
      },
      source: "cron_backfill",
      supabase: supabase as never,
      userData: { email: "test@example.com" },
    })

    expect(result).toMatchObject({ attempted: true, ok: true, status: "success" })
    expect(mocks.fireGoogleAdsPurchaseConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        conversionDateTime: paidAt,
        gbraid: undefined,
        gclid: undefined,
        orderId: "intake_stale_click_with_user_data",
        userData: { email: "test@example.com" },
        wbraid: undefined,
      }),
    )
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          attempted: true,
          click_identifier_expired: true,
          dropped_expired_click_identifier: true,
          has_gclid: true,
          has_user_data: true,
          status: "success",
        }),
      },
    })
  })

  it("skips expired click identifiers when no enhanced-conversion user data is available", async () => {
    mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({ attempted: true, ok: true })

    const { inserted, supabase } = googleAdsSupabaseMock()

    const result = await runGoogleAdsPostPaymentAttribution({
      amountCents: 2995,
      conversionDateTime: new Date("2026-06-30T01:00:00.000Z"),
      intakeId: "intake_stale_click_no_user_data",
      posthogDistinctId: "patient_stale_click_no_user_data",
      row: {
        amount_cents: 2995,
        attribution_captured_at: "2026-03-20T00:00:00.000Z",
        campaignid: "123",
        category: "medical_certificate",
        gclid: "stale-gclid",
      },
      source: "cron_backfill",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({
      attempted: false,
      error: "expired_click_identifier",
      ok: false,
      status: "skipped_expired_click_identifier",
    })
    expect(mocks.fireGoogleAdsPurchaseConversion).not.toHaveBeenCalled()
    expect(inserted[0]).toMatchObject({
      payload: {
        metadata: expect.objectContaining({
          attempted: false,
          click_identifier_expired: true,
          dropped_expired_click_identifier: true,
          error_code: "expired_click_identifier",
          has_gclid: true,
          has_user_data: false,
          matching_model: "click_or_user_data",
          status: "skipped_expired_click_identifier",
        }),
      },
    })
  })

  it("records source fingerprinting and marks missing intake joins as audit-source anomalies", async () => {
    const originals = {
      GOOGLE_ADS_CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_CONVERSION_ACTION_PURCHASE: process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE,
      GOOGLE_ADS_CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      VERCEL: process.env.VERCEL,
      VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
      VERCEL_REGION: process.env.VERCEL_REGION,
    }
    process.env.GOOGLE_ADS_CLIENT_ID = "client-id"
    process.env.GOOGLE_ADS_CLIENT_SECRET = "client-secret"
    process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "7631611119"
    process.env.GOOGLE_ADS_CUSTOMER_ID = "9205010513"
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"
    process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh-token"
    process.env.VERCEL = "1"
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_test"
    process.env.VERCEL_ENV = "production"
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123"
    process.env.VERCEL_REGION = "syd1"

    try {
      mocks.fireGoogleAdsPurchaseConversion.mockResolvedValue({ attempted: true, ok: true, jobId: "2265599116648626375" })
      const { inserted, supabase } = googleAdsSupabaseMock({ validIntake: false })

      await runGoogleAdsPostPaymentAttribution({
        amountCents: 2495,
        intakeId: "orphan_intake",
        posthogDistinctId: "patient_orphan_intake",
        requestPath: "/api/stripe/webhook",
        row: {
          amount_cents: 2495,
          category: "medical_certificate",
          campaignid: "123",
          gclid: "gclid-value",
        },
        source: "checkout_session_completed",
        supabase: supabase as never,
      })

      expect(inserted[0]).toMatchObject({
        payload: {
          intake_id: "orphan_intake",
          metadata: expect.objectContaining({
            audit_source_anomaly: true,
            audit_source_anomaly_reason: "join_missing",
            deployment_id: "dpl_test",
            git_sha: "abc123",
            has_valid_intake_id: true,
            has_valid_intake_join: false,
            intake_join_check: "join_missing",
            request_path: "/api/stripe/webhook",
            runtime_source: "vercel",
            upload_job_id: "2265599116648626375",
            vercel_env: "production",
            vercel_region: "syd1",
          }),
        },
      })
      expect((inserted[0] as { payload: { metadata: { env_preflight: unknown } } }).payload.metadata.env_preflight).toMatchObject({
        google_ads_client_id: true,
        google_ads_client_secret: true,
        google_ads_conversion_action_purchase: true,
        google_ads_customer_id: true,
        google_ads_developer_token: true,
        google_ads_refresh_token: true,
      })
    } finally {
      for (const [key, value] of Object.entries(originals)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })

  it("audits a no-click skip when enhanced conversions are disabled", async () => {
    process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS_DISABLED = "true"
    const { inserted, supabase } = googleAdsSupabaseMock()

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
