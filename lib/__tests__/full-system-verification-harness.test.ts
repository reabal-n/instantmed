import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const scriptSource = readFileSync(
  join(root, "scripts/verification/full-system-check.ts"),
  "utf8",
)
const gitignoreSource = readFileSync(join(root, ".gitignore"), "utf8")
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts: Record<string, string>
}

describe("full-system verification harness contract", () => {
  it("exposes the operator-run scripts without adding a CI gate", () => {
    expect(packageJson.scripts["verify:full"]).toBe("tsx scripts/verification/full-system-check.ts")
    expect(packageJson.scripts["verify:full:dev"]).toContain("--target=dev --start-server")
    expect(packageJson.scripts["verify:full:preview"]).toContain("--target=preview")
    expect(packageJson.scripts["verify:full:prod"]).toContain("--target=production --auth=clean")
    expect(packageJson.scripts["release:check"]).not.toContain("verify:full")
  })

  it("keeps production checks read-only and payment checks test-mode only", () => {
    expect(scriptSource).toContain("--include-payments is forbidden on production")
    expect(scriptSource).toContain("--deep is forbidden on production")
    expect(scriptSource).toContain("STRIPE_SECRET_KEY")
    expect(scriptSource).toContain("sk_test_")
    expect(scriptSource).toContain("instantmed.com.au")
    expect(scriptSource).toContain("e2e/payment-smoke.spec.ts")
    expect(scriptSource).toContain("e2e/stripe-webhook.spec.ts")
  })

  it("supports the approved logged-in Chrome and E2E auth paths", () => {
    expect(scriptSource).toContain("connectOverCDP")
    expect(scriptSource).toContain("--auth=cdp requires --cdp-url")
    expect(scriptSource).toContain("/api/test/login")
    expect(scriptSource).toContain("operator")
    expect(scriptSource).toContain("doctor")
    expect(scriptSource).toContain("support")
    expect(scriptSource).toContain("patient")
  })

  it("covers all current intake flows through the non-production payment CTA", () => {
    for (const label of [
      "Med cert to payment CTA",
      "Repeat script to payment CTA",
      "ED to payment CTA",
      "Hair loss to payment CTA",
      "Women's health to payment CTA",
    ]) {
      expect(scriptSource).toContain(label)
    }
  })

  it("captures screenshots, traces, route health, and performance/jank signals", () => {
    expect(scriptSource).toContain("page.screenshot")
    expect(scriptSource).toContain("context.tracing.start")
    expect(scriptSource).toContain("longtask")
    expect(scriptSource).toContain("layout-shift")
    expect(scriptSource).toContain("requestfailed")
    expect(scriptSource).toContain("pageerror")
    expect(scriptSource).toContain("mobile horizontal overflow")
  })

  it("keeps generated verification artifacts out of git", () => {
    expect(gitignoreSource).toContain("/.verification/")
    expect(gitignoreSource).toContain("/playwright/.auth/")
  })
})
