import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  deferOutboxRow: vi.fn(),
  env: {
    appUrl: "https://instantmed.example",
    resendApiKey: "re_test_key" as string | undefined,
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
  evaluateReviewRequestPolicy: vi.fn(),
  fetch: vi.fn(),
  markReviewRequestCommunicationOutcome: vi.fn(),
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: mocks.env,
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  evaluateReviewRequestPolicy: mocks.evaluateReviewRequestPolicy,
  markReviewRequestCommunicationOutcome:
    mocks.markReviewRequestCommunicationOutcome,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: vi.fn(),
  persistFrozenProviderPayload: vi.fn(),
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision: vi.fn().mockResolvedValue({
    kind: "allowed",
  }),
  htmlToPlainText: vi.fn(() => "Review request"),
  isEmailSuppressed: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: vi.fn().mockResolvedValue(
    new Map([["patient@example.com", { kind: "allowed" }]]),
  ),
}))

vi.mock("@/lib/email/preferences", () => ({
  getMarketingEmailDecision: vi.fn().mockResolvedValue({ kind: "allowed" }),
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn(),
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn(),
}))

import {
  freezeResendProviderPayload,
  FROZEN_PROVIDER_PAYLOAD_KEY,
} from "@/lib/email/send/provider-payload"
import type { OutboxRow } from "@/lib/email/send/types"
import { sendFromOutboxRow } from "@/lib/email/send-email"

function reviewRow(): OutboxRow {
  return {
    id: "outbox-review",
    email_type: "review_request",
    to_email: "patient@example.com",
    to_name: "Patient",
    subject: "How did InstantMed go?",
    status: "sending",
    retry_count: 0,
    last_attempt_at: "2026-07-20T00:00:00.000Z",
    intake_id: "intake-1",
    patient_id: "patient-1",
    certificate_id: null,
    metadata: {
      [FROZEN_PROVIDER_PAYLOAD_KEY]: freezeResendProviderPayload({
        from: "InstantMed <support@instantmed.example>",
        to: ["patient@example.com"],
        subject: "How did InstantMed go?",
        html: "<p>Review request</p>",
        text: "Review request",
      }),
    },
  }
}

describe("review request dispatcher delivery truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.env.resendApiKey = "re_test_key"
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({ kind: "allowed" })
    mocks.markReviewRequestCommunicationOutcome.mockImplementation(
      async (_intakeId: string, outcome: unknown) => outcome,
    )
    mocks.updateOutboxStatus.mockResolvedValue(true)
    mocks.deferOutboxRow.mockResolvedValue(true)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "msg-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))
  })

  it("keeps confirmed delivery sent and never schedules another provider call when marker CAS fails", async () => {
    mocks.markReviewRequestCommunicationOutcome.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    })

    const result = await sendFromOutboxRow(reviewRow())

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
      "outbox-review",
      "sent",
      {
        provider_message_id: "msg-1",
        attempts: 1,
      },
    )
    expect(mocks.deferOutboxRow).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      success: true,
      outcome: { kind: "sent", messageId: "msg-1" },
      finalizationError: "review_marker_write_failed",
    })
  })

  it("reports provider_failed only after the dispatcher contacts Resend", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      message: "provider rejected request",
    }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(reviewRow())

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(result.outcome).toMatchObject({
      kind: "provider_failed",
      error: "provider rejected request",
      retryable: false,
    })
  })

  it("keeps a thrown marker exception after provider success out of the provider-failure path", async () => {
    mocks.markReviewRequestCommunicationOutcome.mockRejectedValueOnce(
      new Error("marker database unavailable"),
    )

    const result = await sendFromOutboxRow(reviewRow())

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
      "outbox-review",
      "sent",
      expect.anything(),
    )
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalledWith(
      "outbox-review",
      "failed",
      expect.anything(),
    )
    expect(mocks.deferOutboxRow).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      success: true,
      outcome: { kind: "sent", messageId: "msg-1" },
      finalizationError: "review_marker_write_failed",
    })
  })

  it("does not stamp the intake marker when durable sent persistence fails", async () => {
    mocks.updateOutboxStatus.mockResolvedValueOnce(false)

    const result = await sendFromOutboxRow(reviewRow())

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.markReviewRequestCommunicationOutcome).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      success: true,
      outcome: { kind: "sent", messageId: "msg-1" },
      finalizationError: "outbox_sent_persistence_failed",
    })
  })

  it("defers a review row when the dispatcher has no Resend API key", async () => {
    mocks.env.resendApiKey = undefined

    const result = await sendFromOutboxRow(reviewRow())

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review",
      expect.any(String),
      "No API key configured",
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_configuration_missing",
    })
  })
})
