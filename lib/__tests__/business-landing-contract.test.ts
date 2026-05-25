/**
 * /business B2B landing contract.
 *
 * PR3 (2026-05-25) ships the corporate med-cert wedge: a public landing
 * page at /business with hero, value props, how-it-works, pricing tiers,
 * and a lead-capture form that pipes into the existing contact-form
 * action with reason='B2B / Corporate'.
 *
 * Pinned here so the wedge can't silently regress while we're acquiring
 * the first paying B2B customers.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string): string => readFileSync(join(root, path), "utf8")

describe("/business B2B landing contract", () => {
  it("the page + the lead form file both exist", () => {
    expect(existsSync(join(root, "app/business/page.tsx"))).toBe(true)
    expect(existsSync(join(root, "app/business/business-lead-form.tsx"))).toBe(true)
  })

  it("the page is a server component (async export) with an awaited wait state", () => {
    const source = read("app/business/page.tsx")
    expect(source).toContain("export default async function BusinessLandingPage")
    expect(source).toContain("await getWaitState()")
  })

  it("the page renders three pricing tiers (Starter / Growth / Enterprise)", () => {
    const source = read("app/business/page.tsx")
    expect(source).toContain('name: "Starter"')
    expect(source).toContain('name: "Growth"')
    expect(source).toContain('name: "Enterprise"')
    expect(source).toContain("highlight: true") // Growth is the recommended tier
  })

  it("the page renders MedicalServiceSchema + FAQSchema + BreadcrumbSchema for SEO", () => {
    const source = read("app/business/page.tsx")
    expect(source).toContain("MedicalServiceSchema")
    expect(source).toContain("FAQSchema")
    expect(source).toContain("BreadcrumbSchema")
  })

  it("the lead form pipes into the existing contact-form action with reason='B2B / Corporate'", () => {
    const source = read("app/business/business-lead-form.tsx")
    expect(source).toContain("submitContactForm")
    expect(source).toContain('"B2B / Corporate"')
    expect(source).toContain('capture("business_lead_submitted"')
  })

  it("the lead form collects the 4 essential B2B fields", () => {
    const source = read("app/business/business-lead-form.tsx")
    expect(source).toContain('name="company"')
    expect(source).toContain('name="name"')
    expect(source).toContain('name="email"')
    expect(source).toContain('teamSize')
  })

  it("the page does not promise a fixed review time (ADVERTISING_COMPLIANCE.md SLA rule)", () => {
    const source = read("app/business/page.tsx")
    expect(source).not.toMatch(/1[-–]2\s*hours?/i)
    expect(source).not.toMatch(/within (an?|1) hour/i)
    expect(source).not.toMatch(/same[- ]day\s*(review|service|access|turnaround)/i)
  })

  it("the page has no em-dashes (operator preference)", () => {
    const sources = [
      read("app/business/page.tsx"),
      read("app/business/business-lead-form.tsx"),
    ]
    for (const source of sources) {
      expect(source).not.toContain("—") // U+2014 em dash
    }
  })

  it("/business is linked from the footer Company column", () => {
    const homepage = read("lib/marketing/homepage.ts")
    expect(homepage).toContain('label: "For Business", href: "/business"')
  })
})
