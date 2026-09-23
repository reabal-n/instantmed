import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("landing hero contract (19 Sep 2026 audit)", () => {
  const hero = read("components/marketing/hero.tsx")

  it("keeps attributed reviews separate from operational status", () => {
    expect(hero).toContain('data-hero-reviews=""')
    expect(hero).toContain('<ProductReviewBadge />')
    expect(hero).not.toContain('buildDefaultPill')
  })

  it("leaves certification marks in the footer", () => {
    expect(hero).not.toContain('GoogleAdsCert')
    expect(hero).not.toContain('LegitScriptSeal')
    const footer = read("components/shared/footer.tsx")
    expect(footer).toContain('GoogleAdsCert')
    expect(footer).toContain('LegitScriptSeal')
  })

  it("keeps display headlines unhyphenated inside the hero", () => {
    expect(hero).toMatch(/<Heading[\s\S]*?level="display"[\s\S]*?hyphens-none/)
  })

  it("shows the live wait counter on phones too", () => {
    expect(hero).not.toMatch(/hidden sm:inline-flex">\s*<WaitCounter/)
  })

  it("gates homepage certificate timing with certificate availability", () => {
    const homepage = read("app/(marketing)/page.tsx")
    expect(homepage).toMatch(/<Hero\b[^>]*availabilityServiceId="med-cert"/)
    expect(hero).toContain('<ServiceAvailabilityGate serviceId={availabilityServiceId}>')
  })

  it("marks the hero section for geometry gates", () => {
    expect(hero).toContain('data-hero=""')
  })
})
