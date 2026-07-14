import { afterEach, describe, expect, it, vi } from "vitest"

import {
  acquireSupportInboxAlertLock,
  decideSupportInboxAlert,
  sendSupportInboxTelegramAlert,
} from "@/lib/notifications/support-inbox-alert"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("support inbox alerts", () => {
  it("reports a held distributed lock when another positive-count request is in progress", async () => {
    const redis = {
      set: vi.fn().mockResolvedValue(null),
    }

    await expect(acquireSupportInboxAlertLock({
      nodeEnv: "production",
      redisFactory: async () => redis,
      redisRestToken: "test-token",
      redisRestUrl: "https://redis.example.com",
    })).resolves.toBe("held")

    expect(redis.set).toHaveBeenCalledWith(
      "support-inbox-alert:positive-count:lock",
      expect.any(String),
      { ex: 30, nx: true },
    )
  })

  it("fails closed in production when Redis is not configured", async () => {
    await expect(acquireSupportInboxAlertLock({
      nodeEnv: "production",
      redisRestToken: "",
      redisRestUrl: "",
    })).resolves.toBe("unavailable")
  })

  it("allows a no-op lock outside production when Redis is not configured", async () => {
    await expect(acquireSupportInboxAlertLock({
      nodeEnv: "test",
      redisRestToken: "",
      redisRestUrl: "",
    })).resolves.toBe("acquired")
  })

  it("fails closed in production when Redis rejects the lock request", async () => {
    await expect(acquireSupportInboxAlertLock({
      nodeEnv: "production",
      redisFactory: async () => ({
        set: vi.fn().mockRejectedValue(new Error("Redis unavailable")),
      }),
      redisRestToken: "test-token",
      redisRestUrl: "https://redis.example.com",
    })).resolves.toBe("unavailable")
  })

  it("never pages when there are no unread messages", () => {
    expect(decideSupportInboxAlert({
      now: new Date("2026-07-12T08:00:00.000Z"),
      observations: [],
      unreadCount: 0,
    })).toBe("zero")
  })

  it("suppresses an unchanged positive count for four hours after delivery", () => {
    expect(decideSupportInboxAlert({
      now: new Date("2026-07-12T11:59:59.999Z"),
      observations: [{
        createdAt: "2026-07-12T08:00:00.000Z",
        outcome: "delivered",
        unreadCount: 3,
      }],
      unreadCount: 3,
    })).toBe("suppressed")
  })

  it("keeps an unchanged count suppressed across repeated observations", () => {
    expect(decideSupportInboxAlert({
      now: new Date("2026-07-12T10:00:00.000Z"),
      observations: [
        {
          createdAt: "2026-07-12T09:00:00.000Z",
          outcome: "suppressed",
          unreadCount: 3,
        },
        {
          createdAt: "2026-07-12T08:00:00.000Z",
          outcome: "delivered",
          unreadCount: 3,
        },
      ],
      unreadCount: 3,
    })).toBe("suppressed")
  })

  it("pages a changed positive count immediately", () => {
    expect(decideSupportInboxAlert({
      now: new Date("2026-07-12T08:05:00.000Z"),
      observations: [{
        createdAt: "2026-07-12T08:00:00.000Z",
        outcome: "delivered",
        unreadCount: 3,
      }],
      unreadCount: 4,
    })).toBe("page")
  })

  it("retries an unchanged positive count after a failed delivery", () => {
    expect(decideSupportInboxAlert({
      now: new Date("2026-07-12T08:05:00.000Z"),
      observations: [{
        createdAt: "2026-07-12T08:00:00.000Z",
        outcome: "delivery_failed",
        unreadCount: 3,
      }],
      unreadCount: 3,
    })).toBe("page")
  })

  it("repeats an unchanged positive count once four hours have elapsed", () => {
    expect(decideSupportInboxAlert({
      now: new Date("2026-07-12T12:00:00.000Z"),
      observations: [{
        createdAt: "2026-07-12T08:00:00.000Z",
        outcome: "delivered",
        unreadCount: 3,
      }],
      unreadCount: 3,
    })).toBe("page")
  })

  it("sends only the aggregate count and a generic Gmail review link under its dedicated flag", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token")
    vi.stubEnv("TELEGRAM_CHAT_ID", "123456")
    vi.stubEnv("TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED", "1")
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(sendSupportInboxTelegramAlert(7)).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(payload).toEqual({
      chat_id: "123456",
      disable_web_page_preview: true,
      text: "Support inbox: 7 unread threads need review.\nReview in Gmail: https://mail.google.com/mail/#inbox",
    })
  })
})
