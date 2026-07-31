import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("admin priority filter contract", () => {
  it("uses priority as the canonical chip id and keeps express as a read alias", () => {
    const source = readFileSync(join(process.cwd(), "lib/dashboard/admin-ledger-filters.ts"), "utf8")
    const client = readFileSync(join(process.cwd(), "app/admin/intakes/intakes-ledger-client.tsx"), "utf8")

    expect(source).toContain('{ value: "priority", label: "Priority" }')
    expect(source).not.toContain('{ value: "express", label: "Priority" }')
    expect(source).toContain('value === "express" ? "priority" : value')
    expect(client).toContain("ADMIN_LEDGER_QUICK_FILTER_OPTIONS")
    expect(client).not.toContain('id: "express"')
  })
})
