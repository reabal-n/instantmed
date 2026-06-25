import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("admin priority filter contract", () => {
  it("uses priority as the canonical chip id and keeps express as a read alias", () => {
    const source = readFileSync(
      join(process.cwd(), "app/admin/intakes/intakes-ledger-client.tsx"),
      "utf8",
    )

    expect(source).toContain('{ id: "priority", label: "Priority" }')
    expect(source).not.toContain('{ id: "express", label: "Priority" }')
    expect(source).toContain('return filterId === "express" ? "priority" : filterId')
    expect(source).toContain('case "priority":')
    expect(source).toContain('case "express":')
    expect(source).toContain("parseQuickFilterParams(raw)")
  })
})
