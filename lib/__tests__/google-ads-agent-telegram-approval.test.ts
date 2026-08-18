import { describe, expect, it, vi } from "vitest"

import {
  type AdsChangeProposal,
  hashAdsMutationOperations,
} from "@/lib/ads-agent/proposals"
import {
  buildTelegramAdsCallbackData,
  formatTelegramAdsProposalCard,
  handleTelegramAdsDecision,
  type TelegramAdsApprovalRepository,
  verifyTelegramWebhookSecret,
} from "@/lib/ads-agent/telegram-approval"

const signingSecret = "ads-signing-secret-that-is-independent-123"
const operations = [{
  kind: "campaign_status" as const,
  resourceName: "customers/123/campaigns/456",
  expected: "ENABLED" as const,
  next: "PAUSED" as const,
}]
const operationHash = hashAdsMutationOperations(operations)

function proposal(
  overrides: Partial<AdsChangeProposal> = {},
): AdsChangeProposal {
  return {
    approvalActorHash: null,
    approvalChannel: null,
    approvalReference: null,
    approvedAt: null,
    applyReceipt: null,
    baselineHash: "a".repeat(64),
    expiresAt: "2026-07-30T10:42:00.000Z",
    id: "proposal-id",
    mutationFamily: "campaign_status",
    operations,
    operationHash,
    proposalKey: "ADS-20260730-01",
    rationale: {
      boundedImpact: "up to A$7/day avoided",
      campaign: "ED",
      currentValue: "ENABLED",
      reason: "Specialty loss cap reached",
      requestedValue: "PAUSED",
      service: "ed",
    },
    rejectedAt: null,
    rollbackPlan: { value: "ENABLED" },
    runId: "run-id",
    status: "awaiting_approval",
    telegramCallbackQueryHash: null,
    telegramMessageId: 9042,
    telegramUpdateId: null,
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

function proposalForOperations(
  nextOperations: AdsChangeProposal["operations"],
  overrides: Partial<AdsChangeProposal> = {},
): AdsChangeProposal {
  const nextOperationHash = hashAdsMutationOperations(nextOperations)
  return proposal({
    mutationFamily: nextOperations[0].kind,
    operationHash: nextOperationHash,
    operations: nextOperations,
    validationReceipt: {
      ...proposal().validationReceipt!,
      operationHash: nextOperationHash,
    },
    ...overrides,
  })
}

function env(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    TELEGRAM_ADS_APPROVALS_ENABLED: "true",
    TELEGRAM_ADS_APPROVAL_SIGNING_SECRET: signingSecret,
    TELEGRAM_ADS_APPROVER_USER_ID: "777001",
    TELEGRAM_CHAT_ID: "-100123456",
    ...overrides,
  }
}

function body(
  target = proposal(),
  overrides: Record<string, unknown> = {},
) {
  return {
    update_id: 88001,
    callback_query: {
      data: buildTelegramAdsCallbackData("approve", target, signingSecret),
      from: { id: 777001, username: "must-not-be-stored" },
      id: "callback-query-secret-ish-value",
      message: {
        chat: { id: -100123456 },
        message_id: 9042,
        text: "must not be trusted or stored",
      },
    },
    ...overrides,
  }
}

function repository(target = proposal()): {
  captured: ReturnType<typeof vi.fn>
  repository: TelegramAdsApprovalRepository
} {
  const captured = vi.fn().mockResolvedValue({ consumed: true })
  return {
    captured,
    repository: {
      compareAndSetDecision: captured,
      getProposalByKey: vi.fn().mockResolvedValue(target),
    },
  }
}

describe("Telegram Ads approval security", () => {
  it("verifies the webhook secret with an exact constant-time comparison", () => {
    expect(verifyTelegramWebhookSecret("hook-secret", "hook-secret")).toBe(true)
    expect(verifyTelegramWebhookSecret("hook-secret", "wrong")).toBe(false)
    expect(verifyTelegramWebhookSecret("", "hook-secret")).toBe(false)
    expect(verifyTelegramWebhookSecret("hook-secret", "")).toBe(false)
  })

  it("accepts only the restricted signed callback namespaces", () => {
    expect(
      buildTelegramAdsCallbackData("approve", proposal(), signingSecret),
    ).toMatch(/^ads:a:ADS-20260730-01:[a-f0-9]{16}$/)
    expect(
      buildTelegramAdsCallbackData("reject", proposal(), signingSecret),
    ).toMatch(/^ads:r:ADS-20260730-01:[a-f0-9]{16}$/)
  })

  it("renders the complete PHI-free approval packet", () => {
    const card = formatTelegramAdsProposalCard(proposal(), {
      durationDays: 14,
      maxLossCents: 15_000,
      methodology: "versioned_sequential",
      minimumOrdersPerArm: 10,
      variable: "schedules",
    })
    expect(card).toContain("ADS-20260730-01 · expires")
    expect(card).toContain("ED · ED: ENABLED → PAUSED")
    expect(card).toContain("Bounded impact: up to A$7/day avoided")
    expect(card).toContain("Why: Specialty loss cap reached")
    expect(card).toContain("Validation: PASSED")
    expect(card).toContain("Rollback: PAUSED → ENABLED")
    expect(card).toContain(
      "Experiment: schedules · sequential · 14 days · minimum 10 retained orders/arm · A$150.00 max loss",
    )
  })

  it("shows the canonical budget operation even when the rationale understates it", () => {
    const budgetOperations: AdsChangeProposal["operations"] = [{
      expectedMicros: 40_000_000,
      kind: "campaign_budget",
      nextMicros: 60_000_000,
      resourceName: "customers/9205010513/campaignBudgets/15589755119",
    }]
    const budgetHash = hashAdsMutationOperations(budgetOperations)
    const card = formatTelegramAdsProposalCard(proposalForOperations(
      budgetOperations,
      {
        rationale: {
          boundedImpact: "Only A$8/day more",
          campaign: "Scripts",
          currentValue: "A$40/day",
          reason: "Scale a profitable campaign",
          requestedValue: "A$48/day",
          service: "scripts",
        },
      },
    ))

    expect(card).toContain(`Trusted operations · SHA-256 ${budgetHash}`)
    expect(card).toContain(
      "Resource: customers/9205010513/campaignBudgets/15589755119",
    )
    expect(card).toContain(
      "Expected → next: 40000000 micros (A$40.00) → 60000000 micros (A$60.00)",
    )
    expect(card).toContain("Scripts · Scripts: A$40/day → A$48/day")
  })

  it("shows every responsive search ad field from the canonical operation", () => {
    const rsaOperations: AdsChangeProposal["operations"] = [{
      adGroupResourceName: "customers/9205010513/adGroups/197218555566",
      descriptions: [
        "Complete a secure men's health form. An Australian doctor reviews it.",
        "Private assessment online. A doctor may call before prescribing.",
        "If approved, your eScript is sent by SMS.",
      ],
      finalUrl: "https://instantmed.com.au/erectile-dysfunction",
      headlines: [
        "Private ED Assessment",
        "Doctor Review Online",
        "Start With a Secure Form",
        "If Clinically Appropriate",
      ],
      kind: "responsive_search_ad_create",
      path1: "ed",
      path2: "doctor-review",
      status: "ENABLED",
    }]
    const card = formatTelegramAdsProposalCard(
      proposalForOperations(rsaOperations),
    )

    expect(card).toContain(
      "Ad group: customers/9205010513/adGroups/197218555566",
    )
    expect(card).toContain("Status: ENABLED")
    expect(card).toContain(
      "Final URL: https://instantmed.com.au/erectile-dysfunction",
    )
    expect(card).toContain('Display paths: "ed" / "doctor-review"')
    expect(card).toContain([
      "Headlines (4):",
      '1. "Private ED Assessment"',
      '2. "Doctor Review Online"',
      '3. "Start With a Secure Form"',
      '4. "If Clinically Appropriate"',
    ].join("\n"))
    expect(card).toContain([
      "Descriptions (3):",
      '1. "Complete a secure men\'s health form. An Australian doctor reviews it."',
      '2. "Private assessment online. A doctor may call before prescribing."',
      '3. "If approved, your eScript is sent by SMS."',
    ].join("\n"))
  })

  it("shows positive keyword text, match type, status, and target ad group", () => {
    const keywordOperations: AdsChangeProposal["operations"] = [{
      adGroupResourceName: "customers/9205010513/adGroups/196799711677",
      kind: "positive_keyword_create",
      matchType: "PHRASE",
      status: "ENABLED",
      text: "telehealth prescription",
    }]
    const card = formatTelegramAdsProposalCard(
      proposalForOperations(keywordOperations),
    )

    expect(card).toContain(
      "Ad group: customers/9205010513/adGroups/196799711677",
    )
    expect(card).toContain('Text: "telehealth prescription"')
    expect(card).toContain("Match type: PHRASE")
    expect(card).toContain("Status: ENABLED")
  })

  it("shows negative keyword text, match type, enabled status, and campaign", () => {
    const negativeOperations: AdsChangeProposal["operations"] = [{
      campaignResourceName: "customers/9205010513/campaigns/23870042807",
      kind: "negative_keyword",
      matchType: "PHRASE",
      text: "example medicine term",
    }]
    const card = formatTelegramAdsProposalCard(
      proposalForOperations(negativeOperations),
    )

    expect(card).toContain(
      "Campaign: customers/9205010513/campaigns/23870042807",
    )
    expect(card).toContain('Text: "example medicine term"')
    expect(card).toContain("Match type: PHRASE")
    expect(card).toContain("Status: ENABLED (negative criterion)")
  })

  it("shows every expected and next ad schedule entry", () => {
    const scheduleOperations: AdsChangeProposal["operations"] = [{
      campaignResourceName: "customers/9205010513/campaigns/23870042807",
      expected: [
        {
          dayOfWeek: "MONDAY",
          endHour: 20,
          endMinute: "ZERO",
          startHour: 8,
          startMinute: "ZERO",
        },
        {
          dayOfWeek: "SUNDAY",
          endHour: 24,
          endMinute: "ZERO",
          startHour: 0,
          startMinute: "THIRTY",
        },
      ],
      kind: "schedule_replace",
      next: [],
    }]
    const card = formatTelegramAdsProposalCard(
      proposalForOperations(scheduleOperations),
    )

    expect(card).toContain(
      "Campaign: customers/9205010513/campaigns/23870042807",
    )
    expect(card).toContain([
      "Expected schedule (2):",
      "1. MONDAY 08:00-20:00",
      "2. SUNDAY 00:30-24:00",
      "Next schedule (0):",
      "none (no ad schedule criteria)",
    ].join("\n"))
  })

  it("shows exact transitions for every mutable resource operation", () => {
    const cases: Array<{
      expected: string
      operations: AdsChangeProposal["operations"]
    }> = [
      {
        expected: [
          "Resource: customers/123/campaigns/456",
          "Expected → next: ENABLED → PAUSED",
        ].join("\n"),
        operations: [{
          expected: "ENABLED",
          kind: "campaign_status",
          next: "PAUSED",
          resourceName: "customers/123/campaigns/456",
        }],
      },
      {
        expected: [
          "Resource: customers/123/campaigns/456",
          'Expected → next: {"strategy":"MAXIMIZE_CONVERSION_VALUE"} → {"strategy":"MAXIMIZE_CONVERSION_VALUE","targetRoas":1.35}',
        ].join("\n"),
        operations: [{
          expected: { strategy: "MAXIMIZE_CONVERSION_VALUE" },
          kind: "campaign_bidding",
          next: {
            strategy: "MAXIMIZE_CONVERSION_VALUE",
            targetRoas: 1.35,
          },
          resourceName: "customers/123/campaigns/456",
        }],
      },
      {
        expected: [
          "Resource: customers/123/adGroups/789",
          "Expected → next: 10000 micros (A$0.01) → 3000000 micros (A$3.00)",
        ].join("\n"),
        operations: [{
          expectedMicros: 10_000,
          kind: "ad_group_cpc_bid",
          nextMicros: 3_000_000,
          resourceName: "customers/123/adGroups/789",
        }],
      },
      {
        expected: [
          "Resource: customers/123/adGroupAds/789~1011",
          "Expected → next: ENABLED → PAUSED",
        ].join("\n"),
        operations: [{
          expected: "ENABLED",
          kind: "ad_status",
          next: "PAUSED",
          resourceName: "customers/123/adGroupAds/789~1011",
        }],
      },
      {
        expected: [
          "Resource: customers/123/adGroupCriteria/789~1012",
          "Expected → next: ENABLED → PAUSED",
        ].join("\n"),
        operations: [{
          expected: "ENABLED",
          kind: "keyword_status",
          next: "PAUSED",
          resourceName: "customers/123/adGroupCriteria/789~1012",
        }],
      },
      {
        expected: [
          "Resource: customers/123/campaignAssets/456~222~SITELINK",
          "Expected → next: ENABLED → PAUSED",
        ].join("\n"),
        operations: [{
          expected: "ENABLED",
          kind: "asset_link_status",
          next: "PAUSED",
          resourceName: "customers/123/campaignAssets/456~222~SITELINK",
        }],
      },
    ]

    for (const entry of cases) {
      const card = formatTelegramAdsProposalCard(
        proposalForOperations(entry.operations),
      )
      expect(card).toContain(entry.expected)
    }
  })

  it("refuses to render a trusted summary when operations diverge from validation", () => {
    expect(() => formatTelegramAdsProposalCard(proposal({
      operations: [{
        ...operations[0],
        next: "ENABLED",
      }],
    }))).toThrow("proposal_operations_changed")
  })

  it("fails closed instead of truncating a trusted packet that exceeds Telegram limits", () => {
    const oversizedOperations: AdsChangeProposal["operations"] = Array.from(
      { length: 50 },
      (_, index) => ({
        expected: "ENABLED" as const,
        kind: "campaign_status" as const,
        next: "PAUSED" as const,
        resourceName: `customers/9205010513/campaigns/${23_000_000_000 + index}`,
      }),
    )

    expect(() => formatTelegramAdsProposalCard(
      proposalForOperations(oversizedOperations),
    )).toThrow("telegram_ads_proposal_card_too_long")
  })

  it("records an exact one-time approval without raw Telegram identity or payload", async () => {
    const { captured, repository: repo } = repository()

    await expect(handleTelegramAdsDecision({
      body: body(),
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({
      decision: "approve",
      ok: true,
      proposalKey: "ADS-20260730-01",
    })

    expect(captured).toHaveBeenCalledWith({
      actorHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      callbackQueryHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      decision: "approve",
      expectedStatus: "awaiting_approval",
      proposalId: "proposal-id",
      telegramMessageId: 9042,
      updateId: 88001,
    })
    expect(JSON.stringify(captured.mock.calls)).not.toContain("777001")
    expect(JSON.stringify(captured.mock.calls)).not.toContain("username")
    expect(JSON.stringify(captured.mock.calls)).not.toContain("must not")
    expect(JSON.stringify(captured.mock.calls)).not.toContain(
      "callback-query-secret-ish-value",
    )
  })

  it("records an exact rejection without invoking an approval path", async () => {
    const { captured, repository: repo } = repository()
    const rejectBody = body()
    rejectBody.callback_query.data = buildTelegramAdsCallbackData(
      "reject",
      proposal(),
      signingSecret,
    )

    await expect(handleTelegramAdsDecision({
      body: rejectBody,
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({
      decision: "reject",
      ok: true,
      proposalKey: "ADS-20260730-01",
    })
    expect(captured).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "reject" }),
    )
  })

  it.each([
    ["approvals_disabled", { TELEGRAM_ADS_APPROVALS_ENABLED: "false" }],
    ["approver_user_id_missing", { TELEGRAM_ADS_APPROVER_USER_ID: undefined }],
    [
      "approval_signing_secret_missing",
      { TELEGRAM_ADS_APPROVAL_SIGNING_SECRET: undefined },
    ],
    ["chat_id_missing", { TELEGRAM_CHAT_ID: undefined }],
  ])("rejects fail-closed configuration: %s", async (reason, override) => {
    const { repository: repo } = repository()
    await expect(handleTelegramAdsDecision({
      body: body(),
      envSource: env(override),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason })
  })

  it.each([
    ["chat_mismatch", { message: { chat: { id: -100999 }, message_id: 9042 } }],
    ["user_mismatch", { from: { id: 777002 } }],
    ["message_mismatch", { message: { chat: { id: -100123456 }, message_id: 9999 } }],
  ])("rejects an exact-envelope mismatch: %s", async (reason, callbackOverride) => {
    const { repository: repo } = repository()
    const base = body()
    const callback = {
      ...(base.callback_query as Record<string, unknown>),
      ...callbackOverride,
    }
    await expect(handleTelegramAdsDecision({
      body: { ...base, callback_query: callback },
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason })
  })

  it("rejects forwarded proposal messages", async () => {
    const { repository: repo } = repository()
    const base = body()
    const callback = base.callback_query as Record<string, unknown>
    await expect(handleTelegramAdsDecision({
      body: {
        ...base,
        callback_query: {
          ...callback,
          message: {
            ...(callback.message as Record<string, unknown>),
            forward_date: 1234,
          },
        },
      },
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason: "forwarded_message" })
  })

  it.each([
    ["proposal_expired", proposal({ expiresAt: "2026-07-30T09:00:00.000Z" })],
    ["proposal_terminal", proposal({ status: "rejected" })],
    [
      "proposal_changed",
      proposal({
        operations: [{
          ...operations[0],
          next: "ENABLED",
        }],
      }),
    ],
  ])("rejects %s", async (reason, target) => {
    const { repository: repo } = repository(target)
    await expect(handleTelegramAdsDecision({
      body: body(target),
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason })
  })

  it("rejects an invalid signature, unknown namespace, and free text", async () => {
    const { repository: repo } = repository()
    const base = body()
    const callback = base.callback_query as Record<string, unknown>

    await expect(handleTelegramAdsDecision({
      body: {
        ...base,
        callback_query: { ...callback, data: "ads:a:ADS-20260730-01:0000000000000000" },
      },
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason: "invalid_signature" })

    await expect(handleTelegramAdsDecision({
      body: {
        ...base,
        callback_query: { ...callback, data: "ads:x:ADS-20260730-01:0000000000000000" },
      },
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason: "unknown_action" })

    await expect(handleTelegramAdsDecision({
      body: { update_id: 88002, message: { text: "approve" } },
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ignored: true, ok: true })
  })

  it("rejects a callback replay when compare-and-set is already consumed", async () => {
    const { repository: repo } = repository()
    vi.mocked(repo.compareAndSetDecision).mockResolvedValue({
      consumed: false,
    })

    await expect(handleTelegramAdsDecision({
      body: body(),
      envSource: env(),
      now: new Date("2026-07-30T10:00:00.000Z"),
      repository: repo,
    })).resolves.toEqual({ ok: false, reason: "decision_already_consumed" })
  })
})
