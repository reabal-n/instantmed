import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  evaluatePartialIntakeRecoveryPolicy: vi.fn(),
  fetch: vi.fn(),
  finalizeOutboxSequenceDisposition: vi.fn(),
  persistPartialRecoveryTrackingId: vi.fn(),
  renderEmailToHtml: vi.fn(),
  resolvePartialIntakeRecoveryTrackingId: vi.fn(),
  updateOutboxStatus: vi.fn(),
  validatePartialIntakeRecoveryProviderPayload: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: {
    appUrl: "https://instantmed.example",
    isDev: false,
    resendApiKey: "re_test_key",
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
}))

vi.mock("@/lib/email/partial-intake-recovery-policy", () => ({
  evaluatePartialIntakeRecoveryPolicy:
    mocks.evaluatePartialIntakeRecoveryPolicy,
  resolvePartialIntakeRecoveryTrackingId:
    mocks.resolvePartialIntakeRecoveryTrackingId,
  validatePartialIntakeRecoveryProviderPayload:
    mocks.validatePartialIntakeRecoveryProviderPayload,
}))

vi.mock("@/lib/email/outbox-disposition", () => ({
  finalizeOutboxSequenceDisposition:
    mocks.finalizeOutboxSequenceDisposition,
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.createPendingOutbox,
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: vi.fn(),
  persistFrozenProviderPayload: vi.fn(),
  persistPartialRecoveryTrackingId:
    mocks.persistPartialRecoveryTrackingId,
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision: vi.fn(),
  htmlToPlainText: vi.fn(() => `Continue (${RESUME_URL})`),
  isEmailSuppressed: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: vi.fn(),
  getSuppressedEmails: vi.fn().mockResolvedValue(new Set()),
}))

vi.mock("@/lib/email/preferences", () => ({
  canSendMarketingEmail: vi.fn(),
  getMarketingEmailDecision: vi.fn(),
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
  recordDeliverySent: vi.fn().mockResolvedValue(undefined),
}))

import {
  freezeResendProviderPayload,
  FROZEN_PROVIDER_PAYLOAD_KEY,
} from "@/lib/email/send/provider-payload"
import type { OutboxRow } from "@/lib/email/send/types"
import { sendEmail, sendFromOutboxRow } from "@/lib/email/send-email"

const TRACKING_ID = "a6bd50f7-ad78-4fba-9822-a89580b58bf7"
const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const EMAIL = "alex.taylor@patientmail.com.au"
const UPDATED_AT = "2026-07-19T07:00:00.000Z"
const RESUME_URL =
  `https://instantmed.example/request?service=med-cert&d=${SESSION_ID}` +
  "&utm_source=recovery_email&utm_medium=email" +
  "&utm_campaign=partial_intake_recovery&utm_content=med-cert"

function providerPayload() {
  return {
    from: "InstantMed <support@instantmed.example>",
    to: [EMAIL],
    subject: "Your request is still saved",
    html: `<a href="${RESUME_URL.replaceAll("&", "&amp;")}">Continue</a>`,
    text: `Continue (${RESUME_URL})`,
  }
}

function allowedPolicyDecision() {
  return {
    kind: "allowed" as const,
    draft: {
      recoveryTrackingId: TRACKING_ID,
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      email: EMAIL,
      firstName: "Alex",
      updatedAt: UPDATED_AT,
      expiresAt: "2026-07-26T08:00:00.000Z",
      resumeUrl: RESUME_URL,
    },
  }
}

function partialRecoveryRow(
  metadata: Record<string, unknown> = {
    recovery_tracking_id: TRACKING_ID,
  },
): OutboxRow {
  return {
    id: "outbox-recovery",
    email_type: "partial_intake_recovery",
    to_email: EMAIL,
    to_name: "Alex",
    subject: "Your request is still saved",
    status: "sending",
    retry_count: 0,
    last_attempt_at: "2026-07-19T08:00:00.000Z",
    intake_id: null,
    patient_id: null,
    certificate_id: null,
    metadata: {
      ...metadata,
      [FROZEN_PROVIDER_PAYLOAD_KEY]:
        freezeResendProviderPayload(providerPayload()),
    },
  }
}

async function deliver(mode: "initial" | "dispatcher") {
  if (mode === "dispatcher") {
    return sendFromOutboxRow(partialRecoveryRow())
  }

  return sendEmail({
    to: EMAIL,
    toName: "Alex",
    subject: "Your request is still saved",
    template: {} as React.ReactElement,
    emailType: "partial_intake_recovery",
    unsubscribeEmail: EMAIL,
    idempotencyKey: `partial-intake-recovery:${TRACKING_ID}`,
    metadata: { recovery_tracking_id: TRACKING_ID },
    partialRecoveryExpectedUpdatedAt: UPDATED_AT,
  })
}

describe("partial-intake recovery provider gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.renderEmailToHtml.mockResolvedValue(providerPayload().html)
    mocks.createPendingOutbox.mockImplementation(async (entry: {
      metadata?: Record<string, unknown>
    }) => ({
      id: "outbox-recovery",
      duplicate: false,
      providerPayloadEnc: entry.metadata?._provider_payload_enc,
    }))
    mocks.deferOutboxRow.mockResolvedValue(true)
    mocks.persistPartialRecoveryTrackingId.mockResolvedValue(true)
    mocks.resolvePartialIntakeRecoveryTrackingId.mockResolvedValue({
      kind: "resolved",
      recoveryTrackingId: TRACKING_ID,
      legacyMapped: false,
    })
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValue(
      allowedPolicyDecision(),
    )
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValue({
      finalized: true,
    })
    mocks.validatePartialIntakeRecoveryProviderPayload.mockReturnValue({
      kind: "allowed",
    })
    mocks.updateOutboxStatus.mockResolvedValue(true)
    mocks.fetch.mockResolvedValue(new Response(
      JSON.stringify({ id: "message-1" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ))
  })

  it.each(["initial", "dispatcher"] as const)(
    "rechecks authoritative state and the frozen payload immediately before the %s provider call",
    async (mode) => {
      await expect(deliver(mode)).resolves.toMatchObject({ success: true })

      expect(mocks.evaluatePartialIntakeRecoveryPolicy).toHaveBeenCalledWith({
        recoveryTrackingId: TRACKING_ID,
        expectedRecipient: EMAIL,
        expectedUpdatedAt: mode === "initial" ? UPDATED_AT : undefined,
        mode,
      })
      expect(
        mocks.validatePartialIntakeRecoveryProviderPayload,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [EMAIL],
          html: expect.stringContaining(RESUME_URL.replaceAll("&", "&amp;")),
          text: expect.stringContaining(RESUME_URL),
        }),
        expect.objectContaining({
          email: EMAIL,
          resumeUrl: RESUME_URL,
        }),
      )
      expect(
        mocks.evaluatePartialIntakeRecoveryPolicy.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mocks.validatePartialIntakeRecoveryProviderPayload
          .mock.invocationCallOrder[0],
      )
      expect(
        mocks.validatePartialIntakeRecoveryProviderPayload
          .mock.invocationCallOrder[0],
      ).toBeLessThan(mocks.fetch.mock.invocationCallOrder[0])
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "defers a transient %s decision without provider contact or retry-budget burn",
    async (mode) => {
      mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
        kind: "transiently_blocked",
        reason: "draft_snapshot_changed",
        retryAt: "2026-07-19T08:05:00.000Z",
      })

      const result = await deliver(mode)

      expect(result).toMatchObject({
        success: false,
        retryable: true,
        outcome: {
          kind: "transiently_blocked",
          reason: "draft_snapshot_changed",
        },
      })
      expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
        "outbox-recovery",
        "2026-07-19T08:05:00.000Z",
        expect.stringContaining("draft_snapshot_changed"),
      )
      expect(mocks.updateOutboxStatus).not.toHaveBeenCalled()
      expect(mocks.fetch).not.toHaveBeenCalled()
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "terminally suppresses a synthetic %s draft before provider contact",
    async (mode) => {
      mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
        kind: "policy_suppressed",
        reason: "test_identity",
      })

      const result = await deliver(mode)

      expect(result).toMatchObject({
        success: false,
        retryable: false,
        suppressed: true,
        outcome: {
          kind: "policy_suppressed",
          reason: "test_identity",
        },
      })
      expect(mocks.updateOutboxStatus).toHaveBeenCalledWith(
        "outbox-recovery",
        "failed",
        expect.objectContaining({ attempts: expect.any(Number) }),
      )
      expect(
        mocks.finalizeOutboxSequenceDisposition.mock.invocationCallOrder[0],
      ).toBeLessThan(mocks.updateOutboxStatus.mock.invocationCallOrder[0])
      expect(mocks.fetch).not.toHaveBeenCalled()
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "terminally suppresses an invalid frozen %s payload before provider contact",
    async (mode) => {
      mocks.validatePartialIntakeRecoveryProviderPayload.mockReturnValueOnce({
        kind: "policy_suppressed",
        reason: "recovery_payload_route_changed",
      })

      const result = await deliver(mode)

      expect(result).toMatchObject({
        suppressed: true,
        outcome: {
          kind: "policy_suppressed",
          reason: "recovery_payload_route_changed",
        },
      })
      expect(mocks.fetch).not.toHaveBeenCalled()
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "defers %s suppression without retry burn when the source marker is not durable",
    async (mode) => {
      mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
        kind: "policy_suppressed",
        reason: "test_identity",
      })
      mocks.finalizeOutboxSequenceDisposition.mockResolvedValueOnce({
        finalized: false,
        reason: "marker_write_failed",
      })

      const result = await deliver(mode)

      expect(result).toMatchObject({
        success: false,
        retryable: true,
        outcome: {
          kind: "transiently_blocked",
          reason: "recovery_suppression_marker_write_failed",
        },
      })
      expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
        "outbox-recovery",
        expect.any(String),
        expect.stringContaining("recovery_suppression_marker_write_failed"),
      )
      expect(mocks.updateOutboxStatus).not.toHaveBeenCalled()
      expect(mocks.fetch).not.toHaveBeenCalled()
    },
  )

  it.each(["initial", "dispatcher"] as const)(
    "does not finalize %s provider success when durable sent persistence fails",
    async (mode) => {
      mocks.updateOutboxStatus.mockResolvedValueOnce(false)

      const result = await deliver(mode)

      expect(mocks.fetch).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({
        success: false,
        retryable: true,
        outcome: {
          kind: "transiently_blocked",
          reason: "outbox_sent_persistence_failed",
        },
      })
    },
  )

  it("maps and scrubs an inherited frozen row before dispatcher delivery", async () => {
    const row = partialRecoveryRow({
      draft_idempotency_hash: "legacy-digest",
      service_type: "med-cert",
    })
    delete row.metadata?.recovery_tracking_id
    mocks.resolvePartialIntakeRecoveryTrackingId.mockResolvedValueOnce({
      kind: "resolved",
      recoveryTrackingId: TRACKING_ID,
      legacyMapped: true,
    })
    mocks.persistPartialRecoveryTrackingId.mockImplementationOnce(
      async (_outboxId, metadata: Record<string, unknown>) => {
        delete metadata.draft_idempotency_hash
        delete metadata.service_type
        metadata.recovery_tracking_id = TRACKING_ID
        return true
      },
    )

    await expect(sendFromOutboxRow(row)).resolves.toMatchObject({
      success: true,
    })

    expect(mocks.persistPartialRecoveryTrackingId).toHaveBeenCalledWith(
      "outbox-recovery",
      expect.any(Object),
      TRACKING_ID,
    )
    expect(
      mocks.persistPartialRecoveryTrackingId.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.evaluatePartialIntakeRecoveryPolicy.mock.invocationCallOrder[0],
    )
    expect(row.metadata).toMatchObject({
      recovery_tracking_id: TRACKING_ID,
    })
    expect(row.metadata).not.toHaveProperty("draft_idempotency_hash")
    expect(row.metadata).not.toHaveProperty("service_type")
  })
})
