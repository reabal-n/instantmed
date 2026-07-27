import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  searchGoogleAds: vi.fn(),
}))

vi.mock("@/lib/google-ads/client", () => ({
  searchGoogleAds: mocks.searchGoogleAds,
}))

import {
  buildGoogleAdsAccountStateQueries,
  getAdsAccountState,
} from "@/lib/ads-agent/account-state"

function rowsForQuery(query: string): Record<string, unknown>[] {
  if (query.includes("FROM customer ")) {
    return [{
      customer: {
        autoTaggingEnabled: true,
        currencyCode: "AUD",
        finalUrlSuffix: "utm_source=google&utm_medium=cpc",
        id: "1234567890",
        resourceName: "customers/1234567890",
        timeZone: "Australia/Sydney",
      },
    }]
  }
  if (query.includes("FROM conversion_action")) {
    return [{
      conversionAction: {
        id: "111",
        name: "Purchase - Server",
        primaryForGoal: true,
        resourceName: "customers/1234567890/conversionActions/111",
        status: "ENABLED",
        type: "UPLOAD_CLICKS",
      },
    }]
  }
  if (query.includes("FROM campaign ")) {
    return [{
      campaign: {
        id: "222",
        name: "Medical Certificates",
        resourceName: "customers/1234567890/campaigns/222",
        status: "ENABLED",
      },
      campaignBudget: {
        amountMicros: "25000000",
        resourceName: "customers/1234567890/campaignBudgets/333",
      },
    }]
  }
  if (query.includes("FROM change_event")) {
    return [{
      changeEvent: {
        changeDateTime: "2026-07-27 08:30:00+10:00",
        changeResourceName: "customers/1234567890/campaigns/222",
        changeResourceType: "CAMPAIGN",
        clientType: "GOOGLE_ADS_WEB_CLIENT",
        resourceChangeOperation: "UPDATE",
        resourceName: "customers/1234567890/changeEvents/event-1",
        userEmail: "operator@example.test",
      },
    }]
  }
  return []
}

describe("Google Ads account state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchGoogleAds.mockImplementation(async (query: string) => rowsForQuery(query))
  })

  it("builds PHI-free queries for every governed account surface", () => {
    const queries = buildGoogleAdsAccountStateQueries()
    const joined = Object.values(queries).join("\n")

    expect(joined).toContain("customer.auto_tagging_enabled")
    expect(joined).toContain("conversion_action.primary_for_goal")
    expect(joined).toContain("campaign.network_settings.target_google_search")
    expect(joined).toContain("campaign_criterion.ad_schedule.day_of_week")
    expect(joined).toContain("ad_group_criterion.keyword.text")
    expect(joined).toContain("ad_group_ad.policy_summary.approval_status")
    expect(joined).toContain("campaign_asset.resource_name")
    expect(joined).toContain("customer_client_link.resource_name")
    expect(joined).toContain("customer_manager_link.resource_name")
    expect(joined).toContain("change_event.client_type")
    expect(joined).not.toContain("search_term_view")
    expect(joined).not.toContain("search_term_view.search_term")
    expect(joined).not.toContain("patient")
  })

  it("reads normalized resources and hashes the change actor", async () => {
    const state = await getAdsAccountState({
      now: new Date("2026-07-27T23:00:00.000Z"),
    })

    expect(state.readAt).toBe("2026-07-27T23:00:00.000Z")
    expect(state.customer).toEqual({
      autoTaggingEnabled: true,
      currencyCode: "AUD",
      finalUrlSuffix: "utm_source=google&utm_medium=cpc",
      id: "1234567890",
      resourceName: "customers/1234567890",
      timeZone: "Australia/Sydney",
    })
    expect(state.conversionActions[0]).toMatchObject({
      resourceName: "customers/1234567890/conversionActions/111",
      values: {
        conversionAction: {
          primaryForGoal: true,
          type: "UPLOAD_CLICKS",
        },
      },
    })
    expect(state.campaigns[0]).toMatchObject({
      resourceName: "customers/1234567890/campaigns/222",
    })
    expect(state.changeEvents[0]).toMatchObject({
      actorHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      changeResourceName: "customers/1234567890/campaigns/222",
      clientType: "GOOGLE_ADS_WEB_CLIENT",
    })
    expect(JSON.stringify(state)).not.toContain("operator@example.test")
    expect(mocks.searchGoogleAds).toHaveBeenCalledTimes(
      Object.keys(buildGoogleAdsAccountStateQueries()).length,
    )
  })

  it("propagates a critical account read failure", async () => {
    mocks.searchGoogleAds.mockRejectedValueOnce(new Error("google_ads_unavailable"))

    await expect(getAdsAccountState()).rejects.toThrow("google_ads_unavailable")
  })
})
