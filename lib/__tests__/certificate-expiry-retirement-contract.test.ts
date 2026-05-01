import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("certificate expiry retirement", () => {
  it("keeps the retired expire-certificates cron out of production execution paths", () => {
    expect(existsSync(join(root, "app/api/cron/expire-certificates/route.ts"))).toBe(false)

    const vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
      crons?: Array<{ path?: string }>
    }

    expect(vercelConfig.crons?.map((cron) => cron.path)).not.toContain(
      "/api/cron/expire-certificates",
    )

    const heartbeatSource = readFileSync(join(root, "lib/monitoring/cron-heartbeat.ts"), "utf8")
    expect(heartbeatSource).not.toContain("expire-certificates")
  })
})
