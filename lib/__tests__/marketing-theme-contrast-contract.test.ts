import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function requireMatch(source: string, pattern: RegExp, label: string): string {
  const match = source.match(pattern)

  expect(match, `${label} source fragment`).not.toBeNull()
  return match?.[1] ?? ""
}

describe("marketing theme and serious-contrast contract", () => {
  it("lets the document background follow the active theme with a warm fallback", () => {
    const globals = read("app/globals.css")
    const layout = read("app/layout.tsx")
    const htmlRule = requireMatch(globals, /html\s*\{([\s\S]*?)\n\}/, "html rule")
    const bodyRule = requireMatch(globals, /body\s*\{([\s\S]*?)\n\}/, "body rule")

    expect(htmlRule).toContain("background: var(--background, #F8F7F4);")
    expect(bodyRule).toContain("background: var(--background, #F8F7F4);")
    expect(layout.match(/backgroundColor:\s*["']var\(--background, #F8F7F4\)["']/g)).toHaveLength(2)
  })

  it("exposes a stronger primary text token in both themes and Tailwind", () => {
    const globals = read("app/globals.css")
    const sharedTheme = read("app/tailwind-shared.css")

    expect(globals).toContain("--primary-strong: #1D4ED8;")
    expect(globals).toContain("--primary-strong: var(--primary);")
    expect(sharedTheme).toContain("--color-primary-strong: var(--primary-strong);")
  })

  it("pins primary-strong to the canonical design docs and unreleased changelog", () => {
    const design = read("DESIGN.md")
    const changelog = read("docs/DESIGN_SYSTEM_CHANGELOG.md")

    expect(design).toContain("--primary-strong: #1D4ED8;")
    expect(design).toContain("`text-primary-strong`")
    expect(design).toContain("small text on primary tints")
    expect(changelog).toMatch(/^# Design System Changelog/)
    expect(changelog.indexOf("## [Unreleased]")).toBeLessThan(changelog.indexOf("## [2.0.2]"))
    expect(changelog).toContain("`--primary-strong` / `text-primary-strong`")
  })

  it("uses primary-strong for the shared AHPRA badge and repeated pricing badges", () => {
    const sources = [
      "components/marketing/sections/doctor-profile-section.tsx",
      "components/marketing/womens-health-landing.tsx",
      "components/marketing/prescriptions-landing.tsx",
      "components/marketing/hair-loss-landing.tsx",
    ].map(read)

    for (const source of sources) {
      expect(source).toContain("text-primary-strong")
    }

    expect(sources[0]).toContain('className="text-xs font-medium text-primary-strong"')
    for (const pricingSource of sources.slice(1)) {
      expect(pricingSource).toMatch(/text-\[11px\][^"\n]*bg-primary\/10 text-primary-strong border border-primary\/20/)
    }
  })

  it("keeps the consult coming-soon treatment muted without fading its text", () => {
    const consult = read("app/consult/page.tsx")

    expect(consult).toContain("border-dashed border-border/60 bg-muted/20 p-5")
    expect(consult).not.toContain("bg-muted/20 p-5 opacity-80")
  })

  it("keeps the hero doctor primary card entrance transform-only", () => {
    const heroDoctor = read("components/marketing/hero-doctor-review-mockup.tsx")
    const primaryCardOpening = requireMatch(
      heroDoctor,
      /\/\* Primary card \*\/\}\s*<motion\.div([\s\S]*?)>/,
      "hero doctor primary card",
    )

    expect(primaryCardOpening).toContain("initial={animate ? { y: 16 } : {}}")
    expect(primaryCardOpening).not.toContain("opacity")
  })

  it("does not fade the med-cert delivery confirmation through low contrast", () => {
    const medCertMockup = read("components/marketing/mockups/med-cert-hero-mockup.tsx")
    const deliveryOpening = requireMatch(
      medCertMockup,
      /\{!compact && \(\s*<div([\s\S]*?)>\s*<div className="flex items-center gap-2\.5">/,
      "med-cert delivery confirmation",
    )

    expect(deliveryOpening).not.toContain("hero-fade-up")
    expect(deliveryOpening).not.toContain("opacity")
  })
})
