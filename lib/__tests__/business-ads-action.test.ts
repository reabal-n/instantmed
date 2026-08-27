import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getBusinessAdsActionEvidence } from "@/lib/admin/business-ads-action"
import {
  type AdsChangeProposal,
  getAdsProposalByKey,
} from "@/lib/ads-agent/proposals"
import type { DeliveredAdsAgentRunEvidence } from "@/lib/ads-agent/runs"
import type { AdsScaleAuthorizationEvidence } from "@/lib/ads-agent/scripts-scale-authorization"
import { readScriptsScaleAuthorizationEvidence } from "@/lib/ads-agent/scripts-scale-authorization-reader"
import type { AdsAgentSnapshot, CampaignEconomics } from "@/lib/ads-agent/types"

vi.mock("@/lib/ads-agent/proposals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ads-agent/proposals")>()
  return {
    ...actual,
    getAdsProposalByKey: vi.fn(),
  }
})

vi.mock("@/lib/ads-agent/scripts-scale-authorization-reader", () => ({
  readScriptsScaleAuthorizationEvidence: vi.fn(),
}))

const getProposalMock = vi.mocked(getAdsProposalByKey)
const readScaleEvidenceMock = vi.mocked(readScriptsScaleAuthorizationEvidence)

const NOW = new Date("2026-08-27T00:30:00.000Z")

function scriptsCampaign(): CampaignEconomics {
  return {
    biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
    budgetAmountMicros: 79_000_000,
    budgetResourceName: "customers/1/campaignBudgets/1",
    campaignId: "1",
    campaignName: "JDM | Search | Scripts",
    campaignResourceName: "customers/1/campaigns/1",
    campaignStatus: "ENABLED",
    channel: "SEARCH",
    clicks: 323,
    contributionCents: 144_545,
    contributionMargin: 0.4725,
    grossRevenueCents: 323_390,
    netRetainedRevenueCents: 303_440,
    orders: 98,
    refundCents: 19_950,
    refundedOrders: 7,
    refundRate: 0.0714,
    serviceOrders: { ed: 4, scripts: 94 },
    spendCents: 149_999,
    stripeFeeCents: 8_896,
    targetRoas: 1.5,
    unavailableReasonCodes: [],
  }
}

function snapshot(): AdsAgentSnapshot {
  const campaign = scriptsCampaign()
  return {
    account: {
      accountHash: "account-hash",
      asOf: "2026-08-26T23:00:00.000Z",
      autoTaggingEnabled: true,
      dailyBudgetTotalCents: 14_100,
      finalUrlSuffix: "utm_source=google",
      lastChangeActor: "actor-hash",
      lastChangeAt: "2026-08-24T07:14:29.128Z",
    },
    daily: [campaign],
    generatedAt: "2026-08-26T23:00:00.000Z",
    inputs: {
      accountState: {
        asOf: "2026-08-26T23:00:00.000Z",
        status: "fresh",
      },
    },
    reportDate: "2026-08-26",
    rolling30: [campaign],
    totals: {
      daily: {
        enabled: {
          campaignCount: 1,
          clicks: 323,
          contributionCents: 144_545,
          contributionMargin: 0.4725,
          grossRevenueCents: 323_390,
          netRetainedRevenueCents: 303_440,
          orders: 98,
          refundCents: 19_950,
          refundedOrders: 7,
          refundRate: 0.0714,
          spendCents: 149_999,
          stripeFeeCents: 8_896,
          unavailableReasonCodes: [],
        },
        other: emptyPortfolio(),
        paused: emptyPortfolio(),
      },
      rolling30: {
        enabled: {
          campaignCount: 1,
          clicks: 323,
          contributionCents: 144_545,
          contributionMargin: 0.4725,
          grossRevenueCents: 323_390,
          netRetainedRevenueCents: 303_440,
          orders: 98,
          refundCents: 19_950,
          refundedOrders: 7,
          refundRate: 0.0714,
          spendCents: 149_999,
          stripeFeeCents: 8_896,
          unavailableReasonCodes: [],
        },
        other: emptyPortfolio(),
        paused: emptyPortfolio(),
      },
    },
    tracking: {
      evidenceAsOf: "2026-08-26T23:00:00.000Z",
      reasonCodes: [],
      scaleAllowed: true,
      state: "GREEN",
    },
    windows: {
      daily: {
        endDate: "2026-08-26",
        endUtcExclusive: "2026-08-26T14:00:00.000Z",
        startDate: "2026-08-26",
        startUtc: "2026-08-25T14:00:00.000Z",
      },
      rolling30: {
        endDate: "2026-08-26",
        endUtcExclusive: "2026-08-26T14:00:00.000Z",
        startDate: "2026-07-28",
        startUtc: "2026-07-27T14:00:00.000Z",
      },
    },
  }
}

function emptyPortfolio() {
  return {
    campaignCount: 0,
    clicks: 0,
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

function run(): DeliveredAdsAgentRunEvidence {
  return {
    deliveredAt: "2026-08-26T23:01:09.269Z",
    id: "run-1",
    recommendations: [{
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_budget",
      reasonCodes: ["SCRIPTS_SCALE_GATES_PASSED"],
      service: "scripts",
    }],
    reportDate: "2026-08-26",
    snapshot: snapshot(),
  }
}

function proposal(overrides: Partial<AdsChangeProposal> = {}): AdsChangeProposal {
  const operations = [{
    expectedMicros: 79_000_000,
    kind: "campaign_budget" as const,
    nextMicros: 106_000_000,
    resourceName: "customers/1/campaignBudgets/1",
  }]
  return {
    approvalActorHash: null,
    approvalChannel: null,
    approvalReference: null,
    approvedAt: null,
    applyReceipt: null,
    baselineHash: "baseline-hash",
    expiresAt: "2026-08-27T12:00:00.000Z",
    id: "proposal-id",
    mutationFamily: "campaign_budget",
    operationHash: "9af0ed8520f83a3b7ffac055ae1f1ed0c9e05c0804eddcbce29a0527920688d1",
    operations,
    proposalKey: "ADS-20260827-01",
    rationale: {
      boundedImpact: "Budget-only increase.",
      campaign: "JDM | Search | Scripts",
      currentValue: "A$79/day",
      reason: "Post-change evidence matured.",
      requestedValue: "A$106/day",
      service: "scripts",
    },
    rejectedAt: null,
    rollbackPlan: { value: "Restore A$79/day." },
    runId: "run-1",
    status: "validated",
    telegramCallbackQueryHash: null,
    telegramMessageId: null,
    telegramUpdateId: null,
    validationReceipt: {
      baselineHash: "baseline-hash",
      errorCode: null,
      googleOperationsHash: "google-operations-hash",
      ok: true,
      operationHash: "9af0ed8520f83a3b7ffac055ae1f1ed0c9e05c0804eddcbce29a0527920688d1",
      proposalKey: "ADS-20260827-01",
      requestId: "request-id",
      validatedAt: "2026-08-27T00:15:00.000Z",
    },
    verificationReceipt: null,
    ...overrides,
  }
}

function scaleEvidence(
  closedDays: number,
  attributedOrders: number,
): AdsScaleAuthorizationEvidence {
  return {
    previousMaterialChange: { attributedOrders, closedDays },
    snapshot: snapshot(),
  }
}

function supabaseWithProposalKeys(keys: string[]): SupabaseClient {
  const query = {
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(async () => ({
      data: keys.map((proposalKey) => ({ proposal_key: proposalKey })),
      error: null,
    })),
    select: vi.fn(() => query),
  }
  return {
    from: vi.fn(() => query),
  } as unknown as SupabaseClient
}

async function readActionEvidence(args: {
  proposals: AdsChangeProposal[]
  scriptsScaleEvidence: AdsScaleAuthorizationEvidence | null
}) {
  getProposalMock.mockImplementation(async (_supabase, proposalKey) =>
    args.proposals.find((candidate) => candidate.proposalKey === proposalKey) ?? null)
  readScaleEvidenceMock.mockResolvedValue(args.scriptsScaleEvidence)
  return getBusinessAdsActionEvidence({
    now: NOW,
    run: run(),
    supabase: supabaseWithProposalKeys(
      args.proposals.map(({ proposalKey }) => proposalKey),
    ),
  })
}

describe("getBusinessAdsActionEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reserves approval-required state for one current exact validated proposal", async () => {
    expect(await readActionEvidence({
      proposals: [proposal()],
      scriptsScaleEvidence: scaleEvidence(3, 12),
    })).toEqual({
      currentValue: "A$79/day",
      kind: "approval_ready",
      mutationFamily: "campaign_budget",
      proposalKey: "ADS-20260827-01",
      requestedValue: "A$106/day",
      service: "scripts",
    })
  })

  it("ignores an expired proposal and reports the live post-change observation", async () => {
    expect(await readActionEvidence({
      proposals: [proposal({ expiresAt: "2026-08-26T23:59:59.000Z" })],
      scriptsScaleEvidence: scaleEvidence(2, 8),
    })).toEqual({
      attributedOrders: 8,
      closedDays: 2,
      currentBudgetCents: 7_900,
      kind: "observation",
      mutationFamily: "campaign_budget",
      requiredAttributedOrders: 10,
      requiredClosedDays: 3,
      service: "scripts",
    })
  })

  it("requires a proposal after the full post-change gate passes", async () => {
    expect(await readActionEvidence({
      proposals: [],
      scriptsScaleEvidence: scaleEvidence(3, 10),
    })).toEqual({
      currentBudgetCents: 7_900,
      kind: "proposal_required",
      mutationFamily: "campaign_budget",
      service: "scripts",
    })
  })
})
