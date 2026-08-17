import { describe, expect, it, vi } from "vitest"

import {
  type GoogleAdsAccountState,
  hashGoogleAdsAccountState,
  type NormalizedGoogleAdsResource,
} from "@/lib/ads-agent/account-state"
import {
  type AdsMutationAuditReceipt,
  type AdsMutationGatewayRepository,
  buildGoogleAdsMutateOperations,
  createAdsMutationGateway,
  hashGoogleAdsMutateOperations,
  validateAdsMutationPolicy,
} from "@/lib/ads-agent/mutations"
import {
  type AdsChangeProposal,
  type AdsMutationOperation,
  hashAdsMutationOperations,
} from "@/lib/ads-agent/proposals"
import type {
  GoogleAdsMutateOperation,
  GoogleAdsMutateResponse,
} from "@/lib/google-ads/client"

const campaignResourceName = "customers/123/campaigns/456"
const budgetResourceName = "customers/123/campaignBudgets/789"
const adGroupResourceName = "customers/123/adGroups/111"
const keywordResourceName = "customers/123/adGroupCriteria/111~222"
const createdAdResourceName = "customers/123/adGroupAds/111~333"
const createdKeywordResourceName = "customers/123/adGroupCriteria/111~444"

function resource(
  resourceName: string,
  values: Record<string, unknown>,
): NormalizedGoogleAdsResource {
  return { resourceName, values }
}

function accountState(
  overrides: Partial<GoogleAdsAccountState> = {},
): GoogleAdsAccountState {
  return {
    optionalQueryFailures: [],
    adGroupCriteria: [
      resource(keywordResourceName, {
        adGroupCriterion: {
          adGroup: adGroupResourceName,
          cpcBidMicros: "2500000",
          keyword: {
            matchType: "EXACT",
            text: "online erectile dysfunction assessment",
          },
          negative: false,
          resourceName: keywordResourceName,
          status: "ENABLED",
          type: "KEYWORD",
        },
      }),
    ],
    adGroups: [
      resource(adGroupResourceName, {
        adGroup: {
          campaign: campaignResourceName,
          cpcBidMicros: "2500000",
          resourceName: adGroupResourceName,
          status: "ENABLED",
        },
      }),
    ],
    assets: [],
    biddingStrategies: [],
    campaignAssets: [],
    campaignBudgets: [
      resource(budgetResourceName, {
        campaignBudget: {
          amountMicros: "40000000",
          resourceName: budgetResourceName,
          status: "ENABLED",
        },
      }),
    ],
    campaignCriteria: [],
    campaignSharedSets: [],
    campaigns: [
      resource(campaignResourceName, {
        campaign: {
          advertisingChannelType: "SEARCH",
          biddingStrategyType: "MANUAL_CPC",
          campaignBudget: budgetResourceName,
          name: "Scripts Search",
          resourceName: campaignResourceName,
          status: "ENABLED",
        },
        campaignBudget: {
          amountMicros: "40000000",
          resourceName: budgetResourceName,
        },
      }),
    ],
    changeEvents: [],
    conversionActions: [],
    conversionGoals: [],
    customer: {
      autoTaggingEnabled: true,
      currencyCode: "AUD",
      finalUrlSuffix: "utm_source=google",
      id: "123",
      resourceName: "customers/123",
      timeZone: "Australia/Sydney",
    },
    customerClientLinks: [],
    customerManagerLinks: [],
    customerUserAccess: [],
    readAt: "2026-07-30T09:30:00.000Z",
    responsiveSearchAds: [],
    sharedCriteria: [],
    sharedSets: [],
    ...overrides,
  }
}

function stateWithBudget(
  state: GoogleAdsAccountState,
  amountMicros: number,
): GoogleAdsAccountState {
  const next = structuredClone(state)
  const budget = next.campaignBudgets[0].values
    .campaignBudget as Record<string, unknown>
  budget.amountMicros = String(amountMicros)
  const campaignBudget = next.campaigns[0].values
    .campaignBudget as Record<string, unknown>
  campaignBudget.amountMicros = String(amountMicros)
  next.readAt = "2026-07-30T09:31:00.000Z"
  return next
}

const budgetOperation: AdsMutationOperation = {
  expectedMicros: 40_000_000,
  kind: "campaign_budget",
  nextMicros: 48_000_000,
  resourceName: budgetResourceName,
}

const rsaCreateOperation = {
  adGroupResourceName,
  descriptions: [
    "A doctor reviews your form and may call briefly before prescribing.",
    "Complete a secure clinical form online when it suits you.",
  ],
  finalUrl: "https://instantmed.com.au/prescriptions",
  headlines: [
    "Repeat Prescriptions Online",
    "Doctor Review Online",
    "Start With A Secure Form",
  ],
  kind: "responsive_search_ad_create",
  path1: "repeat",
  path2: "prescription",
  status: "ENABLED",
} as unknown as AdsMutationOperation

const positiveKeywordCreateOperation = {
  adGroupResourceName,
  kind: "positive_keyword_create",
  matchType: "EXACT",
  status: "ENABLED",
  text: "repeat prescription online",
} as unknown as AdsMutationOperation

function stateWithCreatedRsa(
  state: GoogleAdsAccountState,
): GoogleAdsAccountState {
  const next = structuredClone(state)
  next.responsiveSearchAds.push(resource(createdAdResourceName, {
    adGroupAd: {
      ad: {
        finalUrls: ["https://instantmed.com.au/prescriptions"],
        responsiveSearchAd: {
          descriptions: [
            { text: "A doctor reviews your form and may call briefly before prescribing." },
            { text: "Complete a secure clinical form online when it suits you." },
          ],
          headlines: [
            { text: "Repeat Prescriptions Online" },
            { text: "Doctor Review Online" },
            { text: "Start With A Secure Form" },
          ],
          path1: "repeat",
          path2: "prescription",
        },
        resourceName: "customers/123/ads/333",
        type: "RESPONSIVE_SEARCH_AD",
      },
      adGroup: adGroupResourceName,
      resourceName: createdAdResourceName,
      status: "ENABLED",
    },
  }))
  return next
}

function stateWithCreatedKeyword(
  state: GoogleAdsAccountState,
): GoogleAdsAccountState {
  const next = structuredClone(state)
  next.adGroupCriteria.push(resource(createdKeywordResourceName, {
    adGroupCriterion: {
      adGroup: adGroupResourceName,
      keyword: {
        matchType: "EXACT",
        text: "repeat prescription online",
      },
      negative: false,
      resourceName: createdKeywordResourceName,
      status: "ENABLED",
      type: "KEYWORD",
    },
  }))
  return next
}

function proposal(
  state: GoogleAdsAccountState,
  overrides: Partial<AdsChangeProposal> = {},
): AdsChangeProposal {
  const operations = overrides.operations ?? [budgetOperation]
  const operationHash = hashAdsMutationOperations(operations)
  const baselineHash = hashGoogleAdsAccountState(state)
  const googleOperationsHash = hashGoogleAdsMutateOperations(
    buildGoogleAdsMutateOperations(operations, state),
  )
  return {
    approvalActorHash: "b".repeat(64),
    approvalChannel: "telegram",
    approvalReference: "telegram-button",
    approvedAt: "2026-07-30T09:45:00.000Z",
    applyReceipt: null,
    baselineHash,
    expiresAt: "2026-07-30T10:42:00.000Z",
    id: "proposal-id",
    mutationFamily: operations[0].kind,
    operationHash,
    operations,
    proposalKey: "ADS-20260730-01",
    rationale: {
      boundedImpact: "up to +A$8/day",
      campaign: "Scripts Search",
      currentValue: "A$40/day",
      reason: "Exact approved test packet",
      requestedValue: "A$48/day",
      service: "scripts",
    },
    rejectedAt: null,
    rollbackPlan: { value: "A$40/day" },
    runId: "run-id",
    status: "approved",
    telegramCallbackQueryHash: "c".repeat(64),
    telegramMessageId: 9042,
    telegramUpdateId: 88001,
    validationReceipt: {
      baselineHash,
      googleOperationsHash,
      ok: true,
      operationHash,
      proposalKey: "ADS-20260730-01",
      requestId: "initial-validation",
      validatedAt: "2026-07-30T09:40:00.000Z",
    },
    verificationReceipt: null,
    ...overrides,
  }
}

function fakeRepository(
  initial: AdsChangeProposal,
  trackingState: "GREEN" | "AMBER" | "RED" = "GREEN",
  experimentLock: {
    launchProposalKey: string
    stopProposalKey: string | null
  } | null = null,
): {
  audits: AdsMutationAuditReceipt[]
  getCurrent(): AdsChangeProposal
  repository: AdsMutationGatewayRepository
  rollbacks: AdsChangeProposal[]
} {
  let current = structuredClone(initial)
  const audits: AdsMutationAuditReceipt[] = []
  const rollbacks: AdsChangeProposal[] = []

  const repository: AdsMutationGatewayRepository = {
    appendAudit: vi.fn(async (receipt) => {
      audits.push(receipt)
    }),
    claimApply: vi.fn(async ({ proposalId }) => {
      if (proposalId !== current.id || current.status !== "approved") {
        return false
      }
      current = { ...current, status: "applying" }
      return true
    }),
    createRollbackDraft: vi.fn(async (args) => {
      const rollback = proposal(args.liveState, {
        approvalActorHash: null,
        approvalChannel: null,
        approvalReference: null,
        approvedAt: null,
        baselineHash: args.baselineHash,
        id: "rollback-id",
        mutationFamily: args.operations[0].kind,
        operations: args.operations,
        proposalKey: "ADS-20260730-02",
        rejectedAt: null,
        runId: null,
        status: "draft",
        telegramCallbackQueryHash: null,
        telegramMessageId: null,
        telegramUpdateId: null,
        validationReceipt: null,
      })
      rollbacks.push(rollback)
      return rollback
    }),
    getLatestTrackingGate: vi.fn(async () => ({
      checkedAt: "2026-07-30T09:50:00.000Z",
      fresh: true,
      state: trackingState,
    })),
    getMaterialExperimentLock: vi.fn(async () => experimentLock),
    getProposalByKey: vi.fn(async (proposalKey) =>
      proposalKey === current.proposalKey ? structuredClone(current) : null),
    recordApplyOutcome: vi.fn(async (args) => {
      if (
        current.id !== args.proposalId
        || current.status !== args.expectedStatus
      ) {
        return false
      }
      current = {
        ...current,
        applyReceipt: args.receipt,
        status: args.status,
        verificationReceipt:
          args.verificationReceipt ?? current.verificationReceipt,
      }
      return true
    }),
    recordValidation: vi.fn(async (args) => {
      current = {
        ...current,
        status: args.receipt.ok ? "validated" : "failed",
        validationReceipt: args.receipt,
      }
      return structuredClone(current)
    }),
    recordVerification: vi.fn(async (args) => {
      if (
        current.id !== args.proposalId
        || current.status !== args.expectedStatus
      ) {
        return false
      }
      current = {
        ...current,
        status: args.status,
        verificationReceipt: args.receipt,
      }
      return true
    }),
  }

  return {
    audits,
    getCurrent: () => structuredClone(current),
    repository,
    rollbacks,
  }
}

function gateway(args: {
  accountReads: GoogleAdsAccountState[]
  initial?: AdsChangeProposal
  mutate?: ReturnType<typeof vi.fn>
  mutationsEnabled?: boolean
  experimentLock?: {
    launchProposalKey: string
    stopProposalKey: string | null
  } | null
  trackingState?: "GREEN" | "AMBER" | "RED"
}) {
  const initial = args.initial ?? proposal(args.accountReads[0])
  const store = fakeRepository(
    initial,
    args.trackingState,
    args.experimentLock,
  )
  const getAccountState = vi.fn()
  for (const state of args.accountReads) {
    getAccountState.mockResolvedValueOnce(state)
  }
  const mutate = args.mutate ?? vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      rawError: null,
      requestId: "validate-request",
      results: [],
    })
    .mockResolvedValueOnce({
      ok: true,
      rawError: null,
      requestId: "apply-request",
      results: [],
    })

  return {
    gateway: createAdsMutationGateway({
      getAccountState,
      mutateGoogleAds: mutate as unknown as (input: {
        operations: GoogleAdsMutateOperation[]
        validateOnly: boolean
      }) => Promise<GoogleAdsMutateResponse>,
      mutationsEnabled: () => args.mutationsEnabled ?? true,
      now: () => new Date("2026-07-30T10:00:00.000Z"),
      repository: store.repository,
    }),
    getAccountState,
    mutate,
    store,
  }
}

describe("Google Ads mutation gateway", () => {
  it("validates and durably receipts an immutable draft before approval", async () => {
    const state = accountState()
    const initial = proposal(state, {
      approvalActorHash: null,
      approvalChannel: null,
      approvalReference: null,
      approvedAt: null,
      status: "draft",
      telegramCallbackQueryHash: null,
      telegramMessageId: null,
      telegramUpdateId: null,
      validationReceipt: null,
    })
    const harness = gateway({
      accountReads: [state],
      initial,
    })

    await expect(
      harness.gateway.validateProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      googleOperationsHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      ok: true,
      requestId: "validate-request",
    })
    expect(harness.mutate).toHaveBeenCalledOnce()
    expect(harness.mutate).toHaveBeenCalledWith(expect.objectContaining({
      validateOnly: true,
    }))
    expect(harness.store.getCurrent().status).toBe("validated")
    expect(harness.store.audits.map(({ stage }) => stage)).toEqual([
      "validate",
    ])
  })

  it("repeats validateOnly immediately before an atomic apply with byte-equivalent operations", async () => {
    const before = accountState()
    const after = stateWithBudget(before, 48_000_000)
    const harness = gateway({ accountReads: [before, after] })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      outcome: "applied",
      requestId: "apply-request",
    })

    expect(harness.mutate).toHaveBeenCalledTimes(2)
    expect(harness.mutate.mock.calls[0][0].validateOnly).toBe(true)
    expect(harness.mutate.mock.calls[1][0].validateOnly).toBe(false)
    expect(JSON.stringify(harness.mutate.mock.calls[0][0].operations)).toBe(
      JSON.stringify(harness.mutate.mock.calls[1][0].operations),
    )
    expect(harness.mutate.mock.calls[0][0]).not.toHaveProperty(
      "partialFailure",
    )
    expect(harness.store.getCurrent().status).toBe("verified")
  })

  it("creates and content-verifies a responsive search ad before offering removal rollback", async () => {
    const before = accountState()
    const after = stateWithCreatedRsa(before)
    const initial = proposal(before, {
      operations: [rsaCreateOperation],
    })
    const harness = gateway({
      accountReads: [before, after, after],
      initial,
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "applied" })
    expect(harness.store.getCurrent().status).toBe("verified")

    await harness.gateway.buildRollbackProposal("ADS-20260730-01")
    expect(harness.store.rollbacks[0].operations).toEqual([{
      expected: "ENABLED",
      kind: "ad_status",
      next: "REMOVED",
      resourceName: createdAdResourceName,
    }])
  })

  it("creates and content-verifies an exact positive keyword before offering removal rollback", async () => {
    const before = accountState()
    const after = stateWithCreatedKeyword(before)
    const initial = proposal(before, {
      operations: [positiveKeywordCreateOperation],
    })
    const harness = gateway({
      accountReads: [before, after, after],
      initial,
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "applied" })
    expect(harness.store.getCurrent().status).toBe("verified")

    await harness.gateway.buildRollbackProposal("ADS-20260730-01")
    expect(harness.store.rollbacks[0].operations).toEqual([{
      expected: "ENABLED",
      kind: "keyword_status",
      next: "REMOVED",
      resourceName: createdKeywordResourceName,
    }])
  })

  it("rejects disabled, expired, unapproved, and unverified proposals", async () => {
    const state = accountState()
    const cases = [
      {
        expected: "mutations_disabled",
        initial: proposal(state),
        mutationsEnabled: false,
      },
      {
        expected: "proposal_expired",
        initial: proposal(state, {
          expiresAt: "2026-07-30T09:59:59.000Z",
        }),
      },
      {
        expected: "proposal_status_invalid",
        initial: proposal(state, { status: "awaiting_approval" }),
      },
      {
        expected: "decision_receipt_unverified",
        initial: proposal(state, { approvalActorHash: null }),
      },
    ] as const

    for (const testCase of cases) {
      const harness = gateway({
        accountReads: [state],
        initial: testCase.initial,
        mutationsEnabled:
          "mutationsEnabled" in testCase
            ? testCase.mutationsEnabled
            : undefined,
      })
      await expect(
        harness.gateway.applyProposal("ADS-20260730-01"),
      ).rejects.toThrow(testCase.expected)
      expect(harness.mutate).not.toHaveBeenCalled()
    }
  })

  it("accepts a verified exact Codex-task fallback receipt", async () => {
    const before = accountState()
    const after = stateWithBudget(before, 48_000_000)
    const initial = proposal(before, {
      approvalChannel: "codex",
      approvalReference: "codex-task:task_1234",
      telegramCallbackQueryHash: null,
      telegramMessageId: null,
      telegramUpdateId: null,
    })
    const harness = gateway({
      accountReads: [before, after],
      initial,
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "applied" })
    expect(harness.store.getCurrent().status).toBe("verified")
  })

  it("aborts before validateOnly when the fresh account baseline drifted", async () => {
    const baseline = accountState()
    const drifted = stateWithBudget(baseline, 41_000_000)
    const harness = gateway({
      accountReads: [drifted],
      initial: proposal(baseline),
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      errorCode: "baseline_drift",
      outcome: "aborted",
    })
    expect(harness.mutate).not.toHaveBeenCalled()
    expect(harness.store.getCurrent().status).toBe("aborted")
  })

  it("blocks scaling when the freshest attribution gate is not GREEN", async () => {
    const state = accountState()
    const harness = gateway({
      accountReads: [state],
      trackingState: "RED",
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      errorCode: "tracking_not_green",
      outcome: "aborted",
    })
    expect(harness.mutate).not.toHaveBeenCalled()
  })

  it("treats an enabled RSA create as scaling and blocks it without GREEN tracking", async () => {
    const state = accountState()
    const initial = proposal(state, {
      operations: [rsaCreateOperation],
    })
    const harness = gateway({
      accountReads: [state],
      initial,
      trackingState: "AMBER",
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      errorCode: "tracking_not_green",
      outcome: "aborted",
    })
    expect(harness.mutate).not.toHaveBeenCalled()
  })

  it("locks a sequential campaign against unrelated material packets", async () => {
    const state = accountState()
    const blocked = gateway({
      accountReads: [state],
      experimentLock: {
        launchProposalKey: "ADS-20260729-01",
        stopProposalKey: "ADS-20260731-01",
      },
    })
    await expect(
      blocked.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      errorCode: "experiment_material_change_locked",
      outcome: "aborted",
    })
    expect(blocked.mutate).not.toHaveBeenCalled()

    const launch = gateway({
      accountReads: [state, stateWithBudget(state, 48_000_000)],
      experimentLock: {
        launchProposalKey: "ADS-20260730-01",
        stopProposalKey: null,
      },
    })
    await expect(
      launch.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "applied" })
  })

  it("rejects account-budget overflow", () => {
    const state = accountState()
    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...budgetOperation,
        nextMicros: 85_000_000,
      }],
      state,
    })).toThrow("account_budget_envelope_exceeded")
  })

  it("enforces service budget ceilings and the Scripts 20% step", () => {
    const scripts = accountState()
    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...budgetOperation,
        nextMicros: 49_000_000,
      }],
      state: scripts,
    })).toThrow("scripts_budget_step_exceeded")

    const specialty = stateWithBudget(accountState(), 7_000_000)
    const campaign = specialty.campaigns[0].values
      .campaign as Record<string, unknown>
    campaign.name = "ED Search"
    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...budgetOperation,
        expectedMicros: 7_000_000,
        nextMicros: 8_000_000,
      }],
      state: specialty,
    })).toThrow("service_budget_ceiling_exceeded")
  })

  it("keeps at most one enabled Search campaign per launched service", () => {
    const state = accountState()
    const secondCampaign = "customers/123/campaigns/457"
    const secondBudget = "customers/123/campaignBudgets/790"
    state.campaigns.push(resource(secondCampaign, {
      campaign: {
        advertisingChannelType: "SEARCH",
        campaignBudget: secondBudget,
        name: "Scripts Search Legacy",
        resourceName: secondCampaign,
        status: "PAUSED",
      },
    }))
    state.campaignBudgets.push(resource(secondBudget, {
      campaignBudget: {
        amountMicros: "40000000",
        resourceName: secondBudget,
        status: "ENABLED",
      },
    }))

    expect(() => validateAdsMutationPolicy({
      operations: [{
        expected: "PAUSED",
        kind: "campaign_status",
        next: "ENABLED",
        resourceName: secondCampaign,
      }],
      state,
    })).toThrow("multiple_enabled_service_campaigns")
  })

  it("rejects specialty Manual CPC proposals above either bid ceiling", () => {
    const state = accountState()
    const campaign = state.campaigns[0].values
      .campaign as Record<string, unknown>
    campaign.name = "ED Search"
    expect(() => validateAdsMutationPolicy({
      operations: [{
        expectedMicros: 2_500_000,
        kind: "ad_group_cpc_bid",
        nextMicros: 3_100_000,
        resourceName: adGroupResourceName,
      }],
      state,
    })).toThrow("specialty_cpc_ceiling_exceeded")

    const highKeywordState = structuredClone(state)
    const criterion = highKeywordState.adGroupCriteria[0].values
      .adGroupCriterion as Record<string, unknown>
    criterion.cpcBidMicros = "3100000"
    expect(() => validateAdsMutationPolicy({
      operations: [{
        expected: { strategy: "MAXIMIZE_CONVERSIONS" },
        kind: "campaign_bidding",
        next: { strategy: "MANUAL_CPC" },
        resourceName: campaignResourceName,
      }],
      state: highKeywordState,
    })).toThrow("specialty_cpc_ceiling_exceeded")
  })

  it.each([
    ["medicine_name_keyword", "sildenafil", "EXACT"],
    ["broad_match_positive", "online doctor assessment", "BROAD"],
  ])("rejects %s", (_reason, text, matchType) => {
    const state = accountState()
    const criterion = state.adGroupCriteria[0].values
      .adGroupCriterion as Record<string, unknown>
    criterion.keyword = { matchType, text }
    criterion.status = "PAUSED"

    expect(() => validateAdsMutationPolicy({
      operations: [{
        expected: "PAUSED",
        kind: "keyword_status",
        next: "ENABLED",
        resourceName: keywordResourceName,
      }],
      state,
    })).toThrow(String(_reason))
  })

  it("rejects enabling a health campaign with an advertiser-curated audience", () => {
    const state = accountState({
      campaignCriteria: [
        resource("customers/123/campaignCriteria/456~333", {
          campaignCriterion: {
            campaign: campaignResourceName,
            negative: false,
            resourceName: "customers/123/campaignCriteria/456~333",
            status: "ENABLED",
            type: "USER_LIST",
          },
        }),
      ],
    })
    const campaign = state.campaigns[0].values
      .campaign as Record<string, unknown>
    campaign.status = "PAUSED"

    expect(() => validateAdsMutationPolicy({
      operations: [{
        expected: "PAUSED",
        kind: "campaign_status",
        next: "ENABLED",
        resourceName: campaignResourceName,
      }],
      state,
    })).toThrow("health_audience_operation_rejected")
  })

  it("requires possible doctor contact in prescribing RSA copy and the matching paid destination", () => {
    const state = accountState()
    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...rsaCreateOperation as unknown as Record<string, unknown>,
        descriptions: [
          "Complete a secure clinical form for online doctor review.",
          "A repeat prescription may be issued after assessment.",
        ],
      }],
      state,
    })).toThrow("prescribing_ad_missing_possible_call")
    expect(() => validateAdsMutationPolicy({
      operations: [{
        ...rsaCreateOperation as unknown as Record<string, unknown>,
        finalUrl: "https://instantmed.com.au/hair-loss",
      }],
      state,
    })).toThrow("paid_destination_service_mismatch")
  })

  it("builds only the reviewed Google mutate shapes", () => {
    const state = accountState()
    expect(buildGoogleAdsMutateOperations([budgetOperation], state)).toEqual([
      {
        campaignBudgetOperation: {
          update: {
            amountMicros: "48000000",
            resourceName: budgetResourceName,
          },
          updateMask: "amountMicros",
        },
      },
    ])
  })

  it("maps RSA and exact-keyword creates to the reviewed Google shapes", () => {
    const state = accountState()
    expect(buildGoogleAdsMutateOperations([
      rsaCreateOperation,
      positiveKeywordCreateOperation,
    ], state)).toEqual([
      {
        adGroupAdOperation: {
          create: {
            ad: {
              finalUrls: ["https://instantmed.com.au/prescriptions"],
              responsiveSearchAd: {
                descriptions: [
                  { text: "A doctor reviews your form and may call briefly before prescribing." },
                  { text: "Complete a secure clinical form online when it suits you." },
                ],
                headlines: [
                  { text: "Repeat Prescriptions Online" },
                  { text: "Doctor Review Online" },
                  { text: "Start With A Secure Form" },
                ],
                path1: "repeat",
                path2: "prescription",
              },
            },
            adGroup: adGroupResourceName,
            status: "ENABLED",
          },
        },
      },
      {
        adGroupCriterionOperation: {
          create: {
            adGroup: adGroupResourceName,
            keyword: {
              matchType: "EXACT",
              text: "repeat prescription online",
            },
            negative: false,
            status: "ENABLED",
          },
        },
      },
    ])
  })

  it("uses Google remove operations for approval-gated creation rollback", () => {
    const state = stateWithCreatedKeyword(stateWithCreatedRsa(accountState()))
    expect(buildGoogleAdsMutateOperations([{
      expected: "ENABLED",
      kind: "ad_status",
      next: "REMOVED",
      resourceName: createdAdResourceName,
    }, {
      expected: "ENABLED",
      kind: "keyword_status",
      next: "REMOVED",
      resourceName: createdKeywordResourceName,
    }], state)).toEqual([{
      adGroupAdOperation: { remove: createdAdResourceName },
    }, {
      adGroupCriterionOperation: { remove: createdKeywordResourceName },
    }])
  })

  it("rejects duplicate create targets in the fresh baseline", () => {
    const rsaState = stateWithCreatedRsa(accountState())
    expect(() => validateAdsMutationPolicy({
      operations: [rsaCreateOperation],
      state: rsaState,
    })).toThrow("create_target_already_exists")

    const keywordState = stateWithCreatedKeyword(accountState())
    expect(() => validateAdsMutationPolicy({
      operations: [positiveKeywordCreateOperation],
      state: keywordState,
    })).toThrow("create_target_already_exists")
  })

  it("maps status, bidding, negative-keyword, and schedule packets deterministically", () => {
    const scheduleResource =
      "customers/123/campaignCriteria/456~444"
    const state = accountState({
      campaignCriteria: [
        resource(scheduleResource, {
          campaignCriterion: {
            adSchedule: {
              dayOfWeek: "MONDAY",
              endHour: 17,
              endMinute: "ZERO",
              startHour: 9,
              startMinute: "ZERO",
            },
            campaign: campaignResourceName,
            resourceName: scheduleResource,
            status: "ENABLED",
            type: "AD_SCHEDULE",
          },
        }),
      ],
    })

    expect(buildGoogleAdsMutateOperations([{
      expected: "ENABLED",
      kind: "campaign_status",
      next: "PAUSED",
      resourceName: campaignResourceName,
    }], state)).toEqual([{
      campaignOperation: {
        update: {
          resourceName: campaignResourceName,
          status: "PAUSED",
        },
        updateMask: "status",
      },
    }])

    expect(buildGoogleAdsMutateOperations([{
      expected: { strategy: "MANUAL_CPC" },
      kind: "campaign_bidding",
      next: {
        strategy: "MAXIMIZE_CONVERSION_VALUE",
        targetRoas: 1.35,
      },
      resourceName: campaignResourceName,
    }], state)).toEqual([{
      campaignOperation: {
        update: {
          maximizeConversionValue: { targetRoas: 1.35 },
          resourceName: campaignResourceName,
        },
        updateMask: "maximizeConversionValue.targetRoas",
      },
    }])

    expect(buildGoogleAdsMutateOperations([{
      expected: { strategy: "MANUAL_CPC" },
      kind: "campaign_bidding",
      next: { strategy: "MAXIMIZE_CONVERSIONS" },
      resourceName: campaignResourceName,
    }], state)).toEqual([{
      campaignOperation: {
        update: {
          maximizeConversions: {},
          resourceName: campaignResourceName,
        },
        updateMask: "maximizeConversions.targetCpaMicros",
      },
    }])

    expect(buildGoogleAdsMutateOperations([{
      expected: {
        strategy: "MAXIMIZE_CONVERSIONS",
        targetCpaMicros: 35_000_000,
      },
      kind: "campaign_bidding",
      next: { strategy: "MANUAL_CPC" },
      resourceName: campaignResourceName,
    }], state)).toEqual([{
      campaignOperation: {
        update: {
          manualCpc: { enhancedCpcEnabled: false },
          resourceName: campaignResourceName,
        },
        updateMask: "manualCpc.enhancedCpcEnabled",
      },
    }])

    expect(buildGoogleAdsMutateOperations([{
      campaignResourceName,
      kind: "negative_keyword",
      matchType: "PHRASE",
      text: "free prescription",
    }], state)).toEqual([{
      campaignCriterionOperation: {
        create: {
          campaign: campaignResourceName,
          keyword: {
            matchType: "PHRASE",
            text: "free prescription",
          },
          negative: true,
          status: "ENABLED",
        },
      },
    }])

    expect(buildGoogleAdsMutateOperations([{
      campaignResourceName,
      expected: [{
        dayOfWeek: "MONDAY",
        endHour: 17,
        endMinute: "ZERO",
        startHour: 9,
        startMinute: "ZERO",
      }],
      kind: "schedule_replace",
      next: [{
        dayOfWeek: "TUESDAY",
        endHour: 24,
        endMinute: "ZERO",
        startHour: 0,
        startMinute: "ZERO",
      }],
    }], state)).toEqual([
      {
        campaignCriterionOperation: {
          remove: scheduleResource,
        },
      },
      {
        campaignCriterionOperation: {
          create: {
            adSchedule: {
              dayOfWeek: "TUESDAY",
              endHour: 24,
              endMinute: "ZERO",
              startHour: 0,
              startMinute: "ZERO",
            },
            campaign: campaignResourceName,
            negative: false,
            status: "ENABLED",
          },
        },
      },
    ])
  })

  it("read-backs every successful apply and appends PHI-free stage receipts", async () => {
    const before = accountState()
    const after = stateWithBudget(before, 48_000_000)
    const harness = gateway({ accountReads: [before, after] })

    await harness.gateway.applyProposal("ADS-20260730-01")

    expect(harness.getAccountState).toHaveBeenCalledTimes(2)
    expect(harness.store.audits.map(({ stage }) => stage)).toEqual([
      "apply_started",
      "apply",
      "verify",
    ])
    const serialized = JSON.stringify(harness.store.audits)
    expect(serialized).not.toMatch(
      /patient|medicine|keyword|sildenafil|callback_query|telegram.*user/i,
    )
    expect(harness.store.getCurrent().verificationReceipt).toMatchObject({
      outcome: "verified",
      proposalKey: "ADS-20260730-01",
    })
  })

  it("marks read-back mismatch failed and creates an approval-gated rollback packet", async () => {
    const state = accountState()
    const harness = gateway({ accountReads: [state, state] })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "applied" })

    expect(harness.store.getCurrent().status).toBe("failed")
    expect(harness.store.getCurrent().verificationReceipt).toMatchObject({
      outcome: "mismatch",
    })
    expect(harness.store.rollbacks).toHaveLength(1)
    expect(harness.store.rollbacks[0]).toMatchObject({
      approvalChannel: null,
      status: "draft",
    })
    expect(harness.store.rollbacks[0].operations).toEqual([{
      ...budgetOperation,
      expectedMicros: 48_000_000,
      nextMicros: 40_000_000,
    }])
  })

  it("does not retry an ambiguous apply and classifies it by fresh read-back", async () => {
    const before = accountState()
    const after = stateWithBudget(before, 48_000_000)
    const mutate = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        rawError: null,
        requestId: "validate-request",
        results: [],
      })
      .mockResolvedValueOnce({
        ok: false,
        rawError: "network_connection_reset",
        requestId: null,
        results: [],
      })
    const harness = gateway({
      accountReads: [before, after],
      mutate,
    })

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "ambiguous" })
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(harness.store.getCurrent().status).toBe("verified")
  })

  it("reconciles an interrupted applying proposal only from exact live state", async () => {
    const before = accountState()
    const after = stateWithBudget(before, 48_000_000)
    const harness = gateway({
      accountReads: [after],
      initial: proposal(before, { status: "applying" }),
    })

    await expect(
      harness.gateway.reconcileProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({ outcome: "verified" })

    expect(harness.mutate).not.toHaveBeenCalled()
    expect(harness.store.getCurrent()).toMatchObject({
      applyReceipt: {
        errorCode: "worker_interrupted_after_google_mutate",
        outcome: "ambiguous",
        requestId: null,
      },
      status: "verified",
      verificationReceipt: { outcome: "verified" },
    })
    expect(harness.store.audits.map(({ stage }) => stage)).toEqual([
      "apply",
      "verify",
    ])
  })

  it("leaves an interrupted proposal applying when live state does not match", async () => {
    const state = accountState()
    const harness = gateway({
      accountReads: [state],
      initial: proposal(state, { status: "applying" }),
    })

    await expect(
      harness.gateway.reconcileProposal("ADS-20260730-01"),
    ).rejects.toThrow("proposal_reconciliation_mismatch")

    expect(harness.mutate).not.toHaveBeenCalled()
    expect(harness.store.getCurrent()).toMatchObject({
      applyReceipt: null,
      status: "applying",
      verificationReceipt: null,
    })
    expect(harness.store.audits).toEqual([
      expect.objectContaining({
        errorCode: "applying_reconciliation_mismatch",
        outcome: "mismatch",
        stage: "verify",
      }),
    ])
  })

  it("refuses reconciliation outside the receipt-free applying state", async () => {
    const state = accountState()
    const approved = gateway({
      accountReads: [state],
      initial: proposal(state, { status: "approved" }),
    })
    await expect(
      approved.gateway.reconcileProposal("ADS-20260730-01"),
    ).rejects.toThrow("proposal_not_applying")
    expect(approved.getAccountState).not.toHaveBeenCalled()

    const withReceipt = gateway({
      accountReads: [state],
      initial: proposal(state, {
        applyReceipt: {
          appliedAt: "2026-07-30T09:55:00.000Z",
          errorCode: null,
          googleOperationsHash:
            proposal(state).validationReceipt!.googleOperationsHash!,
          outcome: "applied",
          proposalKey: "ADS-20260730-01",
          requestId: "apply-request",
        },
        status: "applying",
      }),
    })
    await expect(
      withReceipt.gateway.reconcileProposal("ADS-20260730-01"),
    ).rejects.toThrow("proposal_reconciliation_receipt_conflict")
    expect(withReceipt.getAccountState).not.toHaveBeenCalled()
  })

  it("stops before apply when the durable apply-start audit is unavailable", async () => {
    const before = accountState()
    const after = stateWithBudget(before, 48_000_000)
    const harness = gateway({ accountReads: [before, after] })
    vi.mocked(harness.store.repository.appendAudit).mockRejectedValueOnce(
      new Error("audit unavailable"),
    )

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      errorCode: "audit_receipt_unavailable",
      outcome: "aborted",
    })
    expect(harness.mutate).toHaveBeenCalledTimes(1)
    expect(harness.mutate.mock.calls[0][0].validateOnly).toBe(true)
    expect(harness.store.getCurrent().status).toBe("aborted")
  })

  it("durably marks an apply ambiguous when fresh read-back is unavailable", async () => {
    const before = accountState()
    const harness = gateway({ accountReads: [before] })
    harness.getAccountState.mockRejectedValueOnce(
      new Error("read-back unavailable"),
    )

    await expect(
      harness.gateway.applyProposal("ADS-20260730-01"),
    ).resolves.toMatchObject({
      errorCode: "readback_unavailable",
      outcome: "ambiguous",
    })
    expect(harness.mutate).toHaveBeenCalledTimes(2)
    expect(harness.store.getCurrent()).toMatchObject({
      status: "failed",
      verificationReceipt: {
        outcome: "mismatch",
        resourceHashes: {},
      },
    })
  })

  it("hashes mutable account truth independently of read time and change history", () => {
    const first = accountState()
    const sameConfiguration = accountState({
      changeEvents: [{
        actorHash: "d".repeat(64),
        changeDateTime: "2026-07-30T09:31:00.000Z",
        changedFields: ["status"],
        changeResourceName: campaignResourceName,
        changeResourceType: "CAMPAIGN",
        clientType: "GOOGLE_ADS_WEB_CLIENT",
        resourceChangeOperation: "UPDATE",
        resourceName: "customers/123/changeEvents/change",
      }],
      readAt: "2026-07-30T09:35:00.000Z",
    })

    expect(hashGoogleAdsAccountState(sameConfiguration)).toBe(
      hashGoogleAdsAccountState(first),
    )
    expect(hashGoogleAdsAccountState(stateWithBudget(first, 41_000_000))).not
      .toBe(hashGoogleAdsAccountState(first))
  })
})
