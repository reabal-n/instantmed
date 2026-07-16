import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

/**
 * Pricing-display centralisation guard.
 *
 * These surfaces describe InstantMed's OWN service prices and must read them
 * from PRICING_DISPLAY (lib/constants), never hardcode them — so a price change
 * (e.g. the floor-price test concluding) is a one-constant edit, not a sweep.
 * The 2026-06-09 floor change required editing ~78 strings across these files;
 * this test stops them being reintroduced.
 *
 * Scoped to the files swept on 2026-06-11. NOT applied to competitor-comparison
 * data (legitimately carries rival prices), MDX (can't import constants), dev
 * preview, or tests.
 */

// SKU price values that belong to PRICING_DISPLAY. Any of these appearing as a
// literal in a guarded file means someone hardcoded an own-service price.
const SKU_PRICE_LITERAL = /\$(?:19|24|29|39|49|59|89|9)\.95\b/

const GUARDED_FILES = [
  "app/consult/page.tsx",
  "app/pricing/pricing-content.tsx",
  "lib/marketing/service-decisions.ts",
  "lib/marketing/med-cert-intent-config.ts",
  "lib/seo/data/audience-pages.ts",
  "lib/data/med-cert-faq.ts",
  "lib/data/ed-faq.ts",
  "lib/data/hair-loss-faq.ts",
  "lib/seo/data/states.ts",
]

const MONEY_PAGE_FILES = [
  "app/medical-certificate/page.tsx",
  "app/prescriptions/page.tsx",
  "app/erectile-dysfunction/page.tsx",
  "app/hair-loss/page.tsx",
  "app/womens-health/page.tsx",
  "app/uti-assessment-online/page.tsx",
  "app/contraceptive-pill-assessment-online/page.tsx",
  "components/marketing/med-cert-intent-page.tsx",
]

describe("pricing-display centralisation guard", () => {
  for (const rel of GUARDED_FILES) {
    it(`${rel} hardcodes no own-service SKU price (use PRICING_DISPLAY)`, () => {
      const source = readFileSync(join(process.cwd(), rel), "utf-8")
      const offenders = source
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => SKU_PRICE_LITERAL.test(line) && !line.trimStart().startsWith("//"))
        .map(({ line, n }) => `  ${rel}:${n}  ${line.trim().slice(0, 100)}`)

      expect(
        offenders,
        `Hardcoded SKU price(s) found — use PRICING_DISPLAY.* instead:\n${offenders.join("\n")}`,
      ).toEqual([])
    })
  }

  it("keeps pricing schema ownership explicit and non-duplicative", () => {
    const layout = readFileSync(join(process.cwd(), "app/pricing/layout.tsx"), "utf-8")
    const page = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf-8")

    expect(layout).toContain("root OrganizationSchema owns the catalog-wide five-service OfferCatalog")
    expect(layout).toContain("visible pricing inventory still derives from SERVICE_CATALOG")
    expect(layout).toContain("<BreadcrumbSchema")
    expect(layout).not.toContain("<FAQSchema")
    expect(layout).not.toContain("<MedicalServiceSchema")
    expect(page).toBe(
      'import { PricingContent } from "./pricing-content"\n\nexport default function PricingPage() {\n  return <PricingContent />\n}\n',
    )
  })

  it.each(MONEY_PAGE_FILES)(
    "%s uses canonical display and schema price strings",
    (rel) => {
      const source = readFileSync(join(process.cwd(), rel), "utf-8")

      expect(source).not.toMatch(/PRICING\.[A-Z_]+\.toFixed\(2\)/)
    },
  )

  it("keeps service catalog numeric prices tied to PRICING", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/services/service-catalog.ts"),
      "utf-8",
    )

    expect(source).toContain('import { PRICING, PRICING_DISPLAY } from "@/lib/constants"')
    expect(source).not.toMatch(/priceFrom: (?:24|29|39|49|59|89|9)\.95/)
    expect(source).toContain("priceFrom: PRICING.MED_CERT")
    expect(source).toContain("priceFrom: PRICING.REPEAT_SCRIPT")
    expect(source).toContain("priceFrom: PRICING.MENS_HEALTH")
    expect(source).toContain("priceFrom: PRICING.HAIR_LOSS")
    expect(source).toContain("priceFrom: PRICING.WOMENS_HEALTH")
  })
})
