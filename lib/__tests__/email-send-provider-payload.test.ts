import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPendingOutbox: vi.fn(),
  createServiceRoleClient: vi.fn(),
  fetch: vi.fn(),
  isEmailSuppressed: vi.fn(),
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

vi.mock("@/lib/email/utils", () => ({
  htmlToPlainText: vi.fn(() => "Private certificate email"),
  isEmailSuppressed: mocks.isEmailSuppressed,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.createPendingOutbox,
  logToOutbox: vi.fn(),
  updateOutboxStatus: mocks.updateOutboxStatus,
}))

vi.mock("@/lib/email/send/reconstruct", () => ({
  reconstructEmailContent: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn(),
  incrementDailySendCount: vi.fn(),
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  recordDeliverySent: vi.fn(),
}))

import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import { readFrozenResendProviderPayload } from "@/lib/email/send/provider-payload"
import { sendEmail } from "@/lib/email/send-email"

describe("email provider payload replay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.isEmailSuppressed.mockResolvedValue(false)
    mocks.renderEmailToHtml.mockResolvedValue("<p>Private certificate email</p>")
    mocks.updateOutboxStatus.mockResolvedValue(undefined)
    mocks.createPendingOutbox.mockImplementation(async (entry: {
      metadata?: Record<string, unknown>
    }) => ({
      id: "outbox-1",
      duplicate: false,
      providerPayloadEnc: entry.metadata?._provider_payload_enc,
      certificateStorageVersion: entry.metadata?.certificate_storage_version,
    }))
    let certificateQuery = 0
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => {
        const queryIndex = certificateQuery++
        const chain: Record<string, unknown> = {}
        for (const method of ["select", "eq", "order", "limit"]) {
          chain[method] = vi.fn(() => chain)
        }
        chain.maybeSingle = vi.fn(async () => queryIndex === 0
          ? {
              data: {
                id: "33333333-3333-4333-8333-333333333333",
                intake_id: "11111111-1111-4111-8111-111111111111",
                status: "valid",
                storage_path: "certificates/current.pdf",
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

  it("sends the exact encrypted outbox payload and marks a 4xx rejection terminal", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ message: "invalid request" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await sendEmail({
      to: "patient@example.test",
      toName: "Test Patient",
      subject: "Your certificate",
      template: {} as React.ReactElement,
      emailType: "med_cert_patient",
      certificateId: "33333333-3333-4333-8333-333333333333",
      metadata: { resend_attempt_id: "44444444-4444-4444-8444-444444444444" },
      tags: [{ name: "category", value: "med_cert_resend" }],
    })

    expect(result).toEqual({
      success: false,
      error: "invalid request",
      outboxId: "outbox-1",
      retryable: false,
    })
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "invalid request",
      attempts: 10,
    })

    const outboxEntry = mocks.createPendingOutbox.mock.calls[0][0]
    const frozenPayload = readFrozenResendProviderPayload(outboxEntry.metadata)
    expect(frozenPayload).not.toBeNull()
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual(frozenPayload)
    expect(JSON.stringify(outboxEntry.metadata)).not.toContain("Private certificate email")
  })

  it("fails closed before the immediate provider call when a correction changed the document", async () => {
    const result = await sendEmail({
      to: "employer@example.test",
      subject: "Medical certificate",
      template: {} as React.ReactElement,
      emailType: "med_cert_employer",
      certificateId: "33333333-3333-4333-8333-333333333333",
      metadata: {
        certificate_storage_version: getEmployerCertificateStorageVersion(
          "certificates/older.pdf",
        ),
      },
    })

    expect(result).toEqual({
      success: false,
      error: "Certificate email belongs to an older document version",
      outboxId: "outbox-1",
      retryable: false,
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.updateOutboxStatus).toHaveBeenCalledWith("outbox-1", "failed", {
      error_message: "Certificate email belongs to an older document version",
      attempts: 10,
    })
  })
})
