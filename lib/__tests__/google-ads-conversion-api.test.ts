import { describe, expect, it, vi } from "vitest"

import {
  buildGoogleAdsClickConversionRequest,
  fireGoogleAdsPurchaseConversion,
  getGoogleAdsUploadClickConversionsUrl,
  selectGoogleAdsClickIdentifier,
} from "@/lib/analytics/google-ads-conversion-api"

describe("google ads conversion api", () => {
  it("uses the current Google Ads uploadClickConversions endpoint", () => {
    expect(getGoogleAdsUploadClickConversionsUrl("1234567890")).toBe(
      "https://googleads.googleapis.com/v24/customers/1234567890:uploadClickConversions",
    )
  })

  it("sends exactly one click identifier using the safest priority order", () => {
    expect(selectGoogleAdsClickIdentifier({
      gclid: " gclid-value ",
      gbraid: "gbraid-value",
      wbraid: "wbraid-value",
    })).toEqual({ gclid: "gclid-value" })

    expect(selectGoogleAdsClickIdentifier({
      gclid: "",
      gbraid: "gbraid-value",
      wbraid: "wbraid-value",
    })).toEqual({ gbraid: "gbraid-value" })

    expect(selectGoogleAdsClickIdentifier({
      gclid: null,
      gbraid: null,
      wbraid: "wbraid-value",
    })).toEqual({ wbraid: "wbraid-value" })
  })

  it("builds the purchase upload body with order id, value, AUD and partial failures", () => {
    const request = buildGoogleAdsClickConversionRequest(
      {
        orderId: "intake_123",
        gclid: "gclid-value",
        gbraid: "gbraid-value",
        value: 49.95,
        conversionDateTime: new Date("2026-05-03T00:00:00.000Z"),
      },
      {
        customerId: "1234567890",
        conversionActionId: "9876543210",
      },
    )

    expect(request).toMatchObject({
      partialFailureEnabled: true,
      conversions: [
        {
          conversionAction: "customers/1234567890/conversionActions/9876543210",
          gclid: "gclid-value",
          conversionValue: 49.95,
          currencyCode: "AUD",
          orderId: "intake_123",
        },
      ],
    })
    expect(request?.conversions[0]).not.toHaveProperty("gbraid")
    expect(request?.conversions[0].conversionDateTime).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    )
  })

  it("skips request construction when no Google click id is present", () => {
    expect(buildGoogleAdsClickConversionRequest(
      { orderId: "intake_123", value: 49.95 },
      { customerId: "1234567890", conversionActionId: "9876543210" },
    )).toBeNull()
  })

  it("treats Google Ads partial failures as failed uploads", async () => {
    const originalFetch = global.fetch
    const originalEnv = { ...process.env }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "access-token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          partialFailureError: { message: "The click id could not be found" },
        }),
      }) as typeof fetch

    process.env.GOOGLE_ADS_CUSTOMER_ID = "1234567890"
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"
    process.env.GOOGLE_ADS_CLIENT_ID = "client-id"
    process.env.GOOGLE_ADS_CLIENT_SECRET = "client-secret"
    process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh-token"
    process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "9876543210"

    await expect(fireGoogleAdsPurchaseConversion({
      orderId: "intake_123",
      gclid: "gclid-value",
      value: 49.95,
    })).resolves.toMatchObject({
      attempted: true,
      ok: false,
      error: "partial_failure",
    })

    global.fetch = originalFetch
    process.env = originalEnv
  })
})
