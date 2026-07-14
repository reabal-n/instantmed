import { existsSync, readFileSync } from "node:fs"
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

  it("does not schedule a separate pending-queue Telegram reminder", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      crons: Array<{ path: string; schedule: string }>
    }
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")
    expect(vercel.crons.some((cron) => cron.path === "/api/cron/pending-queue-reminders")).toBe(false)
    expect(heartbeat).not.toContain('"pending-queue-reminders":')
    expect(existsSync(join(process.cwd(), "app/api/cron/pending-queue-reminders/route.ts"))).toBe(false)
  })
})
