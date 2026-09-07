import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  candidateRpc: vi.fn(),
  reconcileSentReviewRequestMarkers: vi.fn(),
  checkDailySendLimit: vi.fn(),
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  evaluateReviewRequestPolicy: vi.fn(),
  fetch: vi.fn(),
  finalizeOutboxSequenceDisposition: vi.fn(),
  getEmailBounceSuppressionDecision: vi.fn(),
  getEmailSuppressionDecisions: vi.fn(),
  getMarketingEmailDecision: vi.fn(),
  logToOutbox: vi.fn(),
  renderEmailToHtml: vi.fn(),
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: () => "https://instantmed.example",
  env: {
    appUrl: "https://instantmed.example",
    isDev: false,
    resendApiKey: "re_test_key",
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ rpc: mocks.candidateRpc }),
}))

vi.mock("@/lib/email/review-request-reconciliation", () => ({
  reconcileSentReviewRequestMarkers: mocks.reconcileSentReviewRequestMarkers,
}))

vi.mock("@/lib/email/outbox-delivery", () => ({
  isEmailSendDeliveryConfirmed: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  evaluateReviewRequestPolicy: mocks.evaluateReviewRequestPolicy,
}))

vi.mock("@/lib/email/outbox-disposition", () => ({
  finalizeOutboxSequenceDisposition:
    mocks.finalizeOutboxSequenceDisposition,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.createPendingOutbox,
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: mocks.logToOutbox,
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
  checkDailySendLimit: mocks.checkDailySendLimit,
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn().mockResolvedValue(undefined),
}))

import { processReviewRequests } from "@/lib/email/review-request"
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

function sendKeyedReviewRequest(to = "patient@example.com") {
  return sendEmail({
    to,
    subject: "How did InstantMed go?",
    template: {} as React.ReactElement,
    emailType: "review_request",
    intakeId: "intake-1",
    patientId: "patient-1",
    idempotencyKey: "review-request:intake-1",
    metadata: {
      review_click_key_hash: "a".repeat(64),
    },
  })
}

describe("review request provider gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.reconcileSentReviewRequestMarkers.mockResolvedValue({ reconciled: 0, failed: 0 })
    mocks.candidateRpc.mockResolvedValue({
      data: [{
        id: "intake-1",
        patient_id: "patient-1",
        category: "medical_certificate",
        status: "completed",
        payment_status: "paid",
        document_sent_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        patient_email: "patient@example.com",
        patient_first_name: "Patient",
        patient_email_bounced: false,
      }],
      error: null,
    })
    mocks.renderEmailToHtml.mockResolvedValue("<p>Review request</p>")
    mocks.checkDailySendLimit.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 200,
    })
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({ kind: "allowed" })
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValue({
      finalized: true,
    })
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
    { reason: "patient_cooldown", persisted: true, expected: 1 },
    { reason: "patient_cooldown", persisted: false, expected: 0 },
    { reason: "policy_read_failed", persisted: true, expected: 0 },
    { reason: "unknown_policy_failure", persisted: true, expected: 0 },
    { reason: "outside_sydney_send_hour", persisted: true, expected: 0 },
  ])("classifies $reason with persisted=$persisted without sending", async ({ reason, persisted, expected }) => {
    const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce({
      kind: "transiently_blocked", reason, retryAt,
    })
    mocks.deferOutboxRow.mockResolvedValueOnce(persisted)

    const result = await processReviewRequests()

    expect(result).toMatchObject({
      requestTransientlyBlocked: 1,
      requestExpectedDeferrals: expected,
      requestSent: 0,
      requestProviderFailed: 0,
    })
    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review", retryAt, expect.stringContaining(reason),
    )
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("keeps a keyed review candidate-owned when template rendering fails before payload freeze", async () => {
    mocks.renderEmailToHtml.mockRejectedValueOnce(new Error("render unavailable"))

    const result = await sendKeyedReviewRequest()

    expect(result).toMatchObject({
      success: false,
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "template_render_failed",
      },
    })
    expect(mocks.logToOutbox).not.toHaveBeenCalled()
    expect(mocks.createPendingOutbox).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("keeps a keyed review candidate-owned when the warmup cap blocks before payload freeze", async () => {
    mocks.checkDailySendLimit.mockResolvedValueOnce({
      allowed: false,
      current: 200,
      limit: 200,
    })

    const result = await sendKeyedReviewRequest()

    expect(result).toMatchObject({
      success: false,
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "marketing_warmup_limited",
      },
    })
    expect(mocks.logToOutbox).not.toHaveBeenCalled()
    expect(mocks.createPendingOutbox).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("keeps a keyed review candidate-owned until invalid-recipient suppression is durable", async () => {
    const result = await sendKeyedReviewRequest("not-an-email")

    expect(result).toMatchObject({
      success: false,
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "invalid_recipient",
      },
    })
    expect(mocks.logToOutbox).not.toHaveBeenCalled()
    expect(mocks.createPendingOutbox).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
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
      expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "outbox-review",
          intake_id: "intake-1",
          email_type: "review_request",
        }),
        "suppressed",
      )
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

  it("keeps suppression retryable until the source marker is durable", async () => {
    mocks.evaluateReviewRequestPolicy.mockResolvedValueOnce({
      kind: "policy_suppressed",
      reason: "marketing_opt_out",
    })
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValueOnce({
      finalized: false,
      reason: "marker_write_failed",
    })

    const result = await sendReviewRequest()

    expect(result).toMatchObject({
      success: false,
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "suppressed_marker_write_failed",
      },
    })
    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-review",
      expect.any(String),
      "Review suppression marker could not be persisted",
    )
    expect(mocks.updateOutboxStatus).not.toHaveBeenCalled()
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

  it("reports an exact provider-terminal duplicate instead of false pending success", async () => {
    mocks.createPendingOutbox.mockResolvedValueOnce({
      id: "outbox-review",
      duplicate: true,
      providerTerminal: true,
    })

    const result = await sendReviewRequest()

    expect(result).toMatchObject({
      success: false,
      retryable: false,
      outcome: {
        kind: "provider_failed",
        retryable: false,
        outboxId: "outbox-review",
      },
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
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
