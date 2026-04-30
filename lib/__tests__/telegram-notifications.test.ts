import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Telegram request notifications", () => {
  const originalEnv = { ...process.env }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    process.env.TELEGRAM_BOT_TOKEN = "test-token"
    process.env.TELEGRAM_CHAT_ID = "123456"
    process.env.NEXT_PUBLIC_APP_URL = "https://instantmed.com.au"
    delete process.env.TELEGRAM_APPROVAL_ACTIONS_ENABLED
    delete process.env.TELEGRAM_ACTION_SIGNING_SECRET
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it("escapes the paid-request MarkdownV2 separator so Telegram accepts the message", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      patientName: "Alex Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.parse_mode).toBe("MarkdownV2")
    expect(requestBody.text).toContain("*Medical Certificate* \\- $29\\.95")
    expect(requestBody.text).not.toContain("*Medical Certificate* - $29\\.95")
  })

  it("surfaces Telegram API failures to webhook callers for Sentry capture", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad Request: can't parse entities",
    })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await expect(notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      patientName: "Alex Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })).rejects.toThrow("Telegram med cert send failed: 400")
  })

  it("does not include a clinical approve callback by default", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      patientName: "Alex Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.reply_markup.inline_keyboard[0]).toEqual([
      {
        text: "📋 Review",
        url: "https://instantmed.com.au/doctor/intakes/12345678-1234-1234-1234-123456789abc",
      },
    ])
    expect(JSON.stringify(requestBody.reply_markup)).not.toContain("callback_data")
  })

  it("keeps Telegram notification bodies PHI-minimal", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      patientName: "Alex Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.text).not.toContain("Alex")
    expect(requestBody.text).not.toContain("Patient:")
    expect(requestBody.text).not.toContain("Reason:")
    expect(requestBody.text).toContain("Ref: `12345678`")
  })

  it("only emits approve callbacks when explicitly enabled with a dedicated signing secret", async () => {
    process.env.TELEGRAM_APPROVAL_ACTIONS_ENABLED = "true"
    process.env.TELEGRAM_ACTION_SIGNING_SECRET = "test-action-signing-secret"
    fetchMock.mockResolvedValue({ ok: true })

    const { notifyNewIntakeViaTelegram, verifyIntakeAction } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      patientName: "Alex Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    const [approveButton, reviewButton] = requestBody.reply_markup.inline_keyboard[0]

    expect(approveButton.text).toBe("✅ Approve")
    expect(approveButton.callback_data).toMatch(/^approve:12345678-1234-1234-1234-123456789abc:[a-f0-9]{16}$/)
    expect(reviewButton.text).toBe("📋 Review")

    const [, intakeId, signature] = approveButton.callback_data.split(":")
    expect(verifyIntakeAction(intakeId, "approve", signature)).toBe(true)
    expect(approveButton.callback_data).not.toContain("test-token")
  })

  it("fails loudly when paid-request Telegram credentials are missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await expect(notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      patientName: "Alex Patient",
      serviceName: "Medical Certificate",
      amount: "$29.95",
      serviceSlug: "med-cert-sick",
    })).rejects.toThrow("Telegram notification is not configured")

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
