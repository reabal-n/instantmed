import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ciWorkflowSource = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
)

describe("CI workflow contract", () => {
  it("passes the field-encryption key into ops E2E runs", () => {
    expect(ciWorkflowSource).toContain("Run ops E2E smoke (Chromium)")
    expect(ciWorkflowSource).toContain("ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}")
  })

  it("uses the current ops smoke instead of the stale broad Playwright suite", () => {
    expect(ciWorkflowSource).toContain("e2e/admin.ops-index.spec.ts")
    expect(ciWorkflowSource).not.toContain("pnpm exec playwright test --project=chromium\n")
    expect(ciWorkflowSource).not.toContain("STRIPE_WEBHOOK_SECRET")
  })
})
