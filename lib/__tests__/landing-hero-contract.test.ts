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

  it("shows certification marks in every hero and keeps them in the footer (operator decision 2026-09-25)", () => {
    expect(hero).toContain('<HeroCertifications')
    expect(hero).toContain('showCertifications = true')
    const marks = read("components/marketing/hero-certifications.tsx")
    expect(marks).toContain('data-hero-trust-row=""')
    expect(marks).toContain('<LegitScriptSeal size="xs" />')
    expect(marks).toContain('<GoogleAdsCert')
    // Bespoke SEO landing heroes carry the same marks.
    for (const page of ["medical-certificate-online", "mens-health", "mental-health-online", "online-prescriptions", "uti-assessment", "weight-loss-online"]) {
      expect(read(`components/marketing/${page}-landing.tsx`)).toContain("<HeroCertifications")
    }
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
    expect(homepage).toMatch(/<Hero\b[^>]*timingServiceId="med-cert"/)
    expect(hero).toContain('<ServiceAvailabilityGate serviceId={timingServiceId ?? availabilityServiceId}>')
  })

  it("marks the hero section for geometry gates", () => {
    expect(hero).toContain('data-hero=""')
  })
})
