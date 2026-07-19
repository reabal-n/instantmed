import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  evaluateReviewRequestPolicy: vi.fn(),
  fetch: vi.fn(),
  getEmailBounceSuppressionDecision: vi.fn(),
  getEmailSuppressionDecisions: vi.fn(),
  getMarketingEmailDecision: vi.fn(),
  renderEmailToHtml: vi.fn(),
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: {
    appUrl: "https://instantmed.example",
    isDev: false,
    resendApiKey: "re_test_key",
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  evaluateReviewRequestPolicy: mocks.evaluateReviewRequestPolicy,
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
  htmlToPlainText: vi.fn(() => "Review request"),
  isEmailSuppressed: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: mocks.getEmailSuppressionDecisions,
}))

vi.mock("@/lib/email/preferences", () => ({
  canSendMarketingEmail: vi.fn(),
  getMarketingEmailDecision: mocks.getMarketingEmailDecision,
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn().mockResolvedValue({
    allowed: true,
    current: 0,
    limit: 200,
  }),
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn().mockResolvedValue(undefined),
}))

import { freezeResendProviderPayload } from "@/lib/email/send/provider-payload"
import { sendEmail } from "@/lib/email/send-email"

function sendReviewRequest() {
  return sendEmail({
    to: "patient@example.com",
    subject: "How did InstantMed go?",
    template: {} as React.ReactElement,
    emailType: "review_request",
    intakeId: "intake-1",
    patientId: "patient-1",
    idempotencyKey: "review-request:intake-1",
  })
}

describe("review request provider gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.renderEmailToHtml.mockResolvedValue("<p>Review request</p>")
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({ kind: "allowed" })
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
      id: "outbox-review",
      duplicate: false,
      providerPayloadEnc: entry.metadata?._provider_payload_enc,
    }))
    mocks.deferOutboxRow.mockResolvedValue(true)
    mocks.updateOutboxStatus.mockResolvedValue(true)
    mocks.fetch.mockResolvedValue(new Response(
      JSON.stringify({ id: "msg-1" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ))
  })

  it.each([
    {
      name: "on a transient policy read",
      decision: {
        kind: "transiently_blocked",
        reason: "policy_read_failed",
        retryAt: "2026-07-21T00:00:00.000Z",
      },
    },
    {
      name: "outside the Sydney send hour",
      decision: {
        kind: "transiently_blocked",
        reason: "outside_sydney_send_hour",
        retryAt: "2026-07-21T00:00:00.000Z",
      },
    },
    {
      name: "after terminal opt-out",
      decision: {
        kind: "policy_suppressed",
        reason: "marketing_opt_out",
      },
    },
  ])("never contacts the provider $name", async ({ decision }) => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce(decision)

    const result = await sendReviewRequest()

    expect(result.outcome).toMatchObject({ kind: decision.kind })
    expect(mocks.fetch).not.toHaveBeenCalled()
    if (decision.kind === "transiently_blocked") {
      expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
        "outbox-review",
        decision.retryAt,
        expect.stringContaining(decision.reason),
      )
    } else {
      expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
        "outbox-review",
        "failed",
        expect.objectContaining({
          attempts: expect.any(Number),
        }),
      )
    }
  })

  it("keeps suppression transient until the terminal outbox write is durable", async () => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce({
      kind: "policy_suppressed",
      reason: "marketing_opt_out",
    })
    mocks.updateOutboxStatus.mockResolvedValueOnce(false)

    const result = await sendReviewRequest()

    expect(result).toMatchObject({
      success: false,
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "outbox_terminal_persistence_failed",
      },
    })
    expect(result.suppressed).not.toBe(true)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("defers an unreadable frozen payload without terminalizing the row", async () => {
    mocks.createPendingOutbox.mockResolvedValueOnce({
      id: "outbox-review",
      duplicate: false,
      providerPayloadEnc: "not-valid-ciphertext",
    })

    const result = await sendReviewRequest()

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review",
      expect.any(String),
      "Encrypted provider payload could not be read",
    )
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_payload_read_failed",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("does not report delivery when provider success cannot be persisted", async () => {
    mocks.updateOutboxStatus.mockResolvedValueOnce(false)

    const result = await sendReviewRequest()

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      success: false,
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "outbox_sent_persistence_failed",
      },
    })
  })

  it("terminally suppresses a frozen payload for a stale recipient", async () => {
    mocks.createPendingOutbox.mockResolvedValueOnce({
      id: "outbox-review",
      duplicate: false,
      providerPayloadEnc: freezeResendProviderPayload({
        from: "InstantMed <support@instantmed.example>",
        to: ["stale@example.com"],
        subject: "How did InstantMed go?",
        html: "<p>Review request</p>",
        text: "Review request",
      }),
    })

    const result = await sendReviewRequest()

    expect(result).toMatchObject({
      success: false,
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "review_payload_recipient_changed",
      },
    })
    expect(mocks.evaluateReviewRequestPolicy).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("classifies provider failure only after provider contact", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      message: "provider rejected request",
    }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendReviewRequest()

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(result.outcome).toMatchObject({
      kind: "provider_failed",
      error: "provider rejected request",
      retryable: false,
    })
  })

  it("uses the consolidated review gate immediately before provider contact", async () => {
    await sendReviewRequest()

    expect(mocks.evaluateReviewRequestPolicy).toHaveBeenCalledTimes(1)
    expect(mocks.getEmailBounceSuppressionDecision).not.toHaveBeenCalled()
    expect(mocks.getEmailSuppressionDecisions).not.toHaveBeenCalled()
    expect(mocks.getMarketingEmailDecision).not.toHaveBeenCalled()
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})
