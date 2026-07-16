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
    expect(packageJson.scripts["release:check"]).toContain("bash scripts/check-route-conflicts.sh")
    expect(packageJson.scripts["release:check"]).toContain("bash scripts/check-orphaned-files.sh")
    expect(packageJson.scripts["release:check"]).toContain("pnpm build:release")
    expect(packageJson.scripts["release:check"]).toContain("bash scripts/check-bundle-size.sh")
  })

  it("blocks copied local artifacts before packaging a release", () => {
    const orphanCheck = readFileSync(join(root, "scripts/check-orphaned-files.sh"), "utf8")
    const vercelIgnore = readFileSync(join(root, ".vercelignore"), "utf8")
    const gitIgnore = readFileSync(join(root, ".gitignore"), "utf8")

    expect(orphanCheck).toContain('"node_modules 2"')
    expect(orphanCheck).toContain('"playwright-report 2"')
    expect(orphanCheck).toContain("copied local artifact")
    expect(vercelIgnore).toContain("playwright-report*/")
    expect(gitIgnore).toContain("/playwright-report*/")
  })

  it("ratchets dead-code findings before lint without deleting files", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>
    }
    const releaseCheck = packageJson.scripts["release:check"]
    const ciWorkflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8")
    const deadCodeRunner = readFileSync(
      join(root, "scripts/dead-code-baseline.ts"),
      "utf8",
    )

    expect(packageJson.scripts["deadcode:scan"]).toBe("knip --reporter compact")
    expect(packageJson.scripts["deadcode:scan:production"]).toBe(
      "knip --production --reporter compact",
    )
    expect(packageJson.scripts["deadcode:baseline"]).toBe(
      "tsx scripts/dead-code-baseline.ts --write",
    )
    expect(packageJson.scripts["deadcode:check"]).toBe(
      "tsx scripts/dead-code-baseline.ts",
    )
    expect(releaseCheck).toContain("pnpm deadcode:check")
    expect(releaseCheck.indexOf("pnpm deadcode:check")).toBeLessThan(
      releaseCheck.indexOf("pnpm lint"),
    )
    expect(ciWorkflow).toContain("Dead-code baseline ratchet")
    expect(ciWorkflow).toContain("run: pnpm deadcode:check")
    expect(deadCodeRunner).toContain('"--no-exit-code"')
    expect(deadCodeRunner).toContain('"--production"')
    expect(deadCodeRunner).not.toContain('"--fix"')
    expect(deadCodeRunner).not.toContain('"--allow-remove-files"')
  })

  it("keeps /request under route and first-load bundle budgets", () => {
    const bundleGate = readFileSync(join(root, "scripts/check-bundle-size.sh"), "utf8")

    expect(bundleGate).toContain("MAX_REQUEST_ROUTE_KB")
    expect(bundleGate).toContain("MAX_REQUEST_FIRST_LOAD_KB")
    expect(bundleGate).toContain('BUILD_OUT="${BUILD_OUT:-/tmp/next-build-output.txt}"')
    // Re-baselined 25->26 on 2026-07-10 with the intake state-lifecycle
    // package (PR #308): main had saturated the old budget at exactly 25.0 kB
    // and the shell's own state machinery cannot be lazy-loaded. The gate row
    // documents the lazy-load candidates required before the NEXT bump.
    expect(bundleGate).toContain('"/request|26|180|')
    expect(bundleGate).toContain("The intake shell is carrying code that should be lazy-loaded")
    expect(bundleGate).toContain("The patient dashboard should stay tight")
    expect(bundleGate).toContain("returning-patient shortcut shipped on the hero")
    expect(bundleGate).toContain('"/dashboard|37|400|')
    expect(bundleGate).toContain("unique route-chunk estimate")
    expect(bundleGate).toContain("Actual initial dashboard JS fell from 390 to 389 kB")
    expect(bundleGate).toContain('"/admin/intakes|23|260|')
    expect(bundleGate).toContain("The request ledger must keep the clinical review cockpit behind an explicit-open dynamic import")
    expect(bundleGate).toContain("The primary paid med-cert landing page should stay server-first with narrow client islands")
    expect(bundleGate).toContain("The prescriptions landing page should stay below the paid-funnel runtime ceiling")
    expect(bundleGate).toContain("The ED landing page should not inherit broad service-funnel runtime")
    expect(bundleGate).toContain("The hair-loss landing page should not inherit broad service-funnel runtime")
  })

  it("keeps paid landing routes off the marketing barrel", () => {
    const files = [
      "app/(marketing)/page.tsx",
      "app/medical-certificate/page.tsx",
      "app/medical-certificate/[slug]/page.tsx",
      "app/prescriptions/page.tsx",
      "app/erectile-dysfunction/page.tsx",
      "app/hair-loss/page.tsx",
      "components/marketing/med-cert-landing.tsx",
      "components/marketing/prescriptions-landing.tsx",
      "components/marketing/erectile-dysfunction-landing.tsx",
      "components/marketing/hair-loss-landing.tsx",
      "components/marketing/med-cert-intent-page.tsx",
    ]

    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8")
      expect(source, file).not.toMatch(/from ["']@\/components\/marketing["']/)
      expect(source, file).not.toMatch(/from ["']@\/components\/marketing\/shared["']/)
      expect(source, file).not.toMatch(/from ["']@\/components\/sections["']/)
    }
  })

  it("keeps global CSS from importing extra render-blocking stylesheets on /request", () => {
    const globalsCss = readFileSync(join(root, "app/globals.css"), "utf8")
    // The minimal animate utilities (the tw-animate-css replacement) moved to
    // app/tailwind-shared.css with the 2026-07-04 staff CSS split — globals
    // inlines it at compile time, so no extra request-time stylesheet.
    const sharedCss = readFileSync(join(root, "app/tailwind-shared.css"), "utf8")

    expect(globalsCss).not.toContain('@import "tw-animate-css"')
    expect(sharedCss).not.toContain('@import "tw-animate-css"')
    expect(globalsCss).not.toContain("@import url(\"./print.css\")")
    expect(globalsCss).toContain("@media print")
    expect(globalsCss).toContain('@import "./tailwind-shared.css";')
    expect(sharedCss).toContain("@utility animate-in")
    expect(existsSync(join(root, "app/print.css"))).toBe(false)
  })

  it("documents the single local release command instead of split gates that miss bundle enforcement", () => {
    const checklist = readFileSync(join(root, "docs/PRODUCTION_RELEASE_CHECKLIST.md"), "utf8")

    expect(checklist).toContain("pnpm release:check")
    expect(checklist).not.toContain("- `pnpm build`")
  })
})
