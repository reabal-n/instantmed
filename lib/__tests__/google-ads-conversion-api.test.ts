import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildGoogleAdsClickConversionRequest,
  buildGoogleAdsConversionActionPreflightQuery,
  buildGoogleAdsUserIdentifiers,
  classifyGoogleAdsConversionActionPreflight,
  extractGoogleAdsErrorCode,
  fireGoogleAdsPurchaseConversion,
  getGoogleAdsSearchUrl,
  getGoogleAdsUploadClickConversionsUrl,
  hashEmailForGoogleAds,
  hashPhoneForGoogleAds,
  normalizeEmailForGoogleAds,
  normalizePhoneForGoogleAds,
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

  it("normalizes emails to Google's enhanced-conversions spec", () => {
    // lowercase + trim, and gmail/googlemail drops dots in the local part.
    expect(normalizeEmailForGoogleAds("  Test.User@Gmail.com ")).toBe("testuser@gmail.com")
    expect(normalizeEmailForGoogleAds("Test.User@GoogleMail.com")).toBe("testuser@googlemail.com")
    // Non-gmail domains KEEP dots — stripping them would break the match.
    expect(normalizeEmailForGoogleAds("Test.User@Example.com")).toBe("test.user@example.com")
    // Unusable inputs return null so we never send a garbage identifier.
    expect(normalizeEmailForGoogleAds("not-an-email")).toBeNull()
    expect(normalizeEmailForGoogleAds("@example.com")).toBeNull()
    expect(normalizeEmailForGoogleAds("")).toBeNull()
    expect(normalizeEmailForGoogleAds(null)).toBeNull()
  })

  it("hashes normalized emails as lowercase SHA-256 hex (matches Google's side)", () => {
    // Golden vectors: sha256 hex of the normalized address.
    expect(hashEmailForGoogleAds("test@example.com")).toBe(
      "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
    )
    expect(hashEmailForGoogleAds("  Test.User@Gmail.com ")).toBe(
      "dae9c7c55697ba170d6b494c458649bd469af525520280d0dcfc98d74d13b17e",
    )
    expect(hashEmailForGoogleAds("bad")).toBeNull()
  })

  it("normalizes phone numbers to E.164, defaulting bare national numbers to AU", () => {
    expect(normalizePhoneForGoogleAds("0412 345 678")).toBe("+61412345678")
    expect(normalizePhoneForGoogleAds("+61 412 345 678")).toBe("+61412345678")
    expect(normalizePhoneForGoogleAds("61412345678")).toBe("+61412345678")
    expect(normalizePhoneForGoogleAds("412345678")).toBe("+61412345678")
    expect(normalizePhoneForGoogleAds("+1 800 555 0102")).toBe("+18005550102")
    expect(normalizePhoneForGoogleAds("abc")).toBeNull()
    expect(normalizePhoneForGoogleAds("")).toBeNull()
    expect(normalizePhoneForGoogleAds(null)).toBeNull()
  })

  it("hashes E.164 phone numbers as lowercase SHA-256 hex (leading + included)", () => {
    // Golden vector: sha256 hex of "+61412345678".
    expect(hashPhoneForGoogleAds("0412 345 678")).toBe(
      "bc65da54a3ddbacfdc93a0400f0a2d78e41c2180c8255015e9616facfe56f58a",
    )
    expect(hashPhoneForGoogleAds("abc")).toBeNull()
  })

  it("builds one FIRST_PARTY user identifier per provided field (oneof)", () => {
    expect(buildGoogleAdsUserIdentifiers({ email: "test@example.com" })).toEqual([
      {
        hashedEmail: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
        userIdentifierSource: "FIRST_PARTY",
      },
    ])
    // Email + phone → two separate identifier objects, email first.
    expect(buildGoogleAdsUserIdentifiers({ email: "test@example.com", phone: "0412 345 678" })).toEqual([
      {
        hashedEmail: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
        userIdentifierSource: "FIRST_PARTY",
      },
      {
        hashedPhoneNumber: "bc65da54a3ddbacfdc93a0400f0a2d78e41c2180c8255015e9616facfe56f58a",
        userIdentifierSource: "FIRST_PARTY",
      },
    ])
    // Phone only.
    expect(buildGoogleAdsUserIdentifiers({ phone: "0412 345 678" })).toEqual([
      {
        hashedPhoneNumber: "bc65da54a3ddbacfdc93a0400f0a2d78e41c2180c8255015e9616facfe56f58a",
        userIdentifierSource: "FIRST_PARTY",
      },
    ])
    expect(buildGoogleAdsUserIdentifiers({ email: null, phone: null })).toEqual([])
    expect(buildGoogleAdsUserIdentifiers(null)).toEqual([])
  })

  it("attaches hashed userIdentifiers to the upload when userData is present", () => {
    const request = buildGoogleAdsClickConversionRequest(
      { orderId: "intake_123", gclid: "gclid-value", value: 49.95, userData: { email: "test@example.com" } },
      { customerId: "1234567890", conversionActionId: "9876543210" },
    )

    expect(request?.conversions[0].userIdentifiers).toEqual([
      {
        hashedEmail: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
        userIdentifierSource: "FIRST_PARTY",
      },
    ])
  })

  it("omits userIdentifiers entirely when no usable email is present", () => {
    const noUserData = buildGoogleAdsClickConversionRequest(
      { orderId: "intake_123", gclid: "gclid-value", value: 49.95 },
      { customerId: "1234567890", conversionActionId: "9876543210" },
    )
    expect(noUserData?.conversions[0]).not.toHaveProperty("userIdentifiers")

    const badEmail = buildGoogleAdsClickConversionRequest(
      { orderId: "intake_123", gclid: "gclid-value", value: 49.95, userData: { email: "not-an-email" } },
      { customerId: "1234567890", conversionActionId: "9876543210" },
    )
    expect(badEmail?.conversions[0]).not.toHaveProperty("userIdentifiers")
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

  it("does not fall back to a hard-coded purchase conversion action", async () => {
    const originalEnv = { ...process.env }
    const originalFetch = global.fetch
    global.fetch = vi.fn() as typeof fetch

    process.env.GOOGLE_ADS_CUSTOMER_ID = "9205010513"
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"
    process.env.GOOGLE_ADS_CLIENT_ID = "client-id"
    process.env.GOOGLE_ADS_CLIENT_SECRET = "client-secret"
    process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh-token"
    delete process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE

    await expect(preflightGoogleAdsPurchaseConversionAction()).resolves.toMatchObject({
      code: "missing_env",
      conversionAction: null,
      ok: false,
      severity: "error",
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
