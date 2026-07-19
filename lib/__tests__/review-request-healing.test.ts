import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  evaluateReviewRequestPolicy: vi.fn(),
  isEmailSendDeliveryConfirmed: vi.fn(),
  markReviewRequestCommunicationOutcome: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: () => "https://instantmed.example",
}))

vi.mock("@/lib/email/outbox-delivery", () => ({
  isEmailSendDeliveryConfirmed: mocks.isEmailSendDeliveryConfirmed,
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  evaluateReviewRequestPolicy: mocks.evaluateReviewRequestPolicy,
  markReviewRequestCommunicationOutcome:
    mocks.markReviewRequestCommunicationOutcome,
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
    email_bounced: false,
    first_name: "Patient",
  },
}

describe("review request sent-marker healing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.evaluateReviewRequestPolicy.mockResolvedValue({
      kind: "transiently_blocked",
      reason: "patient_cooldown",
    })
    mocks.sendEmail.mockResolvedValue({
      success: true,
      outboxId: "outbox-sent",
      outcome: { kind: "sent", outboxId: "outbox-sent" },
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(true)
    mocks.markReviewRequestCommunicationOutcome.mockImplementation(
      async (_intakeId: string, outcome: unknown) => outcome,
    )
  })

  it("lets a duplicate durable sent row heal without a pre-send cooldown block", async () => {
    const outcome = await sendReviewRequestEmail(candidate)

    expect(mocks.evaluateReviewRequestPolicy).not.toHaveBeenCalled()
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.markReviewRequestCommunicationOutcome).toHaveBeenCalledWith(
      "intake-1",
      expect.objectContaining({ kind: "sent", outboxId: "outbox-sent" }),
    )
    expect(outcome).toMatchObject({ kind: "sent", outboxId: "outbox-sent" })
  })

  it("preserves sent truth when the intake marker write needs reconciliation", async () => {
    mocks.markReviewRequestCommunicationOutcome.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    })

    await expect(sendReviewRequestEmail(candidate)).resolves.toMatchObject({
      kind: "sent",
      outboxId: "outbox-sent",
    })
  })

  it("does not repeat a suppression marker already finalized by the send gate", async () => {
    mocks.sendEmail.mockResolvedValueOnce({
      success: false,
      suppressed: true,
      outcome: {
        kind: "policy_suppressed",
        reason: "marketing_opt_out",
      },
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValueOnce(false)

    await expect(sendReviewRequestEmail(candidate)).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "marketing_opt_out",
    })
    expect(mocks.markReviewRequestCommunicationOutcome).not.toHaveBeenCalled()
  })
})
