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
    const card = formatTelegramAdsProposalCard(proposal())
    expect(card).toContain("ADS-20260730-01 · expires")
    expect(card).toContain("ED · ED: ENABLED → PAUSED")
    expect(card).toContain("Bounded impact: up to A$7/day avoided")
    expect(card).toContain("Why: Specialty loss cap reached")
    expect(card).toContain("Validation: PASSED")
    expect(card).toContain("Rollback: PAUSED → ENABLED")
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
