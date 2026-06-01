import { afterEach, describe, expect, it } from "vitest"

import { runGoogleAdsPostPaymentAttribution } from "@/lib/analytics/google-ads-post-payment"

describe("Google Ads post-payment attribution", () => {
  const originalDisabled = process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED

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
})
