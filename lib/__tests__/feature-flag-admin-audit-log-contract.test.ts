import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ACTIONS_PATH = join(process.cwd(), "app/actions/admin-config.ts")

describe("feature flag admin audit log contract", () => {
  it("fetches enough settings history before filtering to feature flag changes", () => {
    const source = readFileSync(ACTIONS_PATH, "utf8")

    expect(source).toMatch(/getAuditLogs\(\s*\{\s*eventType: "settings_changed"\s*\},\s*1,\s*100\s*\)/)
    expect(source).toMatch(/\.filter\([\s\S]+action_type === "operational_config_updated"[\s\S]+\)\s*\.slice\(0,\s*20\)/)
  })
})
