import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Telegram webhook hardening", () => {
  const originalEnv = { ...process.env }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    process.env.TELEGRAM_BOT_TOKEN = "test-token"
    process.env.TELEGRAM_CHAT_ID = "123456"
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret"
    delete process.env.TELEGRAM_APPROVAL_ACTIONS_ENABLED
    delete process.env.TELEGRAM_ACTION_SIGNING_SECRET
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it("fails closed when the webhook secret is not configured", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET

    const { POST } = await import("@/app/api/webhooks/telegram/route")

    const response = await POST(new Request("https://instantmed.com.au/api/webhooks/telegram", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callback_query: { id: "callback-1", data: "approve:intake-1:bad" } }),
    }))

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects Telegram approval callbacks unless approval actions are explicitly enabled", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { POST } = await import("@/app/api/webhooks/telegram/route")

    const response = await POST(new Request("https://instantmed.com.au/api/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-webhook-secret",
      },
      body: JSON.stringify({
        callback_query: {
          id: "callback-1",
          data: "approve:12345678-1234-1234-1234-123456789abc:bad",
          message: { chat: { id: 123456 }, message_id: 10 },
          from: { id: 123456 },
        },
      }),
    }))

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("/answerCallbackQuery")
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain("disabled")
  })
})
