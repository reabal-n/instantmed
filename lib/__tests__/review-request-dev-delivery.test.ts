import { beforeEach, describe, expect, it, vi } from "vitest"

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
  updateOutboxStatus: vi.fn(),
}))

import { sendEmail } from "@/lib/email/send-email"

describe("review request development delivery truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.renderEmailToHtml.mockResolvedValue("<p>Review request</p>")
    mocks.logToOutbox.mockResolvedValue("outbox-dev")
  })

  it("does not report or persist a provider send without a Resend API key", async () => {
    const result = await sendEmail({
      to: "patient@example.com",
      subject: "How did InstantMed go?",
      template: {} as React.ReactElement,
      emailType: "review_request",
      intakeId: "intake-1",
    })

    expect(result.outcome).toMatchObject({ kind: "pending" })
    expect(mocks.logToOutbox).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped_e2e" }),
    )
  })
})
