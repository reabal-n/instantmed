import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
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
  createPendingOutbox: vi.fn(),
  deferOutboxRow: vi.fn(),
  logToOutbox: mocks.logToOutbox,
  persistFrozenProviderPayload: vi.fn(),
  updateOutboxStatus: vi.fn(),
}))

vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: vi.fn(),
  incrementDailySendCount: vi.fn(),
}))

import { sendEmail } from "@/lib/email/send-email"

function sendReviewRequest() {
  return sendEmail({
    to: "patient@example.com",
    subject: "How did InstantMed go?",
    template: {} as React.ReactElement,
    emailType: "review_request",
    intakeId: "intake-1",
  })
}

describe("review request development delivery truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PLAYWRIGHT
    mocks.renderEmailToHtml.mockResolvedValue("<p>Review request</p>")
    mocks.logToOutbox.mockResolvedValue("outbox-dev")
  })

  afterEach(() => {
    delete process.env.PLAYWRIGHT
  })

  it("does not report or persist a provider send without a Resend API key", async () => {
    const result = await sendReviewRequest()

    expect(result).toMatchObject({
      success: false,
      outcome: {
        kind: "transiently_blocked",
        reason: "provider_configuration_missing",
      },
    })
    expect(mocks.logToOutbox).not.toHaveBeenCalled()
  })

  it("does not persist sent_at for an E2E provider skip", async () => {
    process.env.PLAYWRIGHT = "1"

    const result = await sendReviewRequest()

    expect(result.outcome).toMatchObject({ kind: "pending" })
    const entry = mocks.logToOutbox.mock.calls[0]?.[0]
    expect(entry).toMatchObject({ status: "skipped_e2e" })
    expect(entry).not.toHaveProperty("sent_at")
  })
})
