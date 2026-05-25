/**
 * /consult page contract.
 *
 * After PR1b (2026-05-25), /consult is the canonical detailed services index
 * (was a thin services-overview before, was the General Consult landing page
 * before that). Each of the 4 active services gets a substantive block with
 * a CTA; 2 gated services render as greyed coming-soon cards.
 *
 * Pinned here:
 *   - All 4 active services are listed by name + correct href
 *   - "General consult" copy is gone from the FAQ
 *   - The "Not finding your concern?" amber alert block is gone
 *   - Per-service MedicalServiceSchema renders (better SEO than one umbrella)
 *   - Coming-soon cards render Women's Health + Weight Management
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("/consult services index contract", () => {
  it("lists all four active services with their canonical href", () => {
    const source = read("app/consult/page.tsx")
    expect(source).toContain('name: "Medical certificate"')
    expect(source).toContain('href: "/request?service=med-cert"')
    expect(source).toContain('name: "Repeat prescription"')
    expect(source).toContain('href: "/request?service=prescription"')
    expect(source).toContain('name: "ED assessment"')
    expect(source).toContain('href: "/request?service=consult&subtype=ed"')
    expect(source).toContain('name: "Hair loss assessment"')
    expect(source).toContain('href: "/request?service=consult&subtype=hair_loss"')
  })

  it("renders coming-soon cards for women's health + weight management (not 'general')", () => {
    const source = read("app/consult/page.tsx")
    expect(source).toContain('id: "womens_health"')
    expect(source).toContain('id: "weight_loss"')
    expect(source).toContain("Coming soon")
    // No General Consult option in coming-soon (it was retired). The
    // history comment mentions it intentionally so the diff is searchable.
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
    // "Reviewed during AEST hours" is allowed — it states when, not how long.
    expect(source).toContain("AEST hours")
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
