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
})
