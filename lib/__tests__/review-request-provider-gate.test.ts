import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  evaluateReviewRequestPolicy: vi.fn(),
  fetch: vi.fn(),
  getEmailBounceSuppressionDecision: vi.fn(),
  getEmailSuppressionDecisions: vi.fn(),
  getMarketingEmailDecision: vi.fn(),
  markReviewRequestCommunicationOutcome: vi.fn(),
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
  markReviewRequestCommunicationOutcome:
    mocks.markReviewRequestCommunicationOutcome,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.createPendingOutbox,
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: vi.fn(),
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision: mocks.getEmailBounceSuppressionDecision,
  htmlToPlainText: vi.fn(() => "Review request"),
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
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn(),
}))

import { freezeResendProviderPayload } from "@/lib/email/send/provider-payload"
import { sendEmail } from "@/lib/email/send-email"

describe("review request provider gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.renderEmailToHtml.mockResolvedValue("<p>Review request</p>")
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({ kind: "allowed" })
    mocks.getEmailBounceSuppressionDecision.mockResolvedValue({ kind: "allowed" })
    mocks.getEmailSuppressionDecisions.mockResolvedValue(
      new Map([["patient@example.com", { kind: "allowed" }]]),
    )
    mocks.getMarketingEmailDecision.mockResolvedValue({ kind: "allowed" })
    mocks.markReviewRequestCommunicationOutcome.mockImplementation(
      async (_intakeId: string, outcome: unknown) => outcome,
    )
    mocks.createPendingOutbox.mockImplementation(async (entry: {
      metadata?: Record<string, unknown>
    }) => ({
      id: "outbox-review",
      duplicate: false,
      providerPayloadEnc: entry.metadata?._provider_payload_enc,
    }))
    mocks.deferOutboxRow.mockResolvedValue(true)
    mocks.updateOutboxStatus.mockResolvedValue(undefined)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "msg-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))
  })

  it.each([
    {
      name: "outside the Sydney window",
      decision: {
        kind: "transiently_blocked",
        reason: "outside_sydney_send_hour",
        retryAt: "2026-07-21T00:00:00.000Z",
      },
    },
    {
      name: "during cooldown",
      decision: {
        kind: "transiently_blocked",
        reason: "patient_cooldown",
        retryAt: "2026-07-21T00:00:00.000Z",
      },
    },
    {
      name: "for a suppressed address",
      decision: {
        kind: "policy_suppressed",
        reason: "address_suppressed",
      },
    },
    {
      name: "after 120 days",
      decision: {
        kind: "policy_suppressed",
        reason: "fulfilment_expired",
      },
    },
  ])("never contacts the provider $name", async ({ decision }) => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce(decision)

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(result.outcome).toMatchObject({ kind: decision.kind })
    if (decision.kind === "transiently_blocked") {
      expect(result.success).toBe(false)
      expect(result.retryable).toBe(true)
    }
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("keeps a failed deferral transient instead of calling it a provider failure", async () => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "policy_read_failed",
      retryAt: "2026-07-21T00:00:00.000Z",
    })
    mocks.deferOutboxRow.mockResolvedValueOnce(false)

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(result.success).toBe(false)
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "outbox_deferral_failed",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("keeps a suppressed row retryable until its terminal marker is durable", async () => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce({
      kind: "policy_suppressed",
      reason: "marketing_opt_out",
    })
    mocks.markReviewRequestCommunicationOutcome.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    })

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review",
      expect.any(String),
      "review_marker_write_failed",
    )
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalledWith(
      "outbox-review",
      "failed",
      expect.anything(),
    )
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("uses provider_failed only after a real provider attempt", async () => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({
      kind: "allowed",
    })
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      message: "provider rejected request",
    }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(result.outcome).toMatchObject({
      kind: "provider_failed",
      error: "provider rejected request",
      retryable: false,
    })
  })

  it("defers the same row when its frozen provider payload cannot be read", async () => {
    mocks.createPendingOutbox.mockResolvedValueOnce({
      id: "outbox-review",
      duplicate: false,
      providerPayloadEnc: "not-valid-ciphertext",
    })

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review",
      expect.any(String),
      "Encrypted provider payload could not be read",
    )
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalledWith(
      "outbox-review",
      "failed",
      expect.anything(),
    )
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_payload_read_failed",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("terminally suppresses a reclaimed row whose frozen body targets a stale recipient", async () => {
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
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce({ kind: "allowed" })

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(result).toMatchObject({
      success: false,
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "review_payload_recipient_changed",
      },
    })
    expect(mocks.markReviewRequestCommunicationOutcome).toHaveBeenCalledWith(
      "intake-1",
      {
        kind: "policy_suppressed",
        reason: "review_payload_recipient_changed",
      },
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("uses only the consolidated review policy gate before provider contact", async () => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({ kind: "allowed" })

    await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      patientId: "patient-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(mocks.evaluateReviewRequestPolicy).toHaveBeenCalledTimes(1)
    expect(mocks.getEmailBounceSuppressionDecision).not.toHaveBeenCalled()
    expect(mocks.getEmailSuppressionDecisions).not.toHaveBeenCalled()
    expect(mocks.getMarketingEmailDecision).not.toHaveBeenCalled()
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      name: "template render failure",
      arrange: () => {
        mocks.renderEmailToHtml.mockRejectedValueOnce(new Error("render failed"))
      },
    },
    {
      name: "outbox write failure",
      arrange: () => {
        mocks.createPendingOutbox.mockResolvedValueOnce({
          id: null,
          duplicate: false,
        })
      },
    },
  ])("keeps a $name transient without a provider attempt", async ({ arrange }) => {
    arrange()

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
    })

    expect(result.outcome).toMatchObject({ kind: "transiently_blocked" })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("keeps a provider-payload freeze failure transient", async () => {
    const circularAttachment: Record<string, unknown> = {}
    circularAttachment.self = circularAttachment

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
      idempotencyKey: "review-request:intake-1",
      attachments: [circularAttachment] as never,
    })

    expect(result.outcome).toMatchObject({ kind: "transiently_blocked" })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it.each([
    ["sent", "sent"],
    ["pending", "pending"],
    ["sending", "pending"],
    ["failed", "provider_failed"],
  ] as const)(
    "maps a duplicate %s outbox row to %s without contacting the provider",
    async (existingStatus, expectedKind) => {
      mocks.createPendingOutbox.mockResolvedValueOnce({
        id: "outbox-existing",
        duplicate: true,
        existingStatus,
      })

      const result = await sendEmail({
        to: "patient@example.com",
        subject: "How did InstantMed go?",
        template: {} as React.ReactElement,
        emailType: "review_request",
        intakeId: "intake-1",
        idempotencyKey: "review-request:intake-1",
      })

      expect(result.outcome).toMatchObject({ kind: expectedKind })
      expect(mocks.fetch).not.toHaveBeenCalled()
    },
  )
})
