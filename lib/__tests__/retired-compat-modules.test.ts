import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readSources(dir: string): Array<{ path: string; source: string }> {
  const entries = readdirSync(dir)
  const sources: Array<{ path: string; source: string }> = []

  for (const entry of entries) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      sources.push(...readSources(path))
      continue
    }

    if (/\.(ts|tsx|md)$/.test(entry)) {
      sources.push({ path, source: readFileSync(path, "utf8") })
    }
  }

  return sources
}

describe("retired compatibility modules", () => {
  it("removes the unused root status re-export", () => {
    expect(existsSync(join(root, "lib/status.ts"))).toBe(false)

    for (const { path, source } of readSources(join(root, "app")).concat(readSources(join(root, "components")))) {
      expect(source, path).not.toContain("@/lib/status")
      expect(source, path).not.toContain("lib/status.ts")
    }
  })

  it("uses RegulatoryPartners instead of the old MediaMentions alias and filename", () => {
    expect(existsSync(join(root, "components/marketing/media-mentions.tsx"))).toBe(false)
    expect(existsSync(join(root, "components/marketing/regulatory-partners.tsx"))).toBe(true)

    const marketingBarrel = readFileSync(join(root, "components/marketing/index.ts"), "utf8")
    expect(marketingBarrel).not.toContain("MediaMentions")
    expect(marketingBarrel).not.toContain("media-mentions")

    for (const { path, source } of readSources(join(root, "app")).concat(readSources(join(root, "components")))) {
      if (path.endsWith("components/marketing/regulatory-partners.tsx")) continue
      expect(source, path).not.toContain("MediaMentions")
      expect(source, path).not.toContain("media-mentions")
    }
  })

  it("names the marketing footer wrapper explicitly", () => {
    expect(existsSync(join(root, "components/marketing/footer.tsx"))).toBe(false)
    expect(existsSync(join(root, "components/marketing/marketing-footer.tsx"))).toBe(true)

    const marketingBarrel = readFileSync(join(root, "components/marketing/index.ts"), "utf8")
    expect(marketingBarrel).toContain("./marketing-footer")
    expect(marketingBarrel).not.toContain("./footer")

    for (const { path, source } of readSources(join(root, "app")).concat(readSources(join(root, "components/marketing")))) {
      if (path.endsWith("components/marketing/marketing-footer.tsx")) continue
      expect(source, path).not.toContain("@/components/marketing/footer")
      expect(source, path).not.toContain("from './footer'")
      expect(source, path).not.toContain('from "./footer"')
    }
  })

  it("keeps the retired dev cert-preview route out of the app tree", () => {
    expect(existsSync(join(root, "app/(dev)/cert-preview/route.ts"))).toBe(false)

    const middleware = readFileSync(join(root, "middleware.ts"), "utf8")
    expect(middleware).toContain('"/cert-preview"')
  })

  it("keeps retired test-only ops diagnostics out of the app and e2e trees", () => {
    expect(existsSync(join(root, "app/api/test/edge-canary/route.ts"))).toBe(false)
    expect(existsSync(join(root, "e2e/admin-crash-diagnostic.spec.ts"))).toBe(false)
  })

  it("keeps the /api/test surface explicit and limited to active e2e contracts", () => {
    const testApiRoot = join(root, "app/api/test")
    const routePaths = readSources(testApiRoot)
      .map(({ path }) => path.replace(`${root}/`, ""))
      .filter((path) => path.endsWith("/route.ts"))
      .sort()

    expect(routePaths).toEqual([
      "app/api/test/boom-500/route.ts",
      "app/api/test/boom/route.ts",
      "app/api/test/login/route.ts",
      "app/api/test/medcert-auto-approve/route.ts",
    ])
  })

  it("keeps dev-only surfaces fail-closed in production and preview", () => {
    const middleware = readFileSync(join(root, "middleware.ts"), "utf8")

    for (const prefix of ["/api/test", "/email-preview", "/sentry-test", "/cert-preview"]) {
      expect(middleware).toContain(`"${prefix}"`)
    }
    expect(middleware).toContain("DEV_ONLY_ROUTE_PREFIXES")
    expect(middleware).toContain("isVercelProdOrPreview")
    expect(middleware).toContain('process.env.PLAYWRIGHT === "1"')
    expect(middleware).toContain("status: 410")
  })
})
