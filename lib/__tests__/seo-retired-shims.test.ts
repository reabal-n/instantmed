import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("retired SEO compatibility shims", () => {
  it("removes the disabled RelatedPages null component from the SEO barrel", () => {
    expect(existsSync(join(root, "components/seo/related-pages.tsx"))).toBe(false)

    const seoBarrel = readFileSync(join(root, "components/seo/index.ts"), "utf8")
    expect(seoBarrel).not.toContain("RelatedPages")
    expect(seoBarrel).not.toContain("related-pages")
  })
})
