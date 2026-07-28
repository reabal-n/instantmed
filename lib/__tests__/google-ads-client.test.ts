import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getGoogleAdsMutateUrl,
  getGoogleAdsSearchUrl,
  mutateGoogleAds,
  resetGoogleAdsAccessTokenCacheForTests,
  searchGoogleAds,
} from "@/lib/google-ads/client"

const originalEnv = { ...process.env }

function configureGoogleAdsEnv(): void {
  process.env.GOOGLE_ADS_CUSTOMER_ID = "123-456-7890"
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token"
  process.env.GOOGLE_ADS_CLIENT_ID = "client-id"
  process.env.GOOGLE_ADS_CLIENT_SECRET = "client-secret"
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh-token"
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = "999-888-7777"
  process.env.GOOGLE_ADS_QUOTA_PROJECT_ID = "quota-project"
  delete process.env.GOOGLE_ADS_API_VERSION
}

describe("shared Google Ads client", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    configureGoogleAdsEnv()
    resetGoogleAdsAccessTokenCacheForTests()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    resetGoogleAdsAccessTokenCacheForTests()
    vi.unstubAllGlobals()
  })

  it("uses the v24 search and atomic mutate endpoints", () => {
    expect(getGoogleAdsSearchUrl("1234567890")).toBe(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:search",
    )
    expect(getGoogleAdsMutateUrl("1234567890")).toBe(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:mutate",
    )
  })

  it("sends OAuth, manager, developer-token, and quota-project headers", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ customer: { id: "1234567890" } }],
      }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(searchGoogleAds("SELECT customer.id FROM customer")).resolves.toEqual([
      { customer: { id: "1234567890" } },
    ])

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:search",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer access-token",
          "developer-token": "developer-token",
          "login-customer-id": "9998887777",
          "x-goog-user-project": "quota-project",
        },
        body: JSON.stringify({
          query: "SELECT customer.id FROM customer",
        }),
      }),
    )
  })

  it("reuses a healthy access token across searches", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "cached-access-token",
        expires_in: 3600,
      }), { status: 200 }))
      .mockImplementation(async () =>
        new Response(JSON.stringify({ results: [] }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await searchGoogleAds("SELECT customer.id FROM customer")
    await searchGoogleAds("SELECT campaign.id FROM campaign")

    const tokenCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "https://oauth2.googleapis.com/token",
    )
    expect(tokenCalls).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("validates or applies all operations atomically and returns a request receipt", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        mutateOperationResponses: [{
          campaignResult: {
            resourceName: "customers/1234567890/campaigns/222",
          },
        }],
      }), {
        status: 200,
        headers: { "request-id": "request-123" },
      }))
    vi.stubGlobal("fetch", fetchMock)

    const operations = [{
      campaignOperation: {
        update: {
          resourceName: "customers/1234567890/campaigns/222",
          status: "PAUSED",
        },
        updateMask: "status",
      },
    }]

    await expect(mutateGoogleAds({
      operations,
      validateOnly: true,
    })).resolves.toEqual({
      ok: true,
      requestId: "request-123",
      results: [{
        campaignResult: {
          resourceName: "customers/1234567890/campaigns/222",
        },
      }],
      rawError: null,
    })

    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      mutateOperations: operations,
      partialFailure: false,
      responseContentType: "MUTABLE_RESOURCE",
      validateOnly: true,
    })
  })

  it("returns a fail-closed receipt for API and configuration failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Request contains an invalid argument." },
      }), {
        status: 400,
        headers: { "request-id": "request-failed" },
      }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(mutateGoogleAds({
      operations: [{ campaignOperation: { remove: "campaign-resource" } }],
      validateOnly: false,
    })).resolves.toEqual({
      ok: false,
      requestId: "request-failed",
      results: [],
      rawError: JSON.stringify({
        error: { message: "Request contains an invalid argument." },
      }),
    })

    delete process.env.GOOGLE_ADS_CUSTOMER_ID
    await expect(mutateGoogleAds({
      operations: [],
      validateOnly: true,
    })).resolves.toEqual({
      ok: false,
      requestId: null,
      results: [],
      rawError: "missing_env",
    })
  })
})
