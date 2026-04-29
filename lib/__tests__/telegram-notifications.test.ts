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
})
