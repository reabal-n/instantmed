import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("support inbox alert ownership contract", () => {
  it("keeps support inbox notifications manual-only while paid-request alerts stay scheduled", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      crons: Array<{ path: string; schedule: string }>
    }
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")
    const internalRoute = read("app/api/internal/support-inbox-alert/route.ts")
    const env = read("lib/config/env.ts")
    const architecture = read("docs/ARCHITECTURE.md")
    const operations = read("docs/OPERATIONS.md")
    const roadmap = read("docs/ROADMAP.md")
    const fileDirectory = read("wiki/file-directory.md")

    expect(vercel.crons).not.toContainEqual({
      path: "/api/cron/support-inbox-alert",
      schedule: expect.any(String),
    })
    expect(heartbeat).not.toContain('"support-inbox-alert":')
    expect(existsSync(join(process.cwd(), "app/api/cron/support-inbox-alert/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/integrations/gmail/support-inbox-count.ts"))).toBe(false)
    expect(internalRoute).toContain('process.env.TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED !== "1"')
    expect(env).toContain('TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED: z.enum(["0", "1"]).optional()')
    expect(env).not.toContain("GMAIL_SUPPORT_")
    expect(vercel.crons).toContainEqual({
      path: "/api/cron/telegram-notifications",
      schedule: "*/5 * * * *",
    })
    expect(heartbeat).toContain('"telegram-notifications"')
    expect(operations).toContain("Manual-only and disabled in production")
    expect(operations).toContain("Telegram is request-only in production")
    expect(architecture).not.toContain("support-inbox-alert/` (Gmail label aggregate only)")
    expect(architecture).toContain("manual aggregate-only support count diagnostics")
    expect(roadmap).not.toContain("support Inbox unread counts through the active aggregate-only Telegram bridge")
    expect(roadmap).not.toContain("route aggregate support counts to Telegram")
    expect(roadmap).not.toContain("the hourly Vercel cron reads only Gmail's aggregate")
    expect(roadmap).toContain("support conversations stay in Gmail and are handled manually")
    expect(fileDirectory).not.toContain("app/api/cron/support-inbox-alert/route.ts")
    expect(fileDirectory).toContain("app/api/internal/support-inbox-alert/route.ts")
  })
})
