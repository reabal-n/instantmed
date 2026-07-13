import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("backend-owned support inbox alert contract", () => {
  it("keeps the hourly backend cron scheduled, watched, and label-aggregate only", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      crons: Array<{ path: string; schedule: string }>
    }
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")
    const route = read("app/api/cron/support-inbox-alert/route.ts")
    const gmailReader = read("lib/integrations/gmail/support-inbox-count.ts")
    const operations = read("docs/OPERATIONS.md")

    expect(vercel.crons).toContainEqual({
      path: "/api/cron/support-inbox-alert",
      schedule: "10 * * * *",
    })
    expect(heartbeat).toContain(
      '"support-inbox-alert": { schedule: "10 * * * *", maxDelayMinutes: 75 }',
    )
    expect(route).toContain('await recordCronHeartbeat("support-inbox-alert")')
    expect(gmailReader).toContain("/gmail/v1/users/me/labels/INBOX")
    expect(gmailReader).not.toContain("/gmail/v1/users/me/messages")
    expect(gmailReader).not.toContain("/gmail/v1/users/me/threads")
    expect(operations).toContain("no local Codex automation owns the schedule")
  })
})
