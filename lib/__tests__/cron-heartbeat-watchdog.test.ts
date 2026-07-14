import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("cron watchdog alert contract", () => {
  it("keeps Sentry monitoring without sending automatic Telegram messages", () => {
    const source = readFileSync(join(process.cwd(), "lib/monitoring/cron-heartbeat.ts"), "utf8")

    expect(source).toContain("Sentry.captureMessage")
    expect(source).not.toContain("sendTelegramAlert")
    expect(source).not.toContain("telegram_cron_watchdog")
  })
})
