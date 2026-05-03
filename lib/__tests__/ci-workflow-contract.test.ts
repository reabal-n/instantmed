import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ciWorkflowSource = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
)

describe("CI workflow contract", () => {
  it("runs an explicit TypeScript gate before build", () => {
    expect(ciWorkflowSource).toContain("Type-check")
    expect(ciWorkflowSource).toContain("run: pnpm typecheck")
  })

  it("passes the field-encryption key into ops E2E runs", () => {
    expect(ciWorkflowSource).toContain("Run ops E2E smoke (Chromium)")
    expect(ciWorkflowSource).toContain("ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}")
  })

  it("uses focused E2E gates instead of the stale broad Playwright suite", () => {
    expect(ciWorkflowSource).toContain("e2e/admin.ops-index.spec.ts")
    expect(ciWorkflowSource).toContain("Run paid critical E2E flows (Chromium)")
    expect(ciWorkflowSource).toContain("e2e/payment-smoke.spec.ts")
    expect(ciWorkflowSource).toContain("e2e/stripe-webhook.spec.ts")
    expect(ciWorkflowSource).toContain("e2e/parchment-webhook.spec.ts")
    expect(ciWorkflowSource).not.toMatch(/^\s*run: pnpm exec playwright test --project=chromium\s*$/m)
  })

  it("fails the paid-flow E2E gate when webhook secrets are missing", () => {
    expect(ciWorkflowSource).toContain("Verify paid-flow E2E secrets")
    expect(ciWorkflowSource).toContain("STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}")
    expect(ciWorkflowSource).toContain("PARCHMENT_WEBHOOK_SECRET: ${{ secrets.PARCHMENT_WEBHOOK_SECRET }}")
    expect(ciWorkflowSource).toContain("is required for the paid-flow E2E gate")
  })
})
