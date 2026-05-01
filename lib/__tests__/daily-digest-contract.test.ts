import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const dailyDigestSource = readFileSync(
  join(process.cwd(), "app/api/cron/daily-digest/route.ts"),
  "utf8",
)

describe("daily ops digest contract", () => {
  it("surfaces durable provider webhook failures in attention items", () => {
    expect(dailyDigestSource).toContain('.eq("action", "webhook_failed")')
    expect(dailyDigestSource).toContain("provider webhook")
    expect(dailyDigestSource.indexOf('.eq("action", "webhook_failed")')).toBeLessThan(
      dailyDigestSource.indexOf("const attentionItems: string[] = []"),
    )
  })
})
