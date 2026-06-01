import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildGoogleAdsClickConversionRequest,
  buildGoogleAdsConversionActionPreflightQuery,
  classifyGoogleAdsConversionActionPreflight,
  extractGoogleAdsErrorCode,
  fireGoogleAdsPurchaseConversion,
  getGoogleAdsSearchUrl,
  getGoogleAdsUploadClickConversionsUrl,
  preflightGoogleAdsPurchaseConversionAction,
  resetGoogleAdsAccessTokenCacheForTests,
  selectGoogleAdsClickIdentifier,
} from "@/lib/analytics/google-ads-conversion-api"

describe("google ads conversion api", () => {
  afterEach(() => {
    resetGoogleAdsAccessTokenCacheForTests()
  })

  it("uses the current Google Ads uploadClickConversions endpoint", () => {
    expect(getGoogleAdsUploadClickConversionsUrl("1234567890")).toBe(
      "https://googleads.googleapis.com/v24/customers/1234567890:uploadClickConversions",
    )
  })

  it("uses the current Google Ads search endpoint for conversion-action preflight checks", () => {
    expect(getGoogleAdsSearchUrl("1234567890")).toBe(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:search",
    )
  })

  it("sends exactly one click identifier using Google Ads import rules", () => {
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
      partialFailure: true,
      conversions: [
        {
          conversionAction: "customers/1234567890/conversionActions/9876543210",
          gclid: "gclid-value",
          conversionEnvironment: "WEB",
          conversionValue: 49.95,
          currencyCode: "AUD",
          orderId: "intake_123",
        },
      ],
    })
    expect(request?.conversions[0]).not.toHaveProperty("gbraid")
    expect(request?.conversions[0]).not.toHaveProperty("wbraid")
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

  it("builds a targeted conversion action preflight query", () => {
    expect(buildGoogleAdsConversionActionPreflightQuery("9876543210")).toBe(
      [
        "SELECT",
        "conversion_action.id,",
        "conversion_action.name,",
        "conversion_action.resource_name,",
        "conversion_action.status,",
        "conversion_action.type",
        "FROM conversion_action",
        "WHERE conversion_action.id = 9876543210",
        "LIMIT 1",
      ].join(" "),
    )
  })

  it("classifies non-upload conversion actions before uploads burn attempts", () => {
    expect(classifyGoogleAdsConversionActionPreflight({
      id: "9876543210",
      name: "Website purchase",
      resourceName: "customers/1234567890/conversionActions/9876543210",
      status: "ENABLED",
      type: "WEBPAGE",
    })).toMatchObject({
      code: "invalid_conversion_action_type",
      ok: false,
      severity: "error",
    })

    expect(classifyGoogleAdsConversionActionPreflight({
      id: "9876543210",
      name: "Offline purchase",
      resourceName: "customers/1234567890/conversionActions/9876543210",
      status: "ENABLED",
      type: "UPLOAD_CLICKS",
    })).toMatchObject({
      code: null,
      ok: true,
      severity: "ok",
    })
  })

  it("preflights the configured purchase conversion action without exposing credentials", async () => {
    const originalFetch = global.fetch
    const originalEnv = { ...process.env }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "access-token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              conversionAction: {
                id: "9876543210",
                name: "Website purchase",
                resourceName: "customers/1234567890/conversionActions/9876543210",
                status: "ENABLED",
                type: "WEBPAGE",
              },
            },
          ],
        }),
      }) as typeof fetch

    process.env.GOOGLE_ADS_CUSTOMER_ID = "1234567890"
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"
    process.env.GOOGLE_ADS_CLIENT_ID = "client-id"
    process.env.GOOGLE_ADS_CLIENT_SECRET = "client-secret"
    process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh-token"
    process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "9876543210"

    await expect(preflightGoogleAdsPurchaseConversionAction()).resolves.toMatchObject({
      code: "invalid_conversion_action_type",
      conversionAction: {
        id: "9876543210",
        status: "ENABLED",
        type: "WEBPAGE",
      },
      ok: false,
      severity: "error",
    })

    expect(global.fetch).toHaveBeenLastCalledWith(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:search",
      expect.objectContaining({
        body: expect.not.stringContaining("pageSize"),
        method: "POST",
      }),
    )
    expect(global.fetch).toHaveBeenLastCalledWith(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:search",
      expect.objectContaining({
        body: expect.stringContaining("conversion_action.id = 9876543210"),
        method: "POST",
      }),
    )

    global.fetch = originalFetch
    process.env = originalEnv
  })

  it("returns explicit skip reasons so webhook/cron runners can audit failures", async () => {
    const originalEnv = { ...process.env }
    const originalFetch = global.fetch
    global.fetch = vi.fn() as typeof fetch

    delete process.env.GOOGLE_ADS_CUSTOMER_ID
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    delete process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE

    await expect(fireGoogleAdsPurchaseConversion({
      orderId: "intake_123",
      gclid: "gclid-value",
      value: 49.95,
    })).resolves.toMatchObject({
      attempted: false,
      error: "missing_env",
    })

    process.env.GOOGLE_ADS_CUSTOMER_ID = "1234567890"
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"
    process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "9876543210"

    await expect(fireGoogleAdsPurchaseConversion({
      orderId: "intake_123",
      value: 49.95,
    })).resolves.toMatchObject({
      attempted: false,
      error: "missing_click_id",
    })

    expect(global.fetch).not.toHaveBeenCalled()
    global.fetch = originalFetch
    process.env = originalEnv
  })

  it("extracts compact Google Ads API error codes from REST error bodies", () => {
    const body = JSON.stringify({
      error: {
        message: "Request contains an invalid argument.",
        details: [
          {
            errors: [
              {
                errorCode: { conversionUploadError: "INVALID_CONVERSION_ACTION_TYPE" },
                message: "The conversion action specified in the upload request is not valid for uploads.",
              },
            ],
          },
        ],
      },
    })

    expect(extractGoogleAdsErrorCode(body, 400)).toBe(
      "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:The_conversion_action_specified_in_the_uplo",
    )

    const partialFailureBody = JSON.stringify({
      partialFailureError: {
        message: "Partial failure encountered.",
        details: [
          {
            errors: [
              {
                errorCode: { conversionUploadError: "TOO_RECENT_CONVERSION_ACTION" },
                message: "The conversion action was created too recently.",
              },
            ],
          },
        ],
      },
    })

    expect(extractGoogleAdsErrorCode(partialFailureBody, 200)).toBe(
      "conversionUploadError:TOO_RECENT_CONVERSION_ACTION:The_conversion_action_was_created_too_recentl",
    )
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
      error: "The_click_id_could_not_be_found",
    })

    global.fetch = originalFetch
    process.env = originalEnv
  })
})
