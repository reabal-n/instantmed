import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function firstDescriptionListAfter(source: string, marker: string): string {
  const markerIndex = source.indexOf(marker)
  const start = source.indexOf("<dl", markerIndex)
  const end = source.indexOf("</dl>", start)

  expect(markerIndex).toBeGreaterThanOrEqual(0)
  expect(start).toBeGreaterThan(markerIndex)
  expect(end).toBeGreaterThan(start)

  return source.slice(start, end + "</dl>".length)
}

describe("money-page narrative compression", () => {
  it("keeps pricing to one service decision, one fee ledger, and one setting comparison", () => {
    const pricing = read("app/pricing/pricing-content.tsx")

    expect(pricing).toContain('href="#pricing-cards"')
    expect(pricing).toContain("Australia only")
    expect(pricing).toContain("18+")
    expect(pricing).toContain("Fees from ${PRICING_DISPLAY.MED_CERT} AUD")
    expect(pricing).toContain("CLINICAL_REVIEW_SEQUENCE")
    expect(pricing).toContain("Medicare")
    expect(pricing).toContain('<ServiceDecisionBoard id="pricing-cards"')
    expect(pricing).toContain("<FeeCoverageLedger />")
    expect(pricing).toContain("<ComparisonTable")

    for (const retiredSection of [
      "GoogleReviewsBadge",
      "ServiceClaimSection",
      "CommercialIntentLinksSection",
      "DoctorCredibility",
      "ComparisonBar",
      "PricingGuideSection",
      "PricingFactsBlock",
      "PricingEvidenceLinks",
      "CompetitorLinksSection",
      "RegulatoryPartners",
    ]) {
      expect(pricing).not.toContain(retiredSection)
    }
  })

  it("keeps disabled and contact-dependent hero claims internally consistent", () => {
    const hair = read("components/marketing/hair-loss-landing.tsx")
    const medCert = read("components/marketing/med-cert-landing.tsx")

    expect(hair).toContain('text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.HAIR_LOSS}`')
    expect(hair).toContain('href: isDisabled ? "/contact" : ASSESSMENT_HREF')
    expect(medCert).toContain("For suitable form-only requests: {MED_CERT_WEDGE}")
    expect(medCert).not.toMatch(/^\s*\{MED_CERT_WEDGE\} Tell us/m)
  })

  it("keeps fact-panel description lists structurally valid", () => {
    const ed = read("components/marketing/erectile-dysfunction-landing.tsx")
    const hair = read("components/marketing/hair-loss-landing.tsx")
    const women = read("components/marketing/womens-health-landing.tsx")
    const descriptionLists = [
      firstDescriptionListAfter(ed, "The practical facts"),
      firstDescriptionListAfter(hair, "function HairHeroFacts"),
      firstDescriptionListAfter(hair, "function HairAssessmentModel"),
      firstDescriptionListAfter(women, "function WomensHealthCommonFacts"),
    ]

    for (const list of descriptionLists) {
      expect(list).not.toMatch(/<div[^>]*>\s*<span/)
      expect(list).not.toMatch(/<div[^>]*>\s*<div/)
      expect(list).toContain("<dt")
      expect(list).toContain("<dd")
    }
  })

  it("keeps one authoritative ED urgent-care boundary", () => {
    const ed = read("components/marketing/erectile-dysfunction-landing.tsx")

    expect(ed.match(/Call 000 for chest pain/g)).toHaveLength(1)
    expect(ed).toContain("Safety answers can change the care route")
  })
})
