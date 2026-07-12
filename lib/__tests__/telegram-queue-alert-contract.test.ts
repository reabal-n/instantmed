import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Telegram queue alert contracts", () => {
  it("counts the same paid, non-seeded high-risk world as the doctor queue", () => {
    const source = read("app/api/cron/business-alerts/route.ts")
    const start = source.indexOf('// 7. High-risk intakes waiting in queue')
    const end = source.indexOf('// 8. Critical email delivery SLA', start)
    const section = source.slice(start, end)

    expect(section).toContain("filterSeededE2EIntakes(")
    expect(section).toContain('.eq("payment_status", "paid")')
  })

  it("schedules and heartbeat-monitors the hourly pending-queue reminder", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      crons: Array<{ path: string; schedule: string }>
    }
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")
    const route = read("app/api/cron/pending-queue-reminders/route.ts")

    expect(vercel.crons).toContainEqual({
      path: "/api/cron/pending-queue-reminders",
      schedule: "5 * * * *",
    })
    expect(heartbeat).toContain('"pending-queue-reminders":')
    expect(route).toContain('await recordCronHeartbeat("pending-queue-reminders")')
    expect(route).toContain("QUEUE_REVIEW_STATUSES")
    expect(route).toContain("filterSeededE2EIntakes")
  })
})
