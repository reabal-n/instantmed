import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const lifecycleSources = [
  "app/doctor/queue/actions.ts",
  "lib/clinical/auto-approval-pipeline.ts",
  "lib/clinical/execute-cert-approval.ts",
]

describe("Telegram lifecycle edit durability", () => {
  it("keeps every paid-request status edit owned by the server invocation", () => {
    for (const path of lifecycleSources) {
      const source = readFileSync(join(process.cwd(), path), "utf8")
      expect(source, path).not.toMatch(/void editPaidRequestTelegramMessageTo/)
    }
  })
})
