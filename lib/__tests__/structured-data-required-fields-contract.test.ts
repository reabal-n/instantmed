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
})
