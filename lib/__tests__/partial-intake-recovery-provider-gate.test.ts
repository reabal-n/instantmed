import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  env: {
    appUrl: "https://instantmed.example",
    isDev: false,
    resendApiKey: "re_test_key" as string | undefined,
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
  evaluatePartialIntakeRecoveryPolicy: vi.fn(),
  evaluateReviewRequestPolicy: vi.fn(),
  fetch: vi.fn(),
  getEmailBounceSuppressionDecision: vi.fn(),
  getEmailSuppressionDecisions: vi.fn(),
  getMarketingEmailDecision: vi.fn(),
  markPartialIntakeRecoveryCommunicationOutcome: vi.fn(),
  markReviewRequestCommunicationOutcome: vi.fn(),
  recordDeliverySent: vi.fn(),
  renderEmailToHtml: vi.fn(),
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: mocks.env,
}))

vi.mock("@/lib/email/partial-intake-recovery-policy", () => ({
  evaluatePartialIntakeRecoveryPolicy:
    mocks.evaluatePartialIntakeRecoveryPolicy,
  markPartialIntakeRecoveryCommunicationOutcome:
    mocks.markPartialIntakeRecoveryCommunicationOutcome,
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  evaluateReviewRequestPolicy: mocks.evaluateReviewRequestPolicy,
  markReviewRequestCommunicationOutcome:
    mocks.markReviewRequestCommunicationOutcome,
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.createPendingOutbox,
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: vi.fn(),
  persistFrozenProviderPayload: vi.fn(),
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision:
    mocks.getEmailBounceSuppressionDecision,
  htmlToPlainText: vi.fn(() =>
    "Finish your request (https://instantmed.example/request?service=med-cert&d=11111111-1111-4111-8111-111111111111)"
  ),
  isEmailSuppressed: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: mocks.getEmailSuppressionDecisions,
}))

vi.mock("@/lib/email/preferences", () => ({
  getMarketingEmailDecision: mocks.getMarketingEmailDecision,
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn().mockResolvedValue({
    allowed: true,
    current: 0,
    limit: 200,
  }),
  incrementDailySendCount: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: mocks.recordDeliverySent,
}))

import {
  freezeResendProviderPayload,
  FROZEN_PROVIDER_PAYLOAD_KEY,
} from "@/lib/email/send/provider-payload"
import type { OutboxRow } from "@/lib/email/send/types"
import {
  sendEmail,
  sendFromOutboxRow,
} from "@/lib/email/send-email"

const TRACKING_ID = "a6bd50f7-ad78-4fba-9822-a89580b58bf7"
const UPDATED_AT = "2026-07-19T07:00:00.000Z"
const RESUME_URL =
  "https://instantmed.example/request?service=med-cert&d=11111111-1111-4111-8111-111111111111"

function allowedRecoveryDecision(
  overrides: Partial<{
    email: string
    resumeUrl: string
  }> = {},
) {
  return {
    kind: "allowed" as const,
    draft: {
      recoveryTrackingId: TRACKING_ID,
      sessionId: "11111111-1111-4111-8111-111111111111",
      serviceType: "med-cert",
      email: overrides.email ?? "patient@example.com",
      firstName: "Patient",
      updatedAt: UPDATED_AT,
      expiresAt: "2026-07-25T00:00:00.000Z",
      resumeUrl: overrides.resumeUrl ?? RESUME_URL,
    },
  }
}

function frozenRecoveryPayload(input: {
  email?: string
  resumeUrl?: string
} = {}) {
  const email = input.email ?? "patient@example.com"
  const resumeUrl = input.resumeUrl ?? RESUME_URL
  return freezeResendProviderPayload({
    from: "InstantMed <support@instantmed.example>",
    to: [email],
    subject: "Your request is still saved",
    html: `<a href="${resumeUrl}">Finish your request</a>`,
    text: `Finish your request (${resumeUrl})`,
  })
}

function partialRow(
  overrides: Partial<OutboxRow> = {},
): OutboxRow {
  return {
    id: "outbox-partial",
    email_type: "partial_intake_recovery",
    to_email: "patient@example.com",
    to_name: "Patient",
    subject: "Your request is still saved",
    status: "sending",
    retry_count: 0,
    last_attempt_at: "2026-07-20T00:00:00.000Z",
    intake_id: null,
    patient_id: null,
    certificate_id: null,
    metadata: {
      recovery_tracking_id: TRACKING_ID,
      [FROZEN_PROVIDER_PAYLOAD_KEY]: frozenRecoveryPayload(),
    },
    ...overrides,
  }
}

async function sendInitial(
  to = "patient@example.com",
) {
  return sendEmail({
    to,
    subject: "Your request is still saved",
    template: {} as React.ReactElement,
    emailType: "partial_intake_recovery",
    unsubscribeEmail: to,
    idempotencyKey: `partial-intake-recovery:${TRACKING_ID}`,
    metadata: { recovery_tracking_id: TRACKING_ID },
    partialRecoverySnapshot: {
      evaluatedAt: "2026-07-19T08:00:00.000Z",
      expectedUpdatedAt: UPDATED_AT,
    },
  })
}

describe("partial-intake recovery provider gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.env.resendApiKey = "re_test_key"
    mocks.renderEmailToHtml.mockResolvedValue(
      `<a href="${RESUME_URL}">Finish your request</a>`,
    )
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValue(
      allowedRecoveryDecision(),
    )
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({ kind: "allowed" })
    mocks.markPartialIntakeRecoveryCommunicationOutcome.mockImplementation(
      async (_trackingId: string, outcome: unknown) => outcome,
    )
    mocks.markReviewRequestCommunicationOutcome.mockImplementation(
      async (_intakeId: string, outcome: unknown) => outcome,
    )
    mocks.recordDeliverySent.mockResolvedValue(undefined)
    mocks.getEmailBounceSuppressionDecision.mockResolvedValue({
      kind: "allowed",
    })
    mocks.getEmailSuppressionDecisions.mockResolvedValue(
      new Map([["patient@example.com", { kind: "allowed" }]]),
    )
    mocks.getMarketingEmailDecision.mockResolvedValue({ kind: "allowed" })
    mocks.createPendingOutbox.mockImplementation(async (entry: {
      metadata?: Record<string, unknown>
    }) => ({
      id: "outbox-partial",
      duplicate: false,
      providerPayloadEnc: entry.metadata?._provider_payload_enc,
    }))
    mocks.deferOutboxRow.mockResolvedValue(true)
    mocks.updateOutboxStatus.mockResolvedValue(true)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "msg-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))
  })

  it.each(["initial", "dispatcher"] as const)(
    "blocks a converted draft immediately before the %s provider call",
    async (mode) => {
      mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
        kind: "policy_suppressed",
        reason: "draft_converted",
      })

      const result = mode === "initial"
        ? await sendInitial()
        : await sendFromOutboxRow(partialRow())

      expect(mocks.fetch).not.toHaveBeenCalled()
      expect(
        mocks.markPartialIntakeRecoveryCommunicationOutcome,
      ).toHaveBeenCalledWith(
        TRACKING_ID,
        expect.objectContaining({
          kind: "policy_suppressed",
          reason: "draft_converted",
        }),
      )
      expect(result.outcome).toMatchObject({
        kind: "policy_suppressed",
        reason: "draft_converted",
      })
    },
  )

  it("defers the initial row when the authoritative policy read is transient", async () => {
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "draft_decrypt_failed",
    })

    const result = await sendInitial()

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-partial",
      expect.any(String),
      "draft_decrypt_failed",
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "draft_decrypt_failed",
    })
  })

  it("defers the same row when a suppression marker write is transient", async () => {
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
      kind: "policy_suppressed",
      reason: "address_suppressed",
    })
    mocks.markPartialIntakeRecoveryCommunicationOutcome.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "recovery_marker_write_failed",
    })

    const result = await sendInitial()

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-partial",
      expect.any(String),
      "recovery_marker_write_failed",
    )
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalledWith(
      "outbox-partial",
      "failed",
      expect.anything(),
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "recovery_marker_write_failed",
    })
  })

  it.each(["initial", "dispatcher"] as const)(
    "persists sent before the %s path stamps the recovery marker",
    async (mode) => {
      const result = mode === "initial"
        ? await sendInitial()
        : await sendFromOutboxRow(partialRow())

      expect(mocks.fetch).toHaveBeenCalledTimes(1)
      expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
        "outbox-partial",
        "sent",
        expect.objectContaining({ provider_message_id: "msg-1" }),
      )
      expect(
        mocks.updateOutboxStatus.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mocks.markPartialIntakeRecoveryCommunicationOutcome
          .mock.invocationCallOrder[0],
      )
      expect(result.outcome).toMatchObject({
        kind: "sent",
        messageId: "msg-1",
      })
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "preserves sent truth when the %s marker write fails",
    async (mode) => {
      mocks.markPartialIntakeRecoveryCommunicationOutcome.mockResolvedValueOnce({
        kind: "transiently_blocked",
        reason: "recovery_marker_write_failed",
      })

      const result = mode === "initial"
        ? await sendInitial()
        : await sendFromOutboxRow(partialRow())

      expect(mocks.fetch).toHaveBeenCalledTimes(1)
      expect(mocks.updateOutboxStatus).not.toHaveBeenCalledWith(
        "outbox-partial",
        "failed",
        expect.anything(),
      )
      expect(mocks.deferOutboxRow).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        success: true,
        outcome: { kind: "sent", messageId: "msg-1" },
        finalizationError: "recovery_marker_write_failed",
      })
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "does not stamp the %s marker when sent-state persistence fails",
    async (mode) => {
      mocks.updateOutboxStatus.mockResolvedValueOnce(false)

      const result = mode === "initial"
        ? await sendInitial()
        : await sendFromOutboxRow(partialRow())

      expect(mocks.fetch).toHaveBeenCalledTimes(1)
      expect(
        mocks.markPartialIntakeRecoveryCommunicationOutcome,
      ).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        success: true,
        outcome: { kind: "sent", messageId: "msg-1" },
        finalizationError: "outbox_sent_persistence_failed",
      })
    },
  )

  it("durably defers an initial row when the Resend key is missing", async () => {
    mocks.env.resendApiKey = undefined

    const result = await sendInitial()

    expect(mocks.createPendingOutbox).toHaveBeenCalled()
    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-partial",
      expect.any(String),
      "No Resend API key configured",
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_configuration_missing",
    })
  })

  it("rejects dispatcher rows without a tracking ID before provider contact", async () => {
    const row = partialRow({
      metadata: {
        [FROZEN_PROVIDER_PAYLOAD_KEY]: partialRow().metadata?.[
          FROZEN_PROVIDER_PAYLOAD_KEY
        ],
      },
    })

    const result = await sendFromOutboxRow(row)

    expect(mocks.evaluatePartialIntakeRecoveryPolicy).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "policy_suppressed",
      reason: "recovery_tracking_missing",
    })
  })

  it("terminally alerts on a legacy row with tracking but no encrypted payload", async () => {
    const result = await sendFromOutboxRow(partialRow({
      metadata: {
        recovery_tracking_id: TRACKING_ID,
      },
    }))

    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(
      mocks.markPartialIntakeRecoveryCommunicationOutcome,
    ).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
      "outbox-partial",
      "failed",
      expect.objectContaining({
        attempts: 10,
        error_message: expect.stringContaining(
          "secure reconstruction is unavailable",
        ),
      }),
    )
    expect(result.outcome).toBeUndefined()
  })

  it("keeps a corrupt frozen payload transient on dispatcher retry", async () => {
    const row = partialRow({
      metadata: {
        recovery_tracking_id: TRACKING_ID,
        [FROZEN_PROVIDER_PAYLOAD_KEY]: "not-valid-ciphertext",
      },
    })

    const result = await sendFromOutboxRow(row)

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-partial",
      expect.any(String),
      "Encrypted provider payload could not be read",
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_payload_read_failed",
    })
  })

  it("returns provider_failed only after Resend rejects a real attempt", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      message: "provider rejected request",
    }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(partialRow())

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(result.outcome).toMatchObject({
      kind: "provider_failed",
      error: "provider rejected request",
      retryable: false,
    })
  })

  it("uses only the partial policy gate before provider contact", async () => {
    await sendInitial()

    expect(mocks.evaluatePartialIntakeRecoveryPolicy).toHaveBeenCalledTimes(1)
    expect(mocks.getEmailBounceSuppressionDecision).not.toHaveBeenCalled()
    expect(mocks.getEmailSuppressionDecisions).not.toHaveBeenCalled()
    expect(mocks.getMarketingEmailDecision).not.toHaveBeenCalled()
  })

  it("blocks a reclaimed payload addressed to the draft's previous email", async () => {
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce(
      allowedRecoveryDecision({ email: "new@example.com" }),
    )
    mocks.createPendingOutbox.mockResolvedValueOnce({
      id: "outbox-partial",
      duplicate: false,
      providerPayloadEnc: frozenRecoveryPayload({
        email: "old@example.com",
      }),
    })

    const result = await sendInitial("new@example.com")

    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(
      mocks.markPartialIntakeRecoveryCommunicationOutcome,
    ).toHaveBeenCalledWith(
      TRACKING_ID,
      {
        kind: "policy_suppressed",
        reason: "recovery_payload_recipient_changed",
      },
    )
    expect(result.outcome).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_recipient_changed",
    })
  })

  it.each(["initial", "dispatcher"] as const)(
    "blocks a stale recovery route on the %s provider path",
    async (mode) => {
      const staleUrl =
        "https://instantmed.example/request?service=repeat-script&d=11111111-1111-4111-8111-111111111111"
      const stalePayload = frozenRecoveryPayload({ resumeUrl: staleUrl })
      if (mode === "initial") {
        mocks.createPendingOutbox.mockResolvedValueOnce({
          id: "outbox-partial",
          duplicate: false,
          providerPayloadEnc: stalePayload,
        })
      }

      const result = mode === "initial"
        ? await sendInitial()
        : await sendFromOutboxRow(partialRow({
            metadata: {
              recovery_tracking_id: TRACKING_ID,
              [FROZEN_PROVIDER_PAYLOAD_KEY]: stalePayload,
            },
          }))

      expect(mocks.fetch).not.toHaveBeenCalled()
      expect(
        mocks.markPartialIntakeRecoveryCommunicationOutcome,
      ).toHaveBeenCalledWith(
        TRACKING_ID,
        {
          kind: "policy_suppressed",
          reason: "recovery_payload_route_changed",
        },
      )
      expect(result.outcome).toEqual({
        kind: "policy_suppressed",
        reason: "recovery_payload_route_changed",
      })
    },
  )

  it("surfaces an opposite-marker conflict without retrying the provider", async () => {
    mocks.markPartialIntakeRecoveryCommunicationOutcome.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "recovery_marker_invariant_conflict",
    })

    const result = await sendInitial()

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.deferOutboxRow).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalledWith(
      "outbox-partial",
      "failed",
      expect.anything(),
    )
    expect(result).toMatchObject({
      success: true,
      outcome: { kind: "sent", messageId: "msg-1" },
      finalizationError: "recovery_marker_invariant_conflict",
    })
  })
})
