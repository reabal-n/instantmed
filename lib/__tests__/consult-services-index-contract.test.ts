/**
 * /consult page contract.
 *
 * After PR1b (2026-05-25), /consult is the canonical detailed services index
 * (was a thin services-overview before, was the General Consult landing page
 * before that). Each active service gets a substantive block with
 * a CTA; gated services render as greyed coming-soon cards.
 *
 * Pinned here:
 *   - All active services are listed by name + correct href
 *   - "General consult" copy is gone from the FAQ
 *   - The "Not finding your concern?" amber alert block is gone
 *   - Per-service MedicalServiceSchema renders (better SEO than one umbrella)
 *   - Weight Management remains the only coming-soon card
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("/consult services index contract", () => {
  it("lists all active services with their canonical href (incl. women's health, live 2026-06-15)", () => {
    const source = read("app/consult/page.tsx")
    expect(source).toContain('name: "Medical certificate"')
    expect(source).toContain('href: "/request?service=med-cert"')
    expect(source).toContain('name: "Repeat prescription"')
    expect(source).toContain('href: "/request?service=prescription"')
    expect(source).toContain('name: "ED assessment"')
    expect(source).toContain('href: "/request?service=consult&subtype=ed"')
    expect(source).toContain('name: "Hair loss assessment"')
    expect(source).toContain('href: "/request?service=consult&subtype=hair_loss"')
    expect(source).toContain('name: "Women\'s health"')
    expect(source).toContain('href: "/request?service=consult&subtype=womens_health"')
  })

  it("keeps consult metadata and visible copy synced with the active service set", () => {
    const source = read("app/consult/page.tsx")

    expect(source).toContain('canonical: "https://instantmed.com.au/consult"')
    expect(source).toContain("women's health")
    expect(source).toContain("Medical certificates, repeat prescriptions, ED, hair loss, and women's health assessments")
    expect(source).toContain("We treat focused services, properly.")
    expect(source).not.toContain("We treat four things")
  })

  it("uses the canonical public shell and an absolute document title", () => {
    const source = read("app/consult/page.tsx")
    const mainTag =
      '<main aria-label="Online doctor services" className="min-w-0 bg-background">'

    expect(source).toContain(
      'title: { absolute: "Online Doctor Services in Australia | InstantMed" }',
    )
    expect(source).toContain('<Navbar variant="marketing" />')
    expect(source).toContain(mainTag)
    expect(source).toContain("<Footer />")
    expect(source.indexOf('<Navbar variant="marketing" />')).toBeLessThan(
      source.indexOf(mainTag),
    )
    expect(source.indexOf(mainTag)).toBeLessThan(source.indexOf("<Footer />"))
  })

  it("keeps women's health scope narrow and routes same-pill repeats away from the consult promise", () => {
    const source = read("app/consult/page.tsx")

    expect(source).toContain("start or switch the contraceptive pill")
    expect(source).not.toContain("start, switch, or continue the contraceptive pill")
  })

  it("does not hide possible prescribing calls behind retired interruption copy", () => {
    const source = read("app/consult/page.tsx")

    expect(source).toContain("may call you briefly before deciding")
    expect(source).not.toContain("We only call if something clinically important is missing")
  })

  it("keeps weight management as the only coming-soon card (women's health is now live)", () => {
    const source = read("app/consult/page.tsx")
    expect(source).toContain('id: "weight_loss"')
    expect(source).toContain("Coming soon")
    // women's health was promoted out of the coming-soon array.
    expect(source).not.toContain('id: "womens_health"')
    // No General Consult option (retired). The history comment mentions it
    // intentionally so the diff is searchable.
    const withoutComment = source.split("\n").filter((l) => !l.trim().startsWith("*")).join("\n")
    expect(withoutComment).not.toMatch(/General consult|General consultation/i)
  })

  it("renders a per-service MedicalServiceSchema (not a single umbrella one)", () => {
    const source = read("app/consult/page.tsx")
    expect(source).toContain("services.map((service) => (")
    expect(source).toContain("MedicalServiceSchema")
    // The umbrella schema with a fixed price ("19.95") was retired in favour
    // of per-service entries that match each card's price.
    expect(source).not.toMatch(/MedicalServiceSchema[\s\S]*?name="Online Doctor Services"/)
  })

  it("does not promise a fixed review time (per ADVERTISING_COMPLIANCE.md SLA rule)", () => {
    const source = read("app/consult/page.tsx")
    expect(source).not.toMatch(/1[-–]2\s*hours?/i)
    expect(source).not.toMatch(/within (an?|1) hour/i)
    expect(source).not.toMatch(/same[- ]day\s*(review|service|access|turnaround)/i)
    // Availability copy states cadence, not duration ("7 days a week" — the
    // "AEST hours" framing was retired 2026-07-10; the service is 24/7 and a
    // window claim contradicted the hours-copy contract).
    expect(source).toContain("7 days a week")
    expect(source).not.toContain("AEST hours")
  })

  it("trimmed the retired General Consult copy from the FAQ", () => {
    const source = read("app/consult/page.tsx")
    expect(source).not.toContain("Why don't you offer a general consult anymore?")
    expect(source).not.toContain("general consults, weight loss treatment, or women's health treatment")
  })

  it("dropped the amber 'Not finding your concern?' alert in favour of a single quiet line", () => {
    const source = read("app/consult/page.tsx")
    expect(source).not.toContain("bg-amber-100")
    expect(source).not.toContain("Not finding your concern?")
    // Replacement is a single calm sentence.
    expect(source).toContain("Outside our scope?")
  })

  it("no em-dashes (operator preference)", () => {
    const source = read("app/consult/page.tsx")
    expect(source).not.toContain("—") // U+2014 em dash
  })
})
