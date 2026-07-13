import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  processUnreadCount: vi.fn(),
  readUnreadCount: vi.fn(),
  recordHeartbeat: vi.fn(),
}))

vi.mock("@/lib/integrations/gmail/support-inbox-count", () => ({
  readSupportInboxUnreadThreadCount: mocks.readUnreadCount,
}))

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: mocks.recordHeartbeat,
}))

vi.mock("@/lib/notifications/support-inbox-alert-processor", () => ({
  processSupportInboxUnreadCount: mocks.processUnreadCount,
}))

function request(secret = "test-cron-secret") {
  return new NextRequest("https://instantmed.com.au/api/cron/support-inbox-alert", {
    headers: { authorization: `Bearer ${secret}` },
  })
}

describe("GET /api/cron/support-inbox-alert", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
    vi.stubEnv("GMAIL_SUPPORT_INBOX_POLL_ENABLED", "1")
    vi.stubEnv("TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED", "1")
    mocks.readUnreadCount.mockResolvedValue(0)
    mocks.processUnreadCount.mockResolvedValue({
      body: { outcome: "zero", success: true, unreadCount: 0 },
      status: 200,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rejects unauthorised requests before touching Gmail", async () => {
    const { GET } = await import("@/app/api/cron/support-inbox-alert/route")

    const response = await GET(request("wrong-secret"))

    expect(response.status).toBe(401)
    expect(mocks.readUnreadCount).not.toHaveBeenCalled()
    expect(mocks.processUnreadCount).not.toHaveBeenCalled()
  })

  it("stays dormant unless the backend poll flag is explicitly enabled", async () => {
    vi.stubEnv("GMAIL_SUPPORT_INBOX_POLL_ENABLED", "0")
    const { GET } = await import("@/app/api/cron/support-inbox-alert/route")

    const response = await GET(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      skipped: "disabled",
    })
    expect(mocks.readUnreadCount).not.toHaveBeenCalled()
    expect(mocks.processUnreadCount).not.toHaveBeenCalled()
  })

  it("reads the aggregate and processes a zero count without Telegram delivery", async () => {
    const { GET } = await import("@/app/api/cron/support-inbox-alert/route")

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(mocks.recordHeartbeat).toHaveBeenCalledWith("support-inbox-alert")
    expect(mocks.readUnreadCount).toHaveBeenCalledOnce()
    expect(mocks.processUnreadCount).toHaveBeenCalledWith(0)
    await expect(response.json()).resolves.toMatchObject({ outcome: "zero", unreadCount: 0 })
  })

  it("passes a positive aggregate to the existing deduplicated Telegram processor", async () => {
    mocks.readUnreadCount.mockResolvedValue(3)
    mocks.processUnreadCount.mockResolvedValue({
      body: { outcome: "delivered", success: true, unreadCount: 3 },
      status: 200,
    })
    const { GET } = await import("@/app/api/cron/support-inbox-alert/route")

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(mocks.processUnreadCount).toHaveBeenCalledWith(3)
    await expect(response.json()).resolves.toEqual({
      outcome: "delivered",
      success: true,
      unreadCount: 3,
    })
  })

  it("returns a safe failure when the Gmail aggregate is unavailable", async () => {
    mocks.readUnreadCount.mockRejectedValue(new Error("provider detail"))
    const { GET } = await import("@/app/api/cron/support-inbox-alert/route")

    const response = await GET(request())

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: "Support inbox aggregate check failed",
      success: false,
    })
    expect(mocks.processUnreadCount).not.toHaveBeenCalled()
  })
})
