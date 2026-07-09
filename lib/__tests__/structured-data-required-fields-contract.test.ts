import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  getAvailableServices,
  getServiceOffers,
} from "@/components/seo/schemas/service-offerings"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

/**
 * Regression guard for the 2026-06-22 structured-data fix (Semrush flagged 71
 * "markup errors" — Offers missing price/priceCurrency site-wide + Drug entities
 * missing the required `name`). These are silent schema gaps that hurt rich
 * results + GEO extraction, so pin the required fields.
 */
describe("structured-data required fields", () => {
  it("every derived service Offer carries price + priceCurrency + itemOffered", () => {
    // Offers are derived from the live SERVICE_CATALOG (getServiceOffers). Assert
    // the shape behaviorally so the Semrush "Offer missing price/priceCurrency"
    // fix can't regress and the catalog stays in the entity graph.
    const offers = getServiceOffers("https://instantmed.com.au")
    // 5 active services: med cert, repeat rx, ED, hair loss, women's health.
    expect(offers.length).toBeGreaterThanOrEqual(5)
    for (const offer of offers) {
      expect(offer.price).toMatch(/^\d+\.\d{2}$/)
      expect(offer.priceCurrency).toBe("AUD")
      expect(offer.itemOffered.name.length).toBeGreaterThan(0)
      expect(offer.itemOffered.description.length).toBeGreaterThan(0)
    }
  })

  it("entity graph exposes all 5 live services incl. women's health (2026-06-15 launch)", () => {
    // Regression guard for the drift this file's refactor fixed: women's health +
    // the specialty pathways were missing from hasOfferCatalog / availableService,
    // so answer engines believed InstantMed only did med certs + repeat scripts.
    const offerNames = getServiceOffers("https://instantmed.com.au").map(
      (o) => o.itemOffered.name,
    )
    const procedureNames = getAvailableServices().map((p) => p.name)
    for (const name of ["Medical Certificate", "Repeat Prescription", "Erectile Dysfunction", "Hair Loss", "Women's Health"]) {
      expect(offerNames).toContain(name)
      expect(procedureNames).toContain(name)
    }
    // Weight loss is a gated/coming-soon service — must NOT be advertised as live.
    expect(offerNames).not.toContain("Weight management")
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
