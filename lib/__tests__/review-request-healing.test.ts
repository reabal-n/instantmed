import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  finalizeOutboxSequenceDisposition: vi.fn(),
  isEmailSendDeliveryConfirmed: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/email/outbox-delivery", () => ({
  isEmailSendDeliveryConfirmed: mocks.isEmailSendDeliveryConfirmed,
}))

vi.mock("@/lib/email/outbox-disposition", () => ({
  finalizeOutboxSequenceDisposition:
    mocks.finalizeOutboxSequenceDisposition,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

import { sendReviewRequestEmail } from "@/lib/email/review-request"

const candidate = {
  id: "intake-1",
  patient_id: "patient-1",
  category: "medical_certificate",
  status: "completed",
  payment_status: "paid",
  document_sent_at: "2026-07-17T00:00:00.000Z",
  script_sent_at: null,
  review_email_sent_at: null,
  review_email_suppressed_at: null,
  patient: {
    email: "patient@example.com",
    first_name: "Patient",
    email_bounced: false,
  },
}

describe("review request marker healing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(false)
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValue({
      finalized: true,
    })
  })

  it("preserves durable sent truth when marker finalization needs reconciliation", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: true,
      messageId: "msg-1",
      outboxId: "outbox-1",
      outcome: {
        kind: "sent",
        messageId: "msg-1",
        outboxId: "outbox-1",
      },
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValueOnce(true)
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValueOnce({
      finalized: false,
      reason: "marker_write_failed",
    })

    await expect(sendReviewRequestEmail(candidate)).resolves.toEqual({
      kind: "sent",
      messageId: "msg-1",
      outboxId: "outbox-1",
    })
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "outbox-1",
        intake_id: "intake-1",
        email_type: "review_request",
      }),
      "sent",
    )
  })

  it("uses the shared finalizer for terminal policy suppression", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      outboxId: "outbox-1",
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "marketing_opt_out",
      },
    })

    await expect(sendReviewRequestEmail(candidate)).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "marketing_opt_out",
    })
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "outbox-1",
        intake_id: "intake-1",
      }),
      "suppressed",
    )
  })

  it("never finalizes a marker for a transient block", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      outboxId: "outbox-1",
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "policy_read_failed",
      },
    })

    await expect(sendReviewRequestEmail(candidate)).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "policy_read_failed",
    })
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })

  it("does not overwrite whichever terminal marker already won the race", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      outboxId: "outbox-1",
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "review_request_already_handled",
      },
    })

    await expect(sendReviewRequestEmail(candidate)).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "review_request_already_handled",
    })
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })

  it("binds a raw click key to the frozen email while persisting only its hash", async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "provider_configuration_missing",
      },
    })

    await sendReviewRequestEmail(candidate)

    const input = mocks.sendEmail.mock.calls[0]?.[0] as {
      metadata: Record<string, unknown>
      tags: Array<{ name: string; value: string }>
      template: { props: { reviewClickKey?: string } }
    }
    const rawKey = input.template.props.reviewClickKey

    expect(rawKey).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(input.metadata.review_click_key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(input.metadata.review_click_key_hash).not.toBe(rawKey)
    expect(JSON.stringify(input.metadata)).not.toContain(String(rawKey))
    expect(input.tags).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "intake_id" }),
    ]))
  })
})
