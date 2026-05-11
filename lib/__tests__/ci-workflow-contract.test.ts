import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ciWorkflowSource = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
)

describe("CI workflow contract", () => {
  it("checks the active Node runtime before install and build", () => {
    expect(ciWorkflowSource).toContain("Check active Node runtime")
    expect(ciWorkflowSource).toContain("run: bash scripts/check-node-runtime.sh")
  })

  it("runs an explicit TypeScript gate before build", () => {
    expect(ciWorkflowSource).toContain("Type-check")
    expect(ciWorkflowSource).toContain("run: pnpm typecheck")
  })

  it("uses the shared release build wrapper so CI and local release checks match", () => {
    expect(ciWorkflowSource).toContain("Type-check and build (budget: 180s)")
    expect(ciWorkflowSource).toContain("run: pnpm build:release")
  })

  it("passes the field-encryption key into ops E2E runs", () => {
    expect(ciWorkflowSource).toContain("Run ops E2E smoke (Chromium)")
    expect(ciWorkflowSource).toContain("ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}")
  })

  it("uses focused E2E gates instead of the stale broad Playwright suite", () => {
    expect(ciWorkflowSource).toContain("e2e/admin.ops-index.spec.ts")
    expect(ciWorkflowSource).toContain("Run med cert readiness E2E gate (Chromium)")
    expect(ciWorkflowSource).toContain("run: pnpm medcert:readiness:e2e")
    expect(ciWorkflowSource).toContain("Run non-medcert paid critical E2E flows (Chromium)")
    expect(ciWorkflowSource).toContain("e2e/parchment-webhook.spec.ts")
    expect(ciWorkflowSource).not.toMatch(/^\s*run: pnpm exec playwright test --project=chromium\s*$/m)
  })

  it("fails the paid-flow E2E gate when webhook secrets are missing", () => {
    expect(ciWorkflowSource).toContain("Verify paid-flow E2E secrets")
    expect(ciWorkflowSource).toContain("STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}")
    expect(ciWorkflowSource).toContain("PARCHMENT_WEBHOOK_SECRET: ${{ secrets.PARCHMENT_WEBHOOK_SECRET }}")
    expect(ciWorkflowSource).toContain("is required for the paid-flow E2E gate")
  })

  it("keeps paid critical E2E blocking instead of warning-only", () => {
    const medCertStepStart = ciWorkflowSource.indexOf("Run med cert readiness E2E gate (Chromium)")
    const paidStepStart = ciWorkflowSource.indexOf("Run non-medcert paid critical E2E flows (Chromium)")
    const uploadStepStart = ciWorkflowSource.indexOf("Upload test results")
    const medCertStep = ciWorkflowSource.slice(medCertStepStart, paidStepStart)
    const paidStep = ciWorkflowSource.slice(paidStepStart, uploadStepStart)

    expect(medCertStepStart).toBeGreaterThan(-1)
    expect(paidStepStart).toBeGreaterThan(-1)
    expect(uploadStepStart).toBeGreaterThan(paidStepStart)
    expect(medCertStep).toContain("pnpm medcert:readiness:e2e")
    expect(medCertStep).not.toContain("continue-on-error")
    expect(paidStep).toContain("e2e/parchment-webhook.spec.ts")
    expect(paidStep).not.toContain("continue-on-error")
  })
})
