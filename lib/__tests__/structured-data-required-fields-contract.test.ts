import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

/**
 * Regression guard for the 2026-06-22 structured-data fix (Semrush flagged 71
 * "markup errors" — Offers missing price/priceCurrency site-wide + Drug entities
 * missing the required `name`). These are silent schema gaps that hurt rich
 * results + GEO extraction, so pin the required fields.
 */
describe("structured-data required fields", () => {
  it("OrganizationSchema OfferCatalog Offers carry price + priceCurrency", () => {
    const src = read("components/seo/schemas/organization.tsx")
    const offerCount = (src.match(/"@type":\s*"Offer"/g) || []).length
    const priceCount = (src.match(/priceCurrency:\s*"AUD"/g) || []).length
    expect(offerCount).toBeGreaterThan(0)
    // every Offer must declare priceCurrency (and a price alongside it)
    expect(priceCount).toBe(offerCount)
    expect(src).toMatch(/price:\s*PRICING\./)
  })

  it("MedicalConditionSchema Drug entities carry a name", () => {
    const src = read("components/seo/schemas/medical-condition.tsx")
    // The Drug entity block must set `name` (Thing.name) — required by validators.
    expect(src).toContain('"@type": "Drug"')
    expect(src).toMatch(/\bname:\s*med\.(genericName|brandNames)/)
  })

  it("Organization + MedicalBusiness emit sameAs entity links", () => {
    // sameAs is the primary entity-linking signal answer engines use to resolve
    // and cite "InstantMed". Pin it so a schema refactor can't silently drop the
    // identity anchors.
    const org = read("components/seo/schemas/organization.tsx")
    const biz = read("components/seo/schemas/medical-business.tsx")
    const sameAs = read("components/seo/schemas/same-as.ts")

    expect(org).toContain("sameAs: SAME_AS_PROFILES")
    expect(biz).toContain("sameAs: SAME_AS_PROFILES")
    // Both homepage org nodes must share one @id so they resolve to one entity.
    expect(biz).toMatch(/"@id":\s*`\$\{baseUrl\}\/#organization`/)

    // Authoritative identity anchors must stay present.
    expect(sameAs).toContain("abr.business.gov.au")
    expect(sameAs).toContain("legitscript.com")
  })
})
