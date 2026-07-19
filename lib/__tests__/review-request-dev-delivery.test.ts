import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  logToOutbox: vi.fn(),
  renderEmailToHtml: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  env: {
    appUrl: "http://localhost:3060",
    isDev: true,
    resendApiKey: undefined,
    resendFromEmail: "InstantMed <support@instantmed.example>",
  },
}))

vi.mock("@/lib/email/react-renderer-server", () => ({
  renderEmailToHtml: mocks.renderEmailToHtml,
}))

vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.createPendingOutbox,
  deferOutboxRow: mocks.deferOutboxRow,
  logToOutbox: mocks.logToOutbox,
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn().mockResolvedValue({
    allowed: true,
    current: 0,
    limit: 200,
  }),
  incrementDailySendCount: vi.fn(),
}))

import { sendEmail } from "@/lib/email/send-email"

describe("review request development delivery truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PLAYWRIGHT
    mocks.renderEmailToHtml.mockResolvedValue("<p>Review request</p>")
    mocks.logToOutbox.mockResolvedValue("outbox-dev")
    mocks.createPendingOutbox.mockImplementation(async (entry: {
      metadata?: Record<string, unknown>
    }) => ({
      id: "outbox-dev",
      duplicate: false,
      providerPayloadEnc: entry.metadata?._provider_payload_enc,
    }))
    mocks.deferOutboxRow.mockResolvedValue(true)
  })

  afterEach(() => {
    delete process.env.PLAYWRIGHT
  })

  it("does not report or persist a provider send without a Resend API key", async () => {
    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
    })

    expect(result.outcome).toMatchObject({
      kind: "transiently_blocked",
      reason: "provider_configuration_missing",
    })
    expect(mocks.createPendingOutbox).toHaveBeenCalledWith(
      expect.objectContaining({
        email_type: "review_request",
        initialStatus: "sending",
      }),
    )
    expect(mocks.deferOutboxRow).toHaveBeenCalledWith(
      "outbox-dev",
      expect.any(String),
      "No Resend API key configured",
    )
    expect(mocks.logToOutbox).not.toHaveBeenCalled()
  })

  it("does not persist sent_at for an E2E provider skip", async () => {
    process.env.PLAYWRIGHT = "1"

    await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
    })

    const entry = mocks.logToOutbox.mock.calls[0]?.[0]
    expect(entry).toMatchObject({ status: "skipped_e2e" })
    expect(entry).not.toHaveProperty("sent_at")
  })
})
