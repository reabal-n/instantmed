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
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: mocks.env,
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  evaluateReviewRequestPolicy: mocks.evaluateReviewRequestPolicy,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: vi.fn(),
  persistFrozenProviderPayload: vi.fn(),
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision: vi.fn(),
  htmlToPlainText: vi.fn(() => "Review request"),
  isEmailSuppressed: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: vi.fn(),
}))

vi.mock("@/lib/email/preferences", () => ({
  canSendMarketingEmail: vi.fn(),
  getMarketingEmailDecision: vi.fn(),
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn(),
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn().mockResolvedValue(undefined),
}))

import {
  freezeResendProviderPayload,
  FROZEN_PROVIDER_PAYLOAD_KEY,
} from "@/lib/email/send/provider-payload"
import type { OutboxRow } from "@/lib/email/send/types"
import { sendFromOutboxRow } from "@/lib/email/send-email"

function reviewRow(recipient = "patient@example.com"): OutboxRow {
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
        to: [recipient],
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
    mocks.updateOutboxStatus.mockResolvedValue(true)
    mocks.deferOutboxRow.mockResolvedValue(true)
    mocks.fetch.mockResolvedValue(new Response(
      JSON.stringify({ id: "msg-1" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ))
  })

  it("does not report sent when durable sent persistence fails", async () => {
    mocks.updateOutboxStatus.mockResolvedValueOnce(false)

    const result = await sendFromOutboxRow(reviewRow())

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

  it("replays the frozen payload before terminally rejecting a stale recipient", async () => {
    const result = await sendFromOutboxRow(reviewRow("stale@example.com"))

    expect(mocks.evaluateReviewRequestPolicy).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
      "outbox-review",
      "failed",
      expect.objectContaining({
        error_message:
          "Suppressed before delivery: review_payload_recipient_changed",
      }),
    )
    expect(result).toMatchObject({
      success: false,
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "review_payload_recipient_changed",
      },
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("defers an unreadable frozen payload without burning retry budget", async () => {
    const row = reviewRow()
    row.metadata = {
      [FROZEN_PROVIDER_PAYLOAD_KEY]: "not-valid-ciphertext",
    }

    const result = await sendFromOutboxRow(row)

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

  it("defers the claimed row when provider configuration is unavailable", async () => {
    mocks.env.resendApiKey = undefined

    const result = await sendFromOutboxRow(reviewRow())

    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review",
      expect.any(String),
      "No API key configured",
    )
    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_configuration_missing",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
})
