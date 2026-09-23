import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("landing hero contract (19 Sep 2026 audit)", () => {
  const hero = read("components/marketing/hero.tsx")

  it("renders stars only inside the ProductReview badge", () => {
    // The old pill drew five bare stars next to "AHPRA-registered doctors",
    // which reads as a doctor rating. Stars belong to the ProductReview mark.
    expect(hero).not.toMatch(/\[1, 2, 3, 4, 5\]\.map/)
    expect(hero).not.toContain('aria-label="Google star rating"')
    const pillStart = hero.indexOf("function buildDefaultPill")
    const pillEnd = hero.indexOf("const DEFAULT_TITLE")
    expect(pillStart).toBeGreaterThan(-1)
    expect(hero.slice(pillStart, pillEnd)).toContain('<ProductReviewBadge />')
  })

  it("keeps the trust row to two marks on one row", () => {
    const trustStart = hero.indexOf("const DEFAULT_TRUST_ROW")
    const trustEnd = hero.indexOf("export function Hero")
    const trustRow = hero.slice(trustStart, trustEnd)
    expect(trustRow).toContain("<GoogleAdsCert")
    expect(trustRow).toContain("<LegitScriptSeal")
    expect(trustRow).not.toContain("ProductReviewBadge")
    expect(hero).toContain('data-hero-trust-row=""')
  })

  it("exposes a pillLabel so service pages keep the shared pill", () => {
    expect(hero).toContain("pillLabel?: string")
    expect(hero).toContain('pillLabel = "AHPRA-registered doctors"')
  })

  it("keeps display headlines unhyphenated inside the hero", () => {
    expect(hero).toMatch(/<Heading[\s\S]*?level="display"[\s\S]*?"hyphens-none"/)
  })

  it("shows the live wait counter on phones too", () => {
    expect(hero).not.toMatch(/hidden sm:inline-flex">\s*<WaitCounter/)
  })

  it("marks the hero section for geometry gates", () => {
    expect(hero).toContain('data-hero=""')
  })
})
