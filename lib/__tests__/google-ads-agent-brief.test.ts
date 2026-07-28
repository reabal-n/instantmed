import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  formatDailyAdsBrief,
} from "@/lib/ads-agent/brief"
import type {
  AdsAgentSnapshot,
  AdsRecommendation,
  CampaignEconomics,
  CampaignPortfolioEconomics,
} from "@/lib/ads-agent/types"

function campaign(
  campaignId: string,
  campaignName: string,
  overrides: Partial<CampaignEconomics> = {},
): CampaignEconomics {
  return {
    campaignId,
    campaignName,
    campaignResourceName: `customers/123/campaigns/${campaignId}`,
    campaignStatus: "ENABLED",
    channel: "SEARCH",
    contributionCents: 0,
    contributionMargin: null,
    grossRevenueCents: 0,
    netRetainedRevenueCents: 0,
    orders: 0,
    refundCents: 0,
    refundedOrders: 0,
    refundRate: null,
    serviceOrders: {},
    spendCents: 0,
    stripeFeeCents: 0,
    unavailableReasonCodes: [],
    ...overrides,
  }
}

function emptyPortfolio(): CampaignPortfolioEconomics {
  return {
    campaignCount: 0,
    contributionCents: 0,
    contributionMargin: null,
    grossRevenueCents: 0,
    netRetainedRevenueCents: 0,
    orders: 0,
    refundCents: 0,
    refundedOrders: 0,
    refundRate: null,
    spendCents: 0,
    stripeFeeCents: 0,
    unavailableReasonCodes: [],
  }
}

function briefFixture(): {
  recommendations: AdsRecommendation[]
  snapshot: AdsAgentSnapshot
} {
  const daily = [
    campaign("scripts", "IM | Search | Scripts", {
      contributionCents: 3800,
      contributionMargin: 0.5,
      grossRevenueCents: 7000,
      netRetainedRevenueCents: 6500,
      orders: 2,
      refundRate: 0,
      serviceOrders: { scripts: 2 },
      spendCents: 1200,
      stripeFeeCents: 1500,
    }),
    campaign("med", "IM | Search | Med Certs", {
      contributionCents: 1000,
      contributionMargin: 0.25,
      grossRevenueCents: 5000,
      netRetainedRevenueCents: 5000,
      orders: 1,
      refundRate: 0,
      serviceOrders: { med_certs: 1 },
      spendCents: 1400,
      stripeFeeCents: 2600,
    }),
    campaign("hair", "IM | Search | Hair Loss | Pilot"),
    campaign("ed", "IM | Search | ED | Pilot"),
    campaign("women", "IM | Search | Women's Health | Pilot", {
      campaignStatus: "PAUSED",
    }),
  ]
  const rolling30 = [
    campaign("scripts", "IM | Search | Scripts", {
      contributionCents: 18800,
      contributionMargin: 0.34,
      grossRevenueCents: 60900,
      netRetainedRevenueCents: 55900,
      orders: 21,
      refundRate: 3 / 21,
      serviceOrders: { scripts: 21 },
      spendCents: 34364,
      stripeFeeCents: 2701,
    }),
    campaign("med", "IM | Search | Med Certs", {
      contributionCents: -1100,
      contributionMargin: -0.03,
      grossRevenueCents: 40425,
      netRetainedRevenueCents: 40425,
      orders: 14,
      refundRate: 0,
      serviceOrders: { med_certs: 14 },
      spendCents: 40363,
      stripeFeeCents: 1112,
    }),
    campaign("hair", "IM | Search | Hair Loss | Pilot", {
      contributionCents: -10600,
      grossRevenueCents: 4995,
      netRetainedRevenueCents: 4995,
      orders: 1,
      refundRate: 0,
      serviceOrders: { hair_loss: 1 },
      spendCents: 15472,
      stripeFeeCents: 114,
    }),
    campaign("ed", "IM | Search | ED | Pilot", {
      contributionCents: -3100,
      spendCents: 3108,
    }),
    campaign("women", "IM | Search | Women's Health | Pilot", {
      campaignStatus: "PAUSED",
    }),
  ]
  const empty = emptyPortfolio()
  const dailyEnabled: CampaignPortfolioEconomics = {
    campaignCount: 4,
    contributionCents: 4800,
    contributionMargin: 4800 / 11500,
    grossRevenueCents: 12000,
    netRetainedRevenueCents: 11500,
    orders: 3,
    refundCents: 500,
    refundedOrders: 1,
    refundRate: 1 / 3,
    spendCents: 2600,
    stripeFeeCents: 4100,
    unavailableReasonCodes: [],
  }
  const rolling30Enabled: CampaignPortfolioEconomics = {
    campaignCount: 4,
    contributionCents: 4000,
    contributionMargin: 4000 / 101320,
    grossRevenueCents: 106320,
    netRetainedRevenueCents: 101320,
    orders: 36,
    refundCents: 5000,
    refundedOrders: 3,
    refundRate: 3 / 36,
    spendCents: 93307,
    stripeFeeCents: 3927,
    unavailableReasonCodes: [],
  }

  return {
    recommendations: [
      {
        kind: "HOLD",
        proposedMutationFamily: null,
        reasonCodes: ["SCRIPTS_REFUND_GATE"],
        service: "scripts",
      },
      {
        kind: "HOLD",
        proposedMutationFamily: null,
        reasonCodes: ["MEDCERT_NEGATIVE_CONTRIBUTION"],
        service: "med_certs",
      },
    ],
    snapshot: {
      account: {
        accountHash: "a".repeat(64),
        asOf: "2026-07-28T00:00:00.000Z",
        autoTaggingEnabled: true,
        dailyBudgetTotalCents: 8400,
        finalUrlSuffix: "utm_source=google&utm_medium=cpc",
        lastChangeActor: null,
        lastChangeAt: null,
      },
      daily,
      generatedAt: "2026-07-28T00:00:00.000Z",
      inputs: {},
      reportDate: "2026-07-27",
      rolling30,
      totals: {
        daily: { enabled: dailyEnabled, other: empty, paused: empty },
        rolling30: {
          enabled: rolling30Enabled,
          other: empty,
          paused: empty,
        },
      },
      tracking: {
        evidenceAsOf: "2026-07-28T00:00:00.000Z",
        reasonCodes: [],
        scaleAllowed: true,
        state: "GREEN",
      },
      windows: {
        daily: {
          endDate: "2026-07-27",
          endUtcExclusive: "2026-07-27T14:00:00.000Z",
          startDate: "2026-07-27",
          startUtc: "2026-07-26T14:00:00.000Z",
        },
        rolling30: {
          endDate: "2026-07-27",
          endUtcExclusive: "2026-07-27T14:00:00.000Z",
          startDate: "2026-06-28",
          startUtc: "2026-06-27T14:00:00.000Z",
        },
      },
    },
  }
}

describe("Google Ads Agent daily brief", () => {
  it("renders a scan-friendly aggregate report in at most six lines", () => {
    const { recommendations, snapshot } = briefFixture()

    const message = formatDailyAdsBrief(snapshot, recommendations)

    expect(message).toBe([
      "Ads · Mon 27 Jul · after ad spend + Stripe fees",
      "Yesterday: +A$48 · 3 orders · A$26 spent",
      "30 days: +A$40 · 36 orders · A$933 spent",
      "Services, 30 days: Scripts +A$188 · Med −A$11",
      "Pilots, 30 days: Hair −A$106 · ED −A$31 · Women paused",
      "GREEN tracking · HOLD · Scripts refund data still immature · No changes",
    ].join("\n"))
    expect(message.split("\n").length).toBeLessThanOrEqual(6)
  })

  it("never formats routine diagnostics or sensitive attribution payloads", () => {
    const { recommendations, snapshot } = briefFixture()
    const message = formatDailyAdsBrief(snapshot, recommendations)

    for (const forbidden of [
      "CTR",
      "Quality Score",
      "impressions",
      "keyword",
      "gclid",
      "patient",
      "medication",
    ]) {
      expect(message.toLowerCase()).not.toContain(forbidden.toLowerCase())
    }
  })
})

describe("Google Ads Agent Telegram brief sender", () => {
  const originalEnv = { ...process.env }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    process.env.TELEGRAM_BOT_TOKEN = "test-token"
    process.env.TELEGRAM_CHAT_ID = "123456"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it("reuses the configured bot and chat and returns the Telegram message receipt", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { message_id: 9042 } }),
    })
    const { sendGoogleAdsDailyBriefViaTelegram } = await import(
      "@/lib/notifications/telegram"
    )

    await expect(
      sendGoogleAdsDailyBriefViaTelegram("Ads · Mon 27 Jul\nTracking GREEN"),
    ).resolves.toEqual({ messageId: 9042 })

    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.telegram.org/bottest-token/sendMessage",
    )
    expect(request).toEqual({
      chat_id: "123456",
      disable_web_page_preview: true,
      text: "Ads · Mon 27 Jul\nTracking GREEN",
    })
  })

  it("fails closed when Telegram cannot provide a durable message id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: {} }),
    })
    const { sendGoogleAdsDailyBriefViaTelegram } = await import(
      "@/lib/notifications/telegram"
    )

    await expect(
      sendGoogleAdsDailyBriefViaTelegram("Tracking RED"),
    ).rejects.toThrow("Telegram Ads brief response missing message_id")
  })
})
