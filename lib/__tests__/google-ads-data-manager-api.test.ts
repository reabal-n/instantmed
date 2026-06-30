import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildGoogleAdsDataManagerIngestRequest,
  buildGoogleAdsDataManagerUserIdentifiers,
  extractGoogleDataManagerErrorCode,
  fireGoogleAdsDataManagerPurchaseConversion,
  getGoogleDataManagerIngestUrl,
  getGoogleDataManagerRequestStatusUrl,
  resetGoogleDataManagerAccessTokenCacheForTests,
  retrieveGoogleDataManagerRequestStatus,
} from "@/lib/analytics/google-ads-data-manager-api"

describe("google ads data manager api", () => {
  afterEach(() => {
    resetGoogleDataManagerAccessTokenCacheForTests()
    vi.restoreAllMocks()
  })

  it("uses the current Data Manager ingest and request-status endpoints", () => {
    expect(getGoogleDataManagerIngestUrl()).toBe("https://datamanager.googleapis.com/v1/events:ingest")
    expect(getGoogleDataManagerRequestStatusUrl("request-123")).toBe(
      "https://datamanager.googleapis.com/v1/requestStatus:retrieve?requestId=request-123",
    )
  })

  it("builds the purchase ingest body using Data Manager destination and event fields", () => {
    const request = buildGoogleAdsDataManagerIngestRequest(
      {
        orderId: "intake_123",
        gclid: "gclid-value",
        gbraid: "gbraid-value",
        value: 49.95,
        conversionDateTime: new Date("2026-05-03T00:00:00.000Z"),
        userData: { email: "test@example.com", phone: "0412 345 678" },
      },
      {
        conversionActionId: "7631611119",
        customerId: "9205010513",
        loginCustomerId: "8973788544",
      },
    )

    expect(request).toEqual({
      destinations: [
        {
          operatingAccount: {
            accountId: "9205010513",
            accountType: "GOOGLE_ADS",
          },
          loginAccount: {
            accountId: "8973788544",
            accountType: "GOOGLE_ADS",
          },
          productDestinationId: "7631611119",
        },
      ],
      encoding: "HEX",
      events: [
        {
          adIdentifiers: {
            gclid: "gclid-value",
          },
          consent: {
            adUserData: "CONSENT_GRANTED",
          },
          conversionValue: 49.95,
          currency: "AUD",
          eventSource: "WEB",
          eventTimestamp: "2026-05-03T00:00:00.000Z",
          transactionId: "intake_123",
          userData: {
            userIdentifiers: [
              {
                emailAddress: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
              },
              {
                phoneNumber: "bc65da54a3ddbacfdc93a0400f0a2d78e41c2180c8255015e9616facfe56f58a",
              },
            ],
          },
        },
      ],
    })
  })

  it("omits optional user-data and login-account fields when they are unavailable", () => {
    const request = buildGoogleAdsDataManagerIngestRequest(
      {
        orderId: "intake_123",
        wbraid: "wbraid-value",
        value: 24.95,
      },
      {
        conversionActionId: "customers/9205010513/conversionActions/7631611119",
        customerId: "920-501-0513",
      },
    )

    expect(request).toMatchObject({
      destinations: [
        {
          operatingAccount: {
            accountId: "9205010513",
            accountType: "GOOGLE_ADS",
          },
          productDestinationId: "7631611119",
        },
      ],
      events: [
        {
          adIdentifiers: {
            wbraid: "wbraid-value",
          },
          currency: "AUD",
          eventSource: "WEB",
          transactionId: "intake_123",
        },
      ],
    })
    expect(request?.destinations[0]).not.toHaveProperty("loginAccount")
    expect(request?.events[0]).not.toHaveProperty("userData")
    expect(request?.events[0]).not.toHaveProperty("consent")
  })

  it("skips request construction when no click id or usable user data is present", () => {
    expect(buildGoogleAdsDataManagerIngestRequest(
      { orderId: "intake_123", value: 49.95 },
      { conversionActionId: "7631611119", customerId: "9205010513" },
    )).toBeNull()
  })

  it("builds one Data Manager user identifier per hashed field", () => {
    expect(buildGoogleAdsDataManagerUserIdentifiers({
      email: "test@example.com",
      phone: "0412 345 678",
    })).toEqual([
      { emailAddress: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b" },
      { phoneNumber: "bc65da54a3ddbacfdc93a0400f0a2d78e41c2180c8255015e9616facfe56f58a" },
    ])
  })

  it("returns explicit skip reasons for missing Data Manager env and OAuth failures", async () => {
    const originalEnv = { ...process.env }
    const originalFetch = global.fetch
    global.fetch = vi.fn() as typeof fetch

    try {
      delete process.env.GOOGLE_DATA_MANAGER_CLIENT_ID
      delete process.env.GOOGLE_DATA_MANAGER_CLIENT_SECRET
      delete process.env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN
      process.env.GOOGLE_ADS_CUSTOMER_ID = "9205010513"
      process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "7631611119"

      await expect(fireGoogleAdsDataManagerPurchaseConversion({
        orderId: "intake_123",
        gclid: "gclid-value",
        value: 49.95,
      })).resolves.toMatchObject({
        attempted: false,
        error: "missing_env",
      })

      process.env.GOOGLE_DATA_MANAGER_CLIENT_ID = "client-id"
      process.env.GOOGLE_DATA_MANAGER_CLIENT_SECRET = "client-secret"
      process.env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN = "refresh-token"
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      await expect(fireGoogleAdsDataManagerPurchaseConversion({
        orderId: "intake_123",
        gclid: "gclid-value",
        value: 49.95,
      })).resolves.toMatchObject({
        attempted: false,
        error: "no_access_token",
      })
    } finally {
      process.env = originalEnv
      global.fetch = originalFetch
    }
  })

  it("posts Data Manager conversions without a developer token and returns the request id", async () => {
    const originalEnv = { ...process.env }
    const originalFetch = global.fetch

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "access-token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ requestId: "126365e1-16d0-4c81-9de9-f362711e250a" }),
      }) as typeof fetch

    try {
      process.env.GOOGLE_DATA_MANAGER_CLIENT_ID = "client-id"
      process.env.GOOGLE_DATA_MANAGER_CLIENT_SECRET = "client-secret"
      process.env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN = "refresh-token"
      process.env.GOOGLE_DATA_MANAGER_QUOTA_PROJECT_ID = "quota-project"
      process.env.GOOGLE_ADS_CUSTOMER_ID = "9205010513"
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = "8973788544"
      process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE = "7631611119"
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"

      await expect(fireGoogleAdsDataManagerPurchaseConversion({
        orderId: "intake_123",
        gclid: "gclid-value",
        value: 49.95,
        conversionDateTime: new Date("2026-05-03T00:00:00.000Z"),
      })).resolves.toMatchObject({
        attempted: true,
        ok: true,
        requestId: "126365e1-16d0-4c81-9de9-f362711e250a",
      })

      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://datamanager.googleapis.com/v1/events:ingest",
        expect.objectContaining({
          headers: expect.not.objectContaining({
            "developer-token": expect.any(String),
          }),
          method: "POST",
        }),
      )
      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://datamanager.googleapis.com/v1/events:ingest",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-goog-user-project": "quota-project",
          }),
        }),
      )
    } finally {
      process.env = originalEnv
      global.fetch = originalFetch
    }
  })

  it("extracts compact Data Manager API error codes from REST error bodies", () => {
    const body = JSON.stringify({
      error: {
        code: 400,
        status: "INVALID_ARGUMENT",
        message: "Invalid product destination id",
        details: [
          {
            reason: "INVALID_DESTINATION",
          },
        ],
      },
    })

    expect(extractGoogleDataManagerErrorCode(body, 400)).toBe(
      "INVALID_ARGUMENT:INVALID_DESTINATION:Invalid_product_destination_id",
    )
  })

  it("retrieves Data Manager request status by request id", async () => {
    const originalEnv = { ...process.env }
    const originalFetch = global.fetch
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "access-token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          requestStatusPerDestination: [
            {
              requestStatus: "SUCCESS",
              eventsIngestionStatus: {},
            },
          ],
        }),
      }) as typeof fetch

    try {
      process.env.GOOGLE_DATA_MANAGER_CLIENT_ID = "client-id"
      process.env.GOOGLE_DATA_MANAGER_CLIENT_SECRET = "client-secret"
      process.env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN = "refresh-token"

      await expect(retrieveGoogleDataManagerRequestStatus("request-123")).resolves.toMatchObject({
        attempted: true,
        ok: true,
        status: "SUCCESS",
      })

      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://datamanager.googleapis.com/v1/requestStatus:retrieve?requestId=request-123",
        expect.objectContaining({ method: "GET" }),
      )
    } finally {
      process.env = originalEnv
      global.fetch = originalFetch
    }
  })
})
