import { describe, expect, it, vi } from "vitest"

import {
  activateAdsExperiment,
  type AdsExperiment,
  type AdsExperimentCheckpoint,
  type AdsExperimentRepository,
  buildAdsExperiment,
  buildSequentialExperimentCheckpoint,
  createAdsExperiment,
  evaluateAdsExperiment,
  EXPERIMENT_VARIABLES,
  experimentsOverlap,
  experimentVariableForMutationFamily,
  FEE_AWARE_EXPERIMENT_METRIC,
  requestExperimentStop,
} from "@/lib/ads-agent/experiments"
import {
  type AdsChangeProposal,
  type AdsMutationOperation,
  hashAdsMutationOperations,
} from "@/lib/ads-agent/proposals"

const NOW = new Date("2026-08-05T00:00:00.000Z")
const CAMPAIGN = "IM | Search | Med Certs"

function proposal(
  overrides: Partial<AdsChangeProposal> = {},
): AdsChangeProposal {
  const operations: AdsMutationOperation[] = [{
    campaignResourceName: "customers/123/campaigns/456",
    expected: [{
      dayOfWeek: "MONDAY",
      endHour: 22,
      endMinute: "ZERO",
      startHour: 6,
      startMinute: "ZERO",
    }],
    kind: "schedule_replace",
    next: [{
      dayOfWeek: "MONDAY",
      endHour: 24,
      endMinute: "ZERO",
      startHour: 0,
      startMinute: "ZERO",
    }],
  }]
  const operationHash = hashAdsMutationOperations(operations)
  return {
    approvalActorHash: "b".repeat(64),
    approvalChannel: "telegram",
    approvalReference: "telegram-button",
    approvedAt: "2026-08-04T23:55:00.000Z",
    applyReceipt: {
      appliedAt: "2026-08-04T23:58:00.000Z",
      errorCode: null,
      googleOperationsHash: "d".repeat(64),
      outcome: "applied",
      proposalKey: "ADS-20260805-01",
      requestId: "request-apply",
    },
    baselineHash: "a".repeat(64),
    expiresAt: "2026-08-05T23:00:00.000Z",
    id: "proposal-id",
    mutationFamily: "schedule_replace",
    operationHash,
    operations,
    proposalKey: "ADS-20260805-01",
    rationale: {
      boundedImpact: "A$20/day, fixed two-week evidence window",
      campaign: CAMPAIGN,
      currentValue: "06:00-22:00",
      reason: "Test whether after-hours demand retains contribution",
      requestedValue: "24/7",
      service: "med_certs",
    },
    rejectedAt: null,
    rollbackPlan: { value: "06:00-22:00" },
    runId: "run-id",
    status: "verified",
    telegramCallbackQueryHash: "c".repeat(64),
    telegramMessageId: 100,
    telegramUpdateId: 200,
    validationReceipt: {
      baselineHash: "a".repeat(64),
      googleOperationsHash: "d".repeat(64),
      ok: true,
      operationHash,
      proposalKey: "ADS-20260805-01",
      requestId: "request-validate",
      validatedAt: "2026-08-04T23:50:00.000Z",
    },
    verificationReceipt: {
      outcome: "verified",
      proposalKey: "ADS-20260805-01",
      resourceHashes: { "op-01": "e".repeat(64) },
      verifiedAt: NOW.toISOString(),
    },
    ...overrides,
  }
}

function experiment(
  overrides: Partial<AdsExperiment> = {},
): AdsExperiment {
  return {
    challenger: {
      campaign: CAMPAIGN,
      methodology: "versioned_sequential",
      proposalKey: "ADS-20260805-01",
      value: "24/7",
      version: "EXP-20260805-01:challenger",
      windowEndsAt: "2026-08-19T00:00:00.000Z",
      windowStartsAt: NOW.toISOString(),
    },
    control: {
      campaign: CAMPAIGN,
      methodology: "versioned_sequential",
      proposalKey: "ADS-20260805-01",
      value: "06:00-22:00",
      version: "EXP-20260805-01:control",
      windowEndsAt: NOW.toISOString(),
      windowStartsAt: "2026-07-22T00:00:00.000Z",
    },
    createdAt: NOW.toISOString(),
    endsAt: "2026-08-19T00:00:00.000Z",
    experimentKey: "EXP-20260805-01",
    hypothesis: "After-hours demand improves fee-aware contribution",
    id: "experiment-id",
    maxLossCents: 15_000,
    minimumOrdersPerArm: 10,
    primaryMetric: FEE_AWARE_EXPERIMENT_METRIC,
    result: {
      checkpoints: [],
      launchProposalKey: "ADS-20260805-01",
      methodology: "versioned_sequential",
      stopProposalKey: null,
    },
    service: "med_certs",
    startsAt: NOW.toISOString(),
    status: "running",
    updatedAt: NOW.toISOString(),
    variable: "schedules",
    ...overrides,
  }
}

function checkpoint(
  overrides: Partial<AdsExperimentCheckpoint> = {},
): AdsExperimentCheckpoint {
  return {
    asOf: "2026-08-19T00:00:00.000Z",
    challenger: {
      contributionCents: 12_000,
      retainedOrders: 12,
    },
    control: {
      contributionCents: 9_000,
      retainedOrders: 10,
    },
    trackingState: "GREEN",
    ...overrides,
  }
}

function repository(
  overlaps: AdsExperiment[] = [],
): AdsExperimentRepository & {
  inserted: AdsExperiment[]
  updated: AdsExperiment[]
} {
  const inserted: AdsExperiment[] = []
  const updated: AdsExperiment[] = []
  return {
    inserted,
    updated,
    async findMaterialOverlaps() {
      return overlaps
    },
    async getByKey(experimentKey) {
      return [...updated, ...inserted, ...overlaps]
        .find((item) => item.experimentKey === experimentKey) ?? null
    },
    async insert(value) {
      inserted.push(value)
      return value
    },
    async update(value) {
      updated.push(value)
      return value
    },
  }
}

describe("Google Ads experiment definition", () => {
  it("pins one service, one variable, fee-aware economics, loss, sample, windows, and versions", () => {
    const value = buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal(),
    })

    expect(value.service).toBe("med_certs")
    expect(value.variable).toBe("schedules")
    expect(value.primaryMetric).toBe(
      "first_order_contribution_cents_per_retained_order",
    )
    expect(value.maxLossCents).toBe(15_000)
    expect(value.minimumOrdersPerArm).toBe(10)
    expect(value.startsAt).toBe(NOW.toISOString())
    expect(value.endsAt).toBe("2026-08-19T00:00:00.000Z")
    expect(value.control.version).not.toBe(value.challenger.version)
    expect(value.control.campaign).toBe(value.challenger.campaign)
    expect(value.result.methodology).toBe("versioned_sequential")
  })

  it("uses a Google custom experiment only above ten forecast retained orders per arm", () => {
    expect(buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 19,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal(),
    }).result.methodology).toBe("versioned_sequential")

    expect(buildAdsExperiment({
      experimentKey: "EXP-20260805-02",
      forecastRetainedOrders30d: 20,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal(),
    }).result.methodology).toBe("google_custom")
  })

  it("keeps every material variable category distinct", () => {
    expect(experimentVariableForMutationFamily("ad_status")).toBe("ad_copy")
    expect(experimentVariableForMutationFamily("keyword_status")).toBe(
      "keywords",
    )
    expect(experimentVariableForMutationFamily("negative_keyword")).toBe(
      "keywords",
    )
    expect(experimentVariableForMutationFamily("asset_link_status")).toBe(
      "assets",
    )
    expect(experimentVariableForMutationFamily("campaign_bidding")).toBe(
      "bids",
    )
    expect(experimentVariableForMutationFamily("ad_group_cpc_bid")).toBe(
      "bids",
    )
    expect(experimentVariableForMutationFamily("campaign_budget")).toBe(
      "budgets",
    )
    expect(experimentVariableForMutationFamily("schedule_replace")).toBe(
      "schedules",
    )
    expect(EXPERIMENT_VARIABLES).toContain("landing_pages")
  })

  it("rejects mixed variables, account-wide tests, weak bounds, and remediation masquerading as an experiment", () => {
    const mixedOperations = [
      ...proposal().operations,
      {
        expectedMicros: 20_000_000,
        kind: "campaign_budget",
        nextMicros: 21_000_000,
        resourceName: "customers/123/campaignBudgets/789",
      } satisfies AdsMutationOperation,
    ]
    expect(() => buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal({ operations: mixedOperations }),
    })).toThrow("experiment_requires_one_variable")
    expect(() => buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal({
        rationale: {
          ...proposal().rationale,
          service: "account",
        },
      }),
    })).toThrow("experiment_requires_one_service")
    expect(() => buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 0,
      minimumOrdersPerArm: 9,
      now: NOW,
      proposal: proposal(),
    })).toThrow("experiment_max_loss_invalid")
    expect(() => buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal(),
      safetyOrComplianceRemediation: true,
    })).toThrow("remediation_is_not_an_experiment")
    expect(() => buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal({
        rationale: {
          ...proposal().rationale,
          reason: "Compliance remediation for a misleading legacy claim",
        },
      }),
    })).toThrow("remediation_is_not_an_experiment")
  })

  it("registers a validated packet before launch and runs only after verified read-back", () => {
    const registered = buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal({
        approvalActorHash: null,
        approvalChannel: null,
        approvalReference: null,
        approvedAt: null,
        applyReceipt: null,
        status: "validated",
        verificationReceipt: null,
      }),
    })
    expect(registered.status).toBe("draft")
    expect(activateAdsExperiment({
      experiment: registered,
      proposal: proposal(),
    })).toMatchObject({
      startsAt: NOW.toISOString(),
      status: "running",
    })

    expect(() => buildAdsExperiment({
      experimentKey: "EXP-20260805-01",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: NOW,
      proposal: proposal({
        status: "draft",
        validationReceipt: null,
        verificationReceipt: null,
      }),
    })).toThrow("experiment_packet_not_validated")
  })
})

describe("Google Ads experiment overlap and evaluation", () => {
  it("builds a durable sequential checkpoint from complete Sydney-day evidence", () => {
    const shortExperiment = experiment({
      endsAt: "2026-08-07T00:00:00.000Z",
    })
    const dailyRun = (reportDate: string, contributionCents: number) => ({
      reportDate,
      snapshot: {
        daily: [{
          campaignName: CAMPAIGN,
          contributionCents,
          orders: 1,
          refundedOrders: 0,
          unavailableReasonCodes: [],
        }],
      },
      status: "delivered" as const,
      trackingState: "GREEN" as const,
    })
    const complete = buildSequentialExperimentCheckpoint({
      experiment: shortExperiment,
      now: new Date("2026-08-07T00:00:00.000Z"),
      runs: [
        dailyRun("2026-08-03", 700),
        dailyRun("2026-08-04", 900),
        dailyRun("2026-08-06", 1_100),
      ],
    })

    expect(complete).toMatchObject({
      challenger: {
        contributionCents: 1_100,
        retainedOrders: 1,
      },
      control: {
        contributionCents: 1_600,
        retainedOrders: 2,
      },
      economicsComplete: true,
      trackingState: "GREEN",
    })
    expect(buildSequentialExperimentCheckpoint({
      experiment: shortExperiment,
      now: new Date("2026-08-07T00:00:00.000Z"),
      runs: [
        dailyRun("2026-08-03", 700),
        dailyRun("2026-08-06", 1_100),
      ],
    }).economicsComplete).toBe(false)
  })

  it("rejects overlapping material work on the same campaign", async () => {
    const active = experiment()
    const store = repository([active])
    await expect(createAdsExperiment({
      experimentKey: "EXP-20260805-02",
      forecastRetainedOrders30d: 12,
      maxLossCents: 15_000,
      minimumOrdersPerArm: 10,
      now: new Date("2026-08-06T00:00:00.000Z"),
      proposal: proposal({
        proposalKey: "ADS-20260806-01",
        validationReceipt: {
          ...proposal().validationReceipt!,
          proposalKey: "ADS-20260806-01",
        },
        verificationReceipt: {
          ...proposal().verificationReceipt!,
          proposalKey: "ADS-20260806-01",
        },
      }),
      repository: store,
    })).rejects.toThrow("experiment_campaign_overlap")
    expect(store.inserted).toHaveLength(0)
    expect(experimentsOverlap(active, experiment({
      experimentKey: "EXP-20260820-01",
      startsAt: "2026-08-20T00:00:00.000Z",
      endsAt: "2026-09-03T00:00:00.000Z",
    }))).toBe(false)
  })

  it("continues before the end, but requests an approval-gated stop at the fixed loss cap", () => {
    expect(evaluateAdsExperiment({
      checkpoint: checkpoint({ asOf: "2026-08-10T00:00:00.000Z" }),
      experiment: experiment(),
    })).toMatchObject({
      action: "continue",
      outcome: "running",
    })

    expect(evaluateAdsExperiment({
      checkpoint: checkpoint({
        asOf: "2026-08-10T00:00:00.000Z",
        challenger: {
          contributionCents: -16_000,
          retainedOrders: 4,
        },
      }),
      experiment: experiment(),
    })).toMatchObject({
      action: "request_stop",
      lossCents: 19_600,
      outcome: "lost",
      reasonCodes: ["MAX_LOSS_REACHED"],
    })
  })

  it("is inconclusive rather than a win when sample or tracking truth is unavailable", () => {
    expect(evaluateAdsExperiment({
      checkpoint: checkpoint({
        challenger: {
          contributionCents: 7_000,
          retainedOrders: 9,
        },
      }),
      experiment: experiment(),
    })).toMatchObject({
      action: "complete",
      outcome: "inconclusive",
      reasonCodes: ["MINIMUM_SAMPLE_NOT_MET"],
    })

    expect(evaluateAdsExperiment({
      checkpoint: checkpoint({ trackingState: "RED" }),
      experiment: experiment(),
    })).toMatchObject({
      action: "request_stop",
      outcome: "inconclusive",
      reasonCodes: ["TRACKING_NOT_GREEN"],
    })
  })

  it("selects a winner only after the window and minimum fee-aware sample", () => {
    expect(evaluateAdsExperiment({
      checkpoint: checkpoint(),
      experiment: experiment(),
    })).toMatchObject({
      action: "complete",
      challengerMetricCents: 1_000,
      controlMetricCents: 900,
      deltaMetricCents: 100,
      outcome: "won",
    })
  })
})

describe("Google Ads experiment stop boundary", () => {
  it("creates a rollback proposal first and marks stopped only after its read-back is verified", async () => {
    const store = repository([experiment()])
    const rollback = proposal({
      id: "rollback-id",
      proposalKey: "ADS-20260810-01",
      status: "draft",
      verificationReceipt: null,
    })
    const buildRollbackProposal = vi.fn().mockResolvedValue(rollback)

    await expect(requestExperimentStop({
      buildRollbackProposal,
      experimentKey: "EXP-20260805-01",
      getProposal: vi.fn(),
      now: new Date("2026-08-10T00:00:00.000Z"),
      repository: store,
    })).resolves.toMatchObject({
      approvalRequired: true,
      experimentStatus: "running",
      stopProposalKey: "ADS-20260810-01",
    })
    expect(buildRollbackProposal).toHaveBeenCalledWith("ADS-20260805-01")

    const awaitingStop = store.updated.at(-1)!
    const stoppedStore = repository([awaitingStop])
    await expect(requestExperimentStop({
      buildRollbackProposal,
      experimentKey: "EXP-20260805-01",
      getProposal: vi.fn().mockResolvedValue(proposal({
        proposalKey: "ADS-20260810-01",
      })),
      now: new Date("2026-08-10T00:05:00.000Z"),
      repository: stoppedStore,
    })).resolves.toMatchObject({
      approvalRequired: false,
      experimentStatus: "stopped",
      stopProposalKey: "ADS-20260810-01",
    })
    expect(stoppedStore.updated.at(-1)?.status).toBe("stopped")
  })
})
