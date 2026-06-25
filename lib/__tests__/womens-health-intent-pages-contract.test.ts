import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

const pages = [
  {
    file: "app/uti-assessment-online/page.tsx",
    route: "/uti-assessment-online",
    canonical: "https://instantmed.com.au/uti-assessment-online",
    renderMarker: "UtiAssessmentLanding",
    requiredCopy: ["UTI symptom assessment", "Doctor Review"],
  },
  {
    file: "app/contraceptive-pill-assessment-online/page.tsx",
    route: "/contraceptive-pill-assessment-online",
    canonical: "https://instantmed.com.au/contraceptive-pill-assessment-online",
    renderMarker: "ContraceptivePillAssessmentLanding",
    requiredCopy: ["Start or switch the contraceptive pill", "doctor review"],
  },
]

describe("women's-health intent entry pages", () => {
  it("publishes UTI and pill entry pages with focused canonicals", () => {
    for (const page of pages) {
      const source = read(page.file)

      expect(source, page.file).toContain(page.canonical)
      expect(source, page.file).toContain(page.renderMarker)
      expect(source, page.file).toContain(`url="${page.route}"`)

      // Indexability lives next to the canonical assertion (not split into a
      // separate sitemap contract): the canonical must sit in
      // metadata.alternates.canonical, and the page must not be noindexed.
      expect(source, `${page.file} alternates.canonical`).toContain(`canonical: "${page.canonical}"`)
      expect(source, `${page.file} not noindexed`).not.toMatch(/index:\s*false|\bnoindex\b/i)

      for (const copy of page.requiredCopy) {
        expect(source, `${page.file}:${copy}`).toContain(copy)
      }
    }
  })

  it("keeps both entry pages on the existing women's-health intake contract", () => {
    const landing = read("components/marketing/womens-health-landing.tsx")
    const contentHubLinks = read("components/seo/content-hub-links.tsx")

    expect(landing).toContain('const WOMENS_HEALTH_HREF = "/request?service=consult&subtype=womens_health"')
    expect(landing).toContain('intent = "overview"')
    expect(landing).toContain('analyticsId: "womens-health-uti"')
    expect(landing).toContain('analyticsId: "womens-health-pill"')
    expect(contentHubLinks).toContain("/uti-assessment-online")
    expect(contentHubLinks).toContain("/contraceptive-pill-assessment-online")

    // The women's-health content-hub block renders on the paid intent pages, so
    // it must carry no prescription drug-class anchor (the "UTI antibiotics
    // online" regression). Scoped to the women's-health block so the hair-loss
    // educational links elsewhere in the file are not in scope.
    const womensHealthHub = contentHubLinks.slice(contentHubLinks.indexOf('"womens-health": {'))
    expect(womensHealthHub).not.toMatch(/\bantibiotics?\b/i)

    const combinedSource = [landing, ...pages.map((page) => read(page.file))].join("\n")
    expect(combinedSource).not.toContain("womens_health_uti")
    expect(combinedSource).not.toContain("womens_health_pill")
    expect(combinedSource).not.toContain("service=uti")
    expect(combinedSource).not.toContain("service=contraception")
  })

  it("keeps focused women's-health pages service-level and safety-led", () => {
    const combinedSource = [
      read("components/marketing/womens-health-landing.tsx"),
      read("components/marketing/uti-assessment-landing.tsx"),
      read("components/marketing/contraceptive-pill-assessment-landing.tsx"),
      ...pages.map((page) => read(page.file)),
    ].join("\n")

    expect(combinedSource).toContain("pregnancy or possible pregnancy")
    expect(combinedSource).toContain("migraine with aura")
    expect(combinedSource).toContain("repeat-prescription pathway")
    expect(combinedSource).toContain("may call you briefly")
    expect(combinedSource).not.toMatch(/\b(antibiotics?|same[- ]day|no call needed|no phone call)\b/i)
    expect(combinedSource).not.toMatch(/\b(guaranteed prescription|guaranteed treatment|treatment guaranteed|prescription guaranteed|guaranteed outcome)\b/i)
    expect(combinedSource).not.toMatch(/\b(sildenafil|tadalafil|finasteride|dutasteride|semaglutide|tirzepatide)\b/i)
  })

  it("keeps the shared women's-health FAQ from implying prescribing is no-contact", () => {
    const faq = read("lib/data/womens-health-faq.ts")

    expect(faq).toContain("The doctor may call you briefly if a safety detail needs clarification.")
    expect(faq).not.toContain("We only contact you if")
  })
})
