import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import {
  parseSupportInboxUnreadCount,
  postSupportInboxUnreadCount,
  SUPPORT_INBOX_ALERT_ENDPOINT,
} from "../../scripts/post-support-inbox-alert"

describe("support inbox alert posting script", () => {
  it("accepts one bounded integer count argument", () => {
    expect(parseSupportInboxUnreadCount(["--count", "0"])).toBe(0)
    expect(parseSupportInboxUnreadCount(["--count", "10000"])).toBe(10_000)
    expect(() => parseSupportInboxUnreadCount(["--count", "-1"])).toThrow()
    expect(() => parseSupportInboxUnreadCount(["--count", "2.5"])).toThrow()
    expect(() => parseSupportInboxUnreadCount(["--count", "10001"])).toThrow()
    expect(() => parseSupportInboxUnreadCount([])).toThrow()
  })

  it("posts only the aggregate count to the canonical production endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      outcome: "delivered",
      success: true,
      unreadCount: 4,
    }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 4,
    })).resolves.toEqual({ outcome: "delivered", unreadCount: 4 })

    expect(SUPPORT_INBOX_ALERT_ENDPOINT).toBe(
      "https://instantmed.com.au/api/internal/support-inbox-alert",
    )
    expect(fetchImpl).toHaveBeenCalledWith(SUPPORT_INBOX_ALERT_ENDPOINT, {
      body: JSON.stringify({ unreadCount: 4 }),
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: expect.any(AbortSignal),
    })
  })

  it("rejects an unknown successful outcome from the receiver", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      outcome: "queued",
      success: true,
      unreadCount: 4,
    }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 4,
    })).rejects.toThrow("Support inbox alert endpoint returned an invalid response")
  })

  it("rejects a 2xx payload that reports success false", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      outcome: "delivered",
      success: false,
      unreadCount: 4,
    }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 4,
    })).rejects.toThrow("Support inbox alert endpoint returned an invalid response")
  })

  it("rejects unexpected response fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      outcome: "delivered",
      sender: "must-not-cross-the-bridge@example.com",
      success: true,
      unreadCount: 4,
    }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 4,
    })).rejects.toThrow("Support inbox alert endpoint returned an invalid response")
  })

  it("rejects an outcome that contradicts the posted count", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      outcome: "zero",
      success: true,
      unreadCount: 4,
    }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 4,
    })).rejects.toThrow("Support inbox alert endpoint returned an invalid response")
  })

  it("accepts only the receiver's explicit safe-skip outcomes", async () => {
    const lockedFetch = vi.fn().mockResolvedValue(Response.json({
      skipped: "locked",
      success: true,
    }, { status: 202 }))
    const disabledFetch = vi.fn().mockResolvedValue(Response.json({
      skipped: "disabled",
      success: true,
    }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl: lockedFetch,
      unreadCount: 4,
    })).resolves.toEqual({ outcome: "locked", unreadCount: 4 })
    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl: disabledFetch,
      unreadCount: 4,
    })).resolves.toEqual({ outcome: "disabled", unreadCount: 4 })
  })

  it("rejects a lock skip for a zero-count observation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      skipped: "locked",
      success: true,
    }, { status: 202 }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 0,
    })).rejects.toThrow("Support inbox alert endpoint returned an invalid response")
  })

  it("rejects non-success HTTP responses before trusting their payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      outcome: "delivery_failed",
      success: false,
      unreadCount: 4,
    }, { status: 502 }))

    await expect(postSupportInboxUnreadCount({
      cronSecret: "test-secret",
      fetchImpl,
      unreadCount: 4,
    })).rejects.toThrow("Support inbox alert endpoint returned HTTP 502")
  })

  it("keeps the manual diagnostic command off by default", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>
    }
    const envSource = readFileSync(join(process.cwd(), "lib/config/env.ts"), "utf8")
    const operationsSource = readFileSync(join(process.cwd(), "docs/OPERATIONS.md"), "utf8")

    expect(packageJson.scripts["support:inbox-alert"]).toBe(
      "tsx scripts/post-support-inbox-alert.ts",
    )
    expect(envSource).toContain(
      'TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED: z.enum(["0", "1"]).optional()',
    )
    expect(envSource).not.toContain("GMAIL_SUPPORT_")
    expect(operationsSource).toContain("Manual-only and disabled in production")
    expect(operationsSource).toContain("deliberate diagnostics")
    expect(operationsSource).toContain(
      "records `delivery_failed` and returns HTTP 502",
    )
  })
})
