import { describe, expect, it } from "vitest"

import {
  buildGoogleAdsClickConversionRequest,
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
})
