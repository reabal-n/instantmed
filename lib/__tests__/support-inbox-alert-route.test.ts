import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  acquireLock: vi.fn(),
  createServiceRoleClient: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock("@/lib/notifications/support-inbox-alert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notifications/support-inbox-alert")>()
  return {
    ...actual,
    acquireSupportInboxAlertLock: mocks.acquireLock,
  }
})

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function request(body: unknown, secret = "test-cron-secret") {
  return new NextRequest("https://instantmed.com.au/api/internal/support-inbox-alert", {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    method: "POST",
  })
}

function auditClient(recentRows: Array<Record<string, unknown>> = []) {
  const inserted: Array<Record<string, unknown>> = []
  const insert = vi.fn(async (value: Record<string, unknown>) => {
    inserted.push(value)
    return { error: null }
  })
  const limit = vi.fn(async () => ({ data: recentRows, error: null }))
  const order = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn((table: string) => {
    if (table !== "audit_logs") throw new Error(`Unexpected table: ${table}`)
    return { insert, select }
  })
  const client = { from }
  mocks.createServiceRoleClient.mockReturnValue(client)
  return { inserted, limit }
}

describe("POST /api/internal/support-inbox-alert", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token")
    vi.stubEnv("TELEGRAM_CHAT_ID", "123456")
    vi.stubEnv("TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED", "1")
    mocks.acquireLock.mockResolvedValue("acquired")
    mocks.fetch.mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal("fetch", mocks.fetch)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("rejects requests without the configured CRON_SECRET before reading support state", async () => {
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 1 }, "wrong-secret"))

    expect(response.status).toBe(401)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("rejects support-message fields instead of accepting mailbox content", async () => {
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({
      body: "Please help with my medication",
      text: "Please help with my medication",
      unreadCount: 1,
    }))

    expect(response.status).toBe(400)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("accepts only integer unread counts from zero through ten thousand", async () => {
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    for (const unreadCount of [-1, 1.5, 10_001, "3", null]) {
      const response = await POST(request({ unreadCount }))
      expect(response.status).toBe(400)
    }

    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("rejects non-JSON content types", async () => {
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")
    const nonJsonRequest = new NextRequest("https://instantmed.com.au/api/internal/support-inbox-alert", {
      body: JSON.stringify({ unreadCount: 1 }),
      headers: {
        authorization: "Bearer test-cron-secret",
        "content-type": "text/plain",
      },
      method: "POST",
    })

    const response = await POST(nonJsonRequest)

    expect(response.status).toBe(415)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("stays off unless the dedicated support-inbox flag equals one", async () => {
    vi.stubEnv("TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED", "0")
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 4 }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      skipped: "disabled",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("records a zero-count observation without paging Telegram", async () => {
    const audit = auditClient()
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 0 }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      outcome: "zero",
      success: true,
      unreadCount: 0,
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.acquireLock).not.toHaveBeenCalled()
    expect(audit.inserted).toHaveLength(1)
    expect(audit.inserted[0]).toMatchObject({
      action: "support_inbox_alert_observation",
      actor_type: "system",
    })
    expect(audit.inserted[0]?.metadata).toEqual({
      outcome: "zero",
      unread_count: 0,
    })
  })

  it("safely skips a positive count while another alert request holds the lock", async () => {
    mocks.acquireLock.mockResolvedValueOnce("held")
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 3 }))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({
      success: true,
      skipped: "locked",
    })
    expect(mocks.acquireLock).toHaveBeenCalledOnce()
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("fails closed before reading support state when the production lock is unavailable", async () => {
    mocks.acquireLock.mockResolvedValueOnce("unavailable")
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 3 }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: "Support inbox alert temporarily unavailable",
      success: false,
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("pages and records an initial positive count", async () => {
    const audit = auditClient()
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 3 }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      outcome: "delivered",
      success: true,
      unreadCount: 3,
    })
    expect(mocks.fetch).toHaveBeenCalledOnce()
    expect(audit.inserted[0]).toMatchObject({
      action: "support_inbox_alert_observation",
      actor_type: "system",
    })
    expect(audit.inserted[0]?.metadata).toEqual({
      outcome: "delivered",
      unread_count: 3,
    })
  })

  it("records but does not page an unchanged positive count inside the cooldown", async () => {
    const audit = auditClient([{
      created_at: new Date().toISOString(),
      metadata: {
        outcome: "delivered",
        unread_count: 3,
      },
    }])
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 3 }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      outcome: "suppressed",
      success: true,
      unreadCount: 3,
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(audit.inserted[0]?.metadata).toEqual({
      outcome: "suppressed",
      unread_count: 3,
    })
  })

  it("pages a changed positive count inside the prior count cooldown", async () => {
    const audit = auditClient([{
      created_at: new Date().toISOString(),
      metadata: {
        outcome: "delivered",
        unread_count: 3,
      },
    }])
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 4 }))

    expect(response.status).toBe(200)
    expect(mocks.fetch).toHaveBeenCalledOnce()
    expect(audit.inserted[0]?.metadata).toEqual({
      outcome: "delivered",
      unread_count: 4,
    })
  })

  it("records failed delivery without suppressing the next retry", async () => {
    const audit = auditClient([{
      created_at: new Date().toISOString(),
      metadata: {
        outcome: "delivery_failed",
        unread_count: 3,
      },
    }])
    mocks.fetch.mockResolvedValue(new Response(null, { status: 503 }))
    const { POST } = await import("@/app/api/internal/support-inbox-alert/route")

    const response = await POST(request({ unreadCount: 3 }))

    expect(response.status).toBe(502)
    expect(mocks.fetch).toHaveBeenCalledOnce()
    expect(audit.inserted[0]?.metadata).toEqual({
      outcome: "delivery_failed",
      unread_count: 3,
    })
  })
})
