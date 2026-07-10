import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  finalizeCertificateResend: vi.fn(),
  isEmailSuppressed: vi.fn(),
  persistFrozenProviderPayload: vi.fn(),
  reconcileCertificateEmailDelivery: vi.fn(),
  reconstructEmailContent: vi.fn(),
  createServiceRoleClient: vi.fn(),
  certificateStoragePaths: [] as string[],
  updateEmailStatus: vi.fn(),
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: {
    appUrl: "https://instantmed.example",
    resendApiKey: "re_test_key",
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
}))

vi.mock("@/lib/email/utils", () => ({
  htmlToPlainText: vi.fn(() => "Certificate email"),
  isEmailSuppressed: mocks.isEmailSuppressed,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: vi.fn(),
  logToOutbox: vi.fn(),
  persistFrozenProviderPayload: mocks.persistFrozenProviderPayload,
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/send/reconstruct", () => ({
  reconstructEmailContent: mocks.reconstructEmailContent,
}))

vi.mock("@/lib/data/issued-certificates", () => ({
  finalizeCertificateResend: mocks.finalizeCertificateResend,
  updateEmailStatus: mocks.updateEmailStatus,
}))

vi.mock("@/lib/medical-certificates/email-delivery-reconciliation", () => ({
  reconcileCertificateEmailDelivery: mocks.reconcileCertificateEmailDelivery,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: vi.fn(),
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn(),
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn(),
}))

import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import {
  freezeResendProviderPayload,
  FROZEN_PROVIDER_PAYLOAD_KEY,
  readFrozenResendProviderPayload,
} from "@/lib/email/send/provider-payload"
import type { OutboxRow } from "@/lib/email/send/types"
import { sendFromOutboxRow } from "@/lib/email/send-email"

function makeResendOutboxRow(overrides: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: "outbox-1",
    email_type: "med_cert_patient",
    to_email: "patient@example.test",
    to_name: "Test Patient",
    subject: "Your medical certificate",
    status: "sending",
    retry_count: 0,
    last_attempt_at: "2026-07-10T00:00:00.000Z",
    intake_id: "11111111-1111-4111-8111-111111111111",
    patient_id: "22222222-2222-4222-8222-222222222222",
    certificate_id: "33333333-3333-4333-8333-333333333333",
    metadata: { resend_attempt_id: "44444444-4444-4444-8444-444444444444" },
    ...overrides,
  }
}

describe("certificate resend dispatcher finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.isEmailSuppressed.mockResolvedValue(false)
    mocks.persistFrozenProviderPayload.mockResolvedValue(true)
    mocks.reconstructEmailContent.mockResolvedValue({
      success: true,
      html: "<p>Certificate email</p>",
    })
    mocks.updateOutboxStatus.mockResolvedValue(undefined)
    mocks.finalizeCertificateResend.mockResolvedValue({
      success: true,
      isDuplicate: false,
    })
    mocks.reconcileCertificateEmailDelivery.mockResolvedValue({
      success: true,
      failedSteps: [],
    })
    mocks.certificateStoragePaths = [
      "certificates/current.pdf",
      "certificates/current.pdf",
    ]
    let certificateQuery = 0
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => {
        const queryIndex = certificateQuery++
        const chain: Record<string, unknown> = {}
        for (const method of ["select", "eq", "order", "limit"]) {
          chain[method] = vi.fn(() => chain)
        }
        chain.maybeSingle = vi.fn(async () => queryIndex % 2 === 0
          ? {
              data: {
                id: "33333333-3333-4333-8333-333333333333",
                intake_id: "11111111-1111-4111-8111-111111111111",
                status: "valid",
                storage_path: mocks.certificateStoragePaths[Math.floor(queryIndex / 2)] ??
                  mocks.certificateStoragePaths.at(-1),
              },
              error: null,
            }
          : {
              data: { id: "33333333-3333-4333-8333-333333333333" },
              error: null,
            })
        return chain
      }),
    })
  })

  it("finalizes the reservation when a queued resend later succeeds", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "provider-message-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({ retry_count: 3 }))

    expect(result).toEqual({ success: true })
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "sent", {
      provider_message_id: "provider-message-1",
      attempts: 4,
    })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith({
      attemptId: "44444444-4444-4444-8444-444444444444",
      deliverySucceeded: true,
      emailOutboxId: "outbox-1",
      providerMessageId: "provider-message-1",
      failureReason: undefined,
    })
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "instantmed-email/outbox-1",
        }),
      }),
    )

    const persistedCiphertext = mocks.persistFrozenProviderPayload.mock.calls[0]?.[2]
    expect(mocks.persistFrozenProviderPayload.mock.calls[0]?.[1]).toMatchObject({
      resend_attempt_id: "44444444-4444-4444-8444-444444444444",
      certificate_storage_version: getEmployerCertificateStorageVersion(
        "certificates/current.pdf",
      ),
    })
    expect(readFrozenResendProviderPayload({
      [FROZEN_PROVIDER_PAYLOAD_KEY]: persistedCiphertext,
    })).toEqual(JSON.parse(mocks.fetch.mock.calls[0][1].body))
    expect(mocks.persistFrozenProviderPayload.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fetch.mock.invocationCallOrder[0],
    )
  })

  it("replays the exact frozen request instead of regenerating dynamic content", async () => {
    const providerPayload = {
      from: "InstantMed <support@instantmed.example>",
      to: ["patient@example.test"],
      subject: "Your medical certificate",
      html: "<p>Original one-time link</p>",
      text: "Original one-time link",
      reply_to: "support@instantmed.example",
      tags: [
        { name: "email_type", value: "med_cert_patient" },
        { name: "category", value: "med_cert_resend" },
      ],
    }
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "provider-message-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({
      metadata: {
        resend_attempt_id: "44444444-4444-4444-8444-444444444444",
        [FROZEN_PROVIDER_PAYLOAD_KEY]: freezeResendProviderPayload(providerPayload),
      },
    }))

    expect(result).toEqual({ success: true })
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual(providerPayload)
    expect(mocks.reconstructEmailContent).not.toHaveBeenCalled()
  })

  it("reconciles a normal queued certificate email without entering manual resend bookkeeping", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: "provider-message-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({
      metadata: {
        certificate_storage_version: getEmployerCertificateStorageVersion(
          "certificates/current.pdf",
        ),
      },
    }))

    expect(result).toEqual({ success: true })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
    expect(mocks.reconcileCertificateEmailDelivery).toHaveBeenCalledWith({
      intakeId: "11111111-1111-4111-8111-111111111111",
      certificateId: "33333333-3333-4333-8333-333333333333",
      expectedStorageVersion: getEmployerCertificateStorageVersion(
        "certificates/current.pdf",
      ),
      outcome: "sent",
      providerMessageId: "provider-message-1",
      outboxId: "outbox-1",
      actorId: null,
      actorRole: "system",
      source: "outbox_dispatcher",
    })
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it("reconciles a terminal normal delivery failure without entering manual resend bookkeeping", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "invalid request" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({
      metadata: {
        certificate_storage_version: getEmployerCertificateStorageVersion(
          "certificates/current.pdf",
        ),
      },
    }))

    expect(result).toEqual({ success: false, error: "invalid request" })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
    expect(mocks.reconcileCertificateEmailDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "failed",
        failureReason: "invalid request",
        source: "outbox_dispatcher",
      }),
    )
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it("does not contact the provider until a legacy reconstruction is frozen", async () => {
    mocks.persistFrozenProviderPayload.mockResolvedValueOnce(false)

    const result = await sendFromOutboxRow(makeResendOutboxRow({ retry_count: 2 }))

    expect(result).toEqual({
      success: false,
      error: "Could not freeze reconstructed email before delivery",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "Could not freeze reconstructed email before delivery",
      attempts: 3,
    })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
  })

  it("keeps the reservation open while an outbox failure remains retryable", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "provider unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({ retry_count: 4 }))

    expect(result).toEqual({ success: false, error: "provider unavailable" })
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "provider unavailable",
      attempts: 5,
    })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
  })

  it("keeps a non-JSON provider 5xx retryable", async () => {
    mocks.fetch.mockResolvedValue(new Response("gateway offline", { status: 503 }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({ retry_count: 4 }))

    expect(result).toEqual({ success: false, error: "Resend API error (503)" })
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "Resend API error (503)",
      attempts: 5,
    })
    expect(mocks.finalizeCertificateResend).not.toHaveBeenCalled()
  })

  it("finalizes failure only when the shared dispatcher retry limit is exhausted", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "provider unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({ retry_count: 9 }))

    expect(result).toEqual({ success: false, error: "provider unavailable" })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith({
      attemptId: "44444444-4444-4444-8444-444444444444",
      deliverySucceeded: false,
      emailOutboxId: "outbox-1",
      providerMessageId: undefined,
      failureReason: "provider unavailable",
    })
  })

  it("terminalizes a non-retryable provider rejection without ten futile dispatches", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "invalid request" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendFromOutboxRow(makeResendOutboxRow({ retry_count: 1 }))

    expect(result).toEqual({ success: false, error: "invalid request" })
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "invalid request",
      attempts: 10,
    })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: false,
      failureReason: "invalid request",
    }))
  })

  it("terminalizes a queued email when a correction has replaced its document version", async () => {
    const result = await sendFromOutboxRow(makeResendOutboxRow({
      metadata: {
        resend_attempt_id: "44444444-4444-4444-8444-444444444444",
        certificate_storage_version: getEmployerCertificateStorageVersion(
          "certificates/older-version.pdf",
        ),
      },
    }))

    expect(result).toEqual({
      success: false,
      error: "Certificate email belongs to an older document version",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "Certificate email belongs to an older document version",
      attempts: 10,
    })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: false,
    }))
  })

  it("revalidates immediately before dispatch when a correction races the queued send", async () => {
    mocks.certificateStoragePaths = [
      "certificates/current.pdf",
      "certificates/corrected.pdf",
    ]
    const providerPayload = {
      from: "InstantMed <support@instantmed.example>",
      to: ["employer@example.test"],
      subject: "Medical certificate",
      html: "<p>Original employer link</p>",
      text: "Original employer link",
    }

    const result = await sendFromOutboxRow(makeResendOutboxRow({
      email_type: "med_cert_employer",
      metadata: {
        resend_attempt_id: "44444444-4444-4444-8444-444444444444",
        certificate_storage_version: getEmployerCertificateStorageVersion(
          "certificates/current.pdf",
        ),
        [FROZEN_PROVIDER_PAYLOAD_KEY]: freezeResendProviderPayload(providerPayload),
      },
    }))

    expect(result).toEqual({
      success: false,
      error: "Certificate email belongs to an older document version",
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "Certificate email belongs to an older document version",
      attempts: 10,
    })
    expect(mocks.finalizeCertificateResend).toHaveBeenCalledWith(expect.objectContaining({
      deliverySucceeded: false,
      failureReason: "Certificate email belongs to an older document version",
    }))
  })
})
