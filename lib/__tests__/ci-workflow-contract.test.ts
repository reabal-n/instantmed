import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ciWorkflowSource = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
)

describe("CI workflow contract", () => {
  it("passes the field-encryption key into full E2E runs", () => {
    expect(ciWorkflowSource).toContain("Run full E2E suite (Chromium)")
    expect(ciWorkflowSource).toContain("ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}")
  })
})
