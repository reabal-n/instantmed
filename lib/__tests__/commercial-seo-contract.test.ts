import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  commercialCertificateLinks,
  commercialComparisonLinks,
  commercialPrescriptionLinks,
} from "@/lib/seo/commercial-links"
import { commercialSeoVisualList } from "@/lib/seo/commercial-visuals"
import { intentPages } from "@/lib/seo/intents"

const ROOT = process.cwd()

const EXPECTED_TOP_25_SLUGS = [
  "same-day-medical-certificate",
  "medical-certificate-for-work",
  "online-sick-certificate",
  "one-day-medical-certificate",
  "two-day-medical-certificate",
  "medical-certificate-for-cold-and-flu",
  "medical-certificate-for-mental-health-day",
  "carers-leave-certificate-online",
  "student-medical-certificate-online",
  "medical-certificate-for-shift-workers",
  "medical-certificate-online-sydney",
  "medical-certificate-online-melbourne",
  "medical-certificate-online-brisbane",
  "medical-certificate-online-perth",
  "medical-certificate-online-adelaide",
  "medical-certificate-online-gold-coast",
  "repeat-prescription-online",
  "after-hours-repeat-prescription",
  "weekend-repeat-prescription",
  "urgent-repeat-prescription-online",
  "online-doctor-certificate-australia",
  "telehealth-medical-certificate-vs-gp",
  "online-medical-certificate-comparison",
  "instant-scripts-alternative-medical-certificate",
  "bulk-billed-telehealth-vs-instantmed",
]

const RETIRED_INTENT_SLUGS = [
  "uti-treatment-online",
  "emergency-contraception-online",
  "hair-loss-treatment-online",
  "after-hours-doctor",
  "work-certificate-online",
  "flu-certificate-online",
]

const DRUG_LED_PATTERN =
  /\b(sildenafil|tadalafil|viagra|cialis|finasteride|dutasteride|minoxidil|ozempic|wegovy|mounjaro|duromine|phentermine|semaglutide|tirzepatide|atorvastatin|amlodipine|ramipril|perindopril|rosuvastatin|ventolin|seretide|symbicort|antibiotics?)\b/i

const UNSUPPORTED_CLAIMS_PATTERN =
  /\b(accepted by all|accepted for|employer-accepted|guaranteed|automatic certificate|issued automatically|no call needed|no phone call|medical certificate within hours|legally valid)\b/i

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("commercial SEO contract", () => {
  it("publishes the curated top-25 commercial intent pages in priority order", () => {
    expect(intentPages).toHaveLength(25)
    expect(intentPages.map((page) => page.slug)).toEqual(EXPECTED_TOP_25_SLUGS)
    expect(intentPages.map((page) => page.commercial.priority)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    )

    for (const slug of RETIRED_INTENT_SLUGS) {
      expect(intentPages.some((page) => page.slug === slug)).toBe(false)
    }
  })

  it("requires every page to have first-screen answer, price, source links, internal links, FAQs, and a local visual", () => {
    for (const page of intentPages) {
      expect(page.commercial.answer.length, page.slug).toBeGreaterThan(70)
      expect(page.commercial.price, page.slug).toMatch(/\$/)
      expect(page.conversion.primaryCTA.length, page.slug).toBeGreaterThan(5)
      expect(page.conversion.ctaUrl, page.slug).toMatch(/^\/(request|medical-certificate|prescriptions|consult|hair-loss)/)

      expect(page.commercial.sources.length, page.slug).toBeGreaterThanOrEqual(2)
      for (const source of page.commercial.sources) {
        expect(source.label.length, page.slug).toBeGreaterThan(10)
        expect(source.href, page.slug).toMatch(/^https:\/\//)
      }

      expect(page.commercial.internalLinks.length, page.slug).toBeGreaterThanOrEqual(3)
      for (const link of page.commercial.internalLinks) {
        expect(link.href, page.slug).toMatch(/^\//)
        expect(link.label.length, page.slug).toBeGreaterThan(4)
      }

      expect(page.content.uniqueBlocks.length, page.slug).toBeGreaterThanOrEqual(3)
      for (const block of page.content.uniqueBlocks) {
        expect(block.title, `${page.slug}:${block.id}`).toBeTruthy()
      }

      expect(page.structured.faqs?.length, page.slug).toBeGreaterThanOrEqual(3)
      expect(page.commercial.visual.src, page.slug).toMatch(/^\/images\/seo\/.+\.webp$/)
      expect(page.commercial.visual.src, page.slug).not.toMatch(/\/(?:medcert|consult|rx)-\d+\.webp$/)

      const visualPath = path.join(ROOT, "public", page.commercial.visual.src.replace(/^\//, ""))
      expect(existsSync(visualPath), page.slug).toBe(true)
      expect(statSync(visualPath).size, page.slug).toBeGreaterThan(40_000)
      expect(statSync(visualPath).size, page.slug).toBeLessThan(200_000)
    }
  })

  it("keeps commercial SEO visuals generated, local, and service-level", () => {
    expect(commercialSeoVisualList).toHaveLength(5)

    for (const visual of commercialSeoVisualList) {
      expect(visual.assetPath).toMatch(/^\/images\/seo\/.+\.webp$/)
      expect(existsSync(path.join(ROOT, "public", visual.assetPath.replace(/^\//, ""))), visual.id).toBe(true)
      expect(JSON.stringify(visual), visual.id).not.toMatch(DRUG_LED_PATTERN)
      expect(JSON.stringify(visual), visual.id).not.toMatch(/\b(buy|get treatment|start treatment|guaranteed|accepted by all)\b/i)
    }

    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> }
    expect(packageJson.scripts?.["seo:generate-commercial-visuals"]).toBe(
      "tsx scripts/generate-commercial-seo-visual-images.ts",
    )

    const generator = read("scripts/generate-commercial-seo-visual-images.ts")
    expect(generator).toContain('const GPT_IMAGE_MODEL = "openai/gpt-image-2"')
    expect(generator).toContain("feature:commercial-seo-visuals")
    expect(generator).toContain("delete process.env.OPENAI_API_KEY")
  })

  it("keeps commercial SEO service-level and free of drug-led prescription advertising", () => {
    const serialized = JSON.stringify(intentPages)

    expect(serialized).not.toMatch(DRUG_LED_PATTERN)
    expect(serialized).not.toMatch(/[?&](?:medication|drug)=/i)
    expect(serialized).not.toMatch(UNSUPPORTED_CLAIMS_PATTERN)
    expect(serialized).not.toMatch(/\b(?:from|at|start(?:s)? at|start) From \$/i)
    expect(serialized).not.toMatch(/\bFrom From \$/)
  })

  it("renders the commercial fields in the page shell instead of burying them below the fold", () => {
    const pageShell = read("app/intent/[slug]/page.tsx")

    expect(pageShell).toContain("page.commercial.answer")
    expect(pageShell).toContain("page.commercial.price")
    expect(pageShell).toContain("page.commercial.visual.src")
    expect(pageShell).toContain("page.commercial.sources")
    expect(pageShell).toContain("page.commercial.internalLinks")
    expect(pageShell).toContain("<Image")
  })

  it("links commercial intent pages from existing authority surfaces", () => {
    const authorityFiles = [
      "components/marketing/med-cert-landing.tsx",
      "components/marketing/prescriptions-landing.tsx",
      "app/pricing/pricing-content.tsx",
      "components/marketing/how-it-works-content.tsx",
      "app/guides/[slug]/page.tsx",
    ]

    const authoritySource = authorityFiles.map(read).join("\n")

    expect(authoritySource).toContain("CommercialIntentLinksSection")
    expect(authoritySource).toContain("commercialCertificateLinks")
    expect(authoritySource).toContain("commercialPrescriptionLinks")
    expect(authoritySource).toContain("commercialComparisonLinks")

    const linkedTargets = JSON.stringify([
      ...commercialCertificateLinks,
      ...commercialPrescriptionLinks,
      ...commercialComparisonLinks,
    ])

    for (const slug of [
      "same-day-medical-certificate",
      "medical-certificate-for-work",
      "online-sick-certificate",
      "repeat-prescription-online",
      "after-hours-repeat-prescription",
      "telehealth-medical-certificate-vs-gp",
      "bulk-billed-telehealth-vs-instantmed",
    ]) {
      expect(linkedTargets, slug).toContain(`/intent/${slug}`)
    }
  })

  it("redirects retired lower-fit and drug-led intent pages", () => {
    const nextConfig = read("next.config.mjs")

    for (const slug of RETIRED_INTENT_SLUGS) {
      expect(nextConfig).toContain(`source: "/intent/${slug}"`)
      expect(nextConfig).toMatch(
        new RegExp(`source: "\\/intent\\/${slug}",[^}]*permanent: true`),
      )
    }
  })

  it("keeps major city certificate intent canonical to the new top-25 pages", () => {
    const nextConfig = read("next.config.mjs")
    const rootSitemap = read("app/sitemap.ts")
    const majorCitySlugs = ["sydney", "melbourne", "brisbane", "perth", "adelaide", "gold-coast"]

    expect(nextConfig).toContain(
      'source: "/medical-certificate/:city(sydney|melbourne|brisbane|perth|adelaide|gold-coast)"',
    )
    expect(nextConfig).toContain('destination: "/intent/medical-certificate-online-:city"')

    for (const slug of majorCitySlugs) {
      expect(rootSitemap).not.toContain(`"/medical-certificate/${slug}"`)
      expect(intentPages.some((page) => page.slug === `medical-certificate-online-${slug}`)).toBe(true)
    }
  })
})
