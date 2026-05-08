import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("release check contract", () => {
  it("runs the bundle-size gate against a captured production build output", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>
    }
    const buildWrapper = readFileSync(join(root, "scripts/build-release.sh"), "utf8")

    expect(packageJson.scripts["build:release"]).toBe("bash scripts/build-release.sh")
    expect(buildWrapper).toContain("pnpm build")
    expect(buildWrapper).toContain("tee \"$BUILD_OUT\"")
    expect(buildWrapper).toContain("/tmp/next-build-output.txt")
    expect(packageJson.scripts["release:check"]).toContain("pnpm build:release")
    expect(packageJson.scripts["release:check"]).toContain("bash scripts/check-bundle-size.sh")
  })

  it("keeps /request under route and first-load bundle budgets", () => {
    const bundleGate = readFileSync(join(root, "scripts/check-bundle-size.sh"), "utf8")

    expect(bundleGate).toContain("MAX_REQUEST_ROUTE_KB")
    expect(bundleGate).toContain("MAX_REQUEST_FIRST_LOAD_KB")
    expect(bundleGate).toContain("[[:space:]]/request[[:space:]]")
    expect(bundleGate).toContain("The intake shell is carrying code that should be lazy-loaded")
    expect(bundleGate).toContain("Paid-traffic intake is too heavy")
  })

  it("keeps global CSS from importing extra render-blocking stylesheets on /request", () => {
    const globalsCss = readFileSync(join(root, "app/globals.css"), "utf8")

    expect(globalsCss).not.toContain('@import "tw-animate-css"')
    expect(globalsCss).not.toContain("@import url(\"./print.css\")")
    expect(globalsCss).toContain("@media print")
    expect(globalsCss).toContain("@utility animate-in")
    expect(existsSync(join(root, "app/print.css"))).toBe(false)
  })

  it("documents the single local release command instead of split gates that miss bundle enforcement", () => {
    const checklist = readFileSync(join(root, "docs/PRODUCTION_RELEASE_CHECKLIST.md"), "utf8")

    expect(checklist).toContain("pnpm release:check")
    expect(checklist).not.toContain("- `pnpm build`")
  })
})
