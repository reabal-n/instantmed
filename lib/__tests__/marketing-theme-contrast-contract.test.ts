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

  it("uses the night-sky foreground on dark primary surfaces", () => {
    const globals = read("app/globals.css")
    const sharedTheme = read("app/tailwind-shared.css")
    const design = read("DESIGN.md")
    const changelog = read("docs/DESIGN_SYSTEM_CHANGELOG.md")
    const darkTheme = requireMatch(globals, /\.dark\s*\{([\s\S]*?)\n\}/, "dark theme")

    expect(darkTheme).toContain("--primary: #5DB8C9;")
    expect(darkTheme).toContain("--primary-foreground: #0B1120;")
    expect(sharedTheme).toContain("--color-primary-foreground: var(--primary-foreground);")
    expect(globals).toContain("@layer base {\n  /* Rich text dark mode")
    expect(globals).toContain("  :where(.dark [data-marketing]) {")
    expect(design).toContain("Dark primary foreground: `#0B1120`")
    expect(changelog).toContain("dark `--primary-foreground` to `#0B1120`")
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
    const doctorProfile = read("components/marketing/sections/doctor-profile-section.tsx")
    const pricingSources = [
      read("components/marketing/womens-health-landing.tsx"),
      read("components/marketing/hair-loss-landing.tsx"),
    ]
    const prescription = read("components/marketing/prescriptions-landing.tsx")

    expect(doctorProfile).toContain('className="text-xs font-medium text-primary-strong"')
    for (const pricingSource of pricingSources) {
      expect(pricingSource).toMatch(/text-\[11px\][^"\n]*bg-primary\/10 text-primary-strong border border-primary\/20/)
    }
    expect(prescription).toContain("text-xs font-medium text-primary-strong")
  })

  it("keeps the active consult decision board legible without fading its text", () => {
    const decisions = read("components/marketing/service-decision-board.tsx")

    expect(decisions).toContain("bg-muted/35")
    expect(decisions).toContain("text-muted-foreground")
    expect(decisions).not.toMatch(/bg-muted\/35[^"\n]*opacity-/)
  })

  it("keeps the hero doctor primary card entrance transform-only", () => {
    const heroDoctor = read("components/marketing/hero-doctor-review-mockup.tsx")
    const primaryCardOpening = requireMatch(
      heroDoctor,
      /\/\* Primary card \*\/\}\s*<motion\.div([\s\S]*?)>/,
      "hero doctor primary card",
    )

    expect(primaryCardOpening).toContain('initial={animate ? "hidden" : "reduced"}')
    expect(primaryCardOpening).toContain("animate={entranceControls}")
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

  it("keeps the decorative med-cert specimen legible in dark mode", () => {
    const medCertMockup = read("components/marketing/mockups/med-cert-hero-mockup.tsx")

    expect(medCertMockup).toMatch(
      /aria-hidden="true"[\s\S]*?Specimen/,
    )
    expect(medCertMockup).toContain("dark:text-white/60")
    expect(medCertMockup).not.toMatch(/dark:text-white\/(?:40|45)/)
  })

  it("uses the theme foreground token for the med-cert primary mark", () => {
    const medCertMockup = read("components/marketing/mockups/med-cert-hero-mockup.tsx")
    const primaryMark = requireMatch(
      medCertMockup,
      /<div className="w-7 h-7 rounded-md bg-primary[^"]*">([\s\S]*?)<\/div>/,
      "med-cert primary mark",
    )

    expect(primaryMark).toContain("text-primary-foreground")
    expect(primaryMark).not.toContain("text-white")
  })

  it("uses a dark-safe Stripe brand treatment on checkout trust badges", () => {
    const trustBadges = read("components/checkout/trust-badges.tsx")
    const globals = read("app/globals.css")

    expect(trustBadges.match(/text-\[var\(--stripe-brand\)\]/g)).toHaveLength(2)
    expect(globals).toContain("--stripe-brand: #4F46E5;")
    expect(globals).toContain("--stripe-brand: #A5A1FF;")
  })
})
