import { describe, expect, it } from "vitest"

import {
  type AdsChangeProposal,
  type AdsMutationOperation,
  assertAdsProposalOperationsUnchanged,
  canTransitionAdsProposal,
  getAdsProposalApplyEligibility,
  hashAdsMutationOperations,
  isAdsProposalExpired,
  isCodexAdsApprovalReference,
  normalizeAdsMutationOperations,
} from "@/lib/ads-agent/proposals"

const budgetOperation = {
  kind: "campaign_budget",
  resourceName: "customers/123/campaignBudgets/456",
  expectedMicros: 40_000_000,
  nextMicros: 48_000_000,
} satisfies AdsMutationOperation

const operations: AdsMutationOperation[] = [budgetOperation]

function proposal(
  overrides: Partial<AdsChangeProposal> = {},
): AdsChangeProposal {
  const operationHash = hashAdsMutationOperations(operations)
  return {
    approvalActorHash: "b".repeat(64),
    approvalChannel: "telegram",
    approvalReference: "telegram-button",
    approvedAt: "2026-07-30T09:50:00.000Z",
    applyReceipt: null,
    baselineHash: "a".repeat(64),
    expiresAt: "2026-07-30T10:42:00.000Z",
    id: "proposal-id",
    mutationFamily: "campaign_budget",
    operations,
    operationHash,
    proposalKey: "ADS-20260730-01",
    rationale: {
      boundedImpact: "up to +A$8/day",
      campaign: "Scripts",
      currentValue: "A$40/day",
      reason: "Tracking GREEN; mature cohort gate passed",
      requestedValue: "A$48/day",
      service: "scripts",
    },
    rejectedAt: null,
    rollbackPlan: {
      value: "A$40/day",
    },
    runId: "run-id",
    status: "approved",
    telegramCallbackQueryHash: "c".repeat(64),
    telegramMessageId: 9042,
    telegramUpdateId: 88001,
    validationReceipt: {
      baselineHash: "a".repeat(64),
      ok: true,
      operationHash,
      proposalKey: "ADS-20260730-01",
      requestId: "request-1",
      validatedAt: "2026-07-30T09:45:00.000Z",
    },
    verificationReceipt: null,
    ...overrides,
  }
}

describe("Google Ads proposal operation boundary", () => {
  it("normalizes only the restricted operation union", () => {
    expect(normalizeAdsMutationOperations([
      ...operations,
      {
        kind: "campaign_status",
        resourceName: "customers/123/campaigns/789",
        expected: "ENABLED",
        next: "PAUSED",
      },
      {
        kind: "campaign_bidding",
        resourceName: "customers/123/campaigns/789",
        expected: { strategy: "MAXIMIZE_CONVERSION_VALUE" },
        next: {
          strategy: "MAXIMIZE_CONVERSION_VALUE",
          targetRoas: 1.35,
        },
      },
      {
        kind: "ad_group_cpc_bid",
        resourceName: "customers/123/adGroups/12",
        expectedMicros: 2_000_000,
        nextMicros: 3_000_000,
      },
      {
        kind: "ad_status",
        resourceName: "customers/123/adGroupAds/12~34",
        expected: "ENABLED",
        next: "PAUSED",
      },
      {
        kind: "keyword_status",
        resourceName: "customers/123/adGroupCriteria/12~34",
        expected: "ENABLED",
        next: "PAUSED",
      },
      {
        kind: "negative_keyword",
        campaignResourceName: "customers/123/campaigns/789",
        matchType: "EXACT",
        text: "free medicine",
      },
      {
        kind: "asset_link_status",
        resourceName: "customers/123/campaignAssets/789~34~SITELINK",
        expected: "ENABLED",
        next: "PAUSED",
      },
      {
        kind: "schedule_replace",
        campaignResourceName: "customers/123/campaigns/789",
        expected: [],
        next: [{
          dayOfWeek: "MONDAY",
          endHour: 24,
          endMinute: "ZERO",
          startHour: 0,
          startMinute: "ZERO",
        }],
      },
    ])).toHaveLength(9)
  })

  it("rejects raw Google mutate JSON and unknown operation fields", () => {
    expect(() => normalizeAdsMutationOperations([{
      campaignOperation: {
        update: {
          resourceName: "customers/123/campaigns/789",
          status: "PAUSED",
        },
      },
    }])).toThrow("Unsupported Google Ads mutation operation")

    expect(() => normalizeAdsMutationOperations([{
      ...operations[0],
      partialFailure: true,
    }])).toThrow("Unexpected campaign_budget field")
  })

  it("rejects medicine terms before a keyword packet can be persisted", () => {
    expect(() => normalizeAdsMutationOperations([{
      campaignResourceName: "customers/123/campaigns/789",
      kind: "negative_keyword",
      matchType: "EXACT",
      text: "sildenafil",
    }])).toThrow("Medicine-name keywords are prohibited")
  })

  it("hashes normalized operations deterministically", () => {
    expect(hashAdsMutationOperations(operations)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashAdsMutationOperations([
      {
        nextMicros: 48_000_000,
        expectedMicros: 40_000_000,
        resourceName: "customers/123/campaignBudgets/456",
        kind: "campaign_budget",
      },
    ])).toBe(hashAdsMutationOperations(operations))
  })
})

describe("Google Ads proposal state machine", () => {
  it("permits only the governed lifecycle transitions", () => {
    expect(canTransitionAdsProposal("draft", "validated")).toBe(true)
    expect(canTransitionAdsProposal("validated", "awaiting_approval")).toBe(true)
    expect(canTransitionAdsProposal("awaiting_approval", "approved")).toBe(true)
    expect(canTransitionAdsProposal("awaiting_approval", "rejected")).toBe(true)
    expect(canTransitionAdsProposal("approved", "applying")).toBe(true)
    expect(canTransitionAdsProposal("applying", "applied")).toBe(true)
    expect(canTransitionAdsProposal("applied", "verified")).toBe(true)
    expect(canTransitionAdsProposal("verified", "approved")).toBe(false)
    expect(canTransitionAdsProposal("rejected", "approved")).toBe(false)
  })

  it("accepts only an exact Codex task approval reference", () => {
    expect(isCodexAdsApprovalReference("codex-task:task_1234")).toBe(true)
    expect(isCodexAdsApprovalReference("task:task_1234")).toBe(false)
    expect(isCodexAdsApprovalReference("codex-task:x")).toBe(false)
    expect(isCodexAdsApprovalReference("codex-task:task 1234")).toBe(false)
  })

  it("expires after 24 hours and treats expiry as apply-ineligible", () => {
    const expiring = proposal({
      expiresAt: "2026-07-30T10:00:00.000Z",
    })
    expect(isAdsProposalExpired(
      expiring,
      new Date("2026-07-30T09:59:59.999Z"),
    )).toBe(false)
    expect(isAdsProposalExpired(
      expiring,
      new Date("2026-07-30T10:00:00.000Z"),
    )).toBe(true)
  })

  it("detects operation mutation after validation", () => {
    expect(() => assertAdsProposalOperationsUnchanged(proposal())).not.toThrow()
    expect(() => assertAdsProposalOperationsUnchanged(proposal({
      operations: [{
        ...budgetOperation,
        nextMicros: 49_000_000,
      }],
    }))).toThrow("proposal_operations_changed")
  })

  it("blocks apply on status, decision, expiry, validation, or baseline drift", () => {
    const now = new Date("2026-07-30T10:00:00.000Z")
    expect(getAdsProposalApplyEligibility({
      decisionReceiptVerified: true,
      liveBaselineHash: "a".repeat(64),
      now,
      proposal: proposal(),
    })).toEqual({ eligible: true })

    expect(getAdsProposalApplyEligibility({
      decisionReceiptVerified: true,
      liveBaselineHash: "b".repeat(64),
      now,
      proposal: proposal(),
    })).toEqual({
      eligible: false,
      reason: "baseline_drift",
    })
    expect(getAdsProposalApplyEligibility({
      decisionReceiptVerified: false,
      liveBaselineHash: "a".repeat(64),
      now,
      proposal: proposal(),
    })).toEqual({
      eligible: false,
      reason: "decision_receipt_unverified",
    })
    expect(getAdsProposalApplyEligibility({
      decisionReceiptVerified: true,
      liveBaselineHash: "a".repeat(64),
      now: new Date("2026-07-30T11:00:00.000Z"),
      proposal: proposal(),
    })).toEqual({
      eligible: false,
      reason: "proposal_expired",
    })
  })
})
