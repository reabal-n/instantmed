import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

const uti = read("components/marketing/uti-assessment-landing.tsx")
const pill = read("components/marketing/contraceptive-pill-assessment-landing.tsx")
const utiPage = read("app/uti-assessment-online/page.tsx")
const pillPage = read("app/contraceptive-pill-assessment-online/page.tsx")
const faqData = read("lib/data/womens-health-faq.ts")

function expectOrdered(source: string, markers: string[]) {
  let previousIndex = -1

  for (const marker of markers) {
    const index = source.indexOf(marker)
    expect(index, `Expected ${marker} after the previous narrative section`).toBeGreaterThan(previousIndex)
    previousIndex = index
  }
}

function expectFirstFoldContract(source: string, firstSectionId: string, nextChoice: string) {
  const firstFold = source.slice(source.indexOf("const HERO_FACTS"), source.indexOf(firstSectionId))

  expect(firstFold).toContain("Australia only")
  expect(firstFold).toContain("18+")
  expect(firstFold).toContain("Medicare required")
  expect(firstFold).toContain("PRICING_DISPLAY.WOMENS_HEALTH")
  expect(firstFold).toContain("AHPRA-registered doctor")
  expect(firstFold).toContain("GUARANTEE")
  expect(firstFold).toContain(nextChoice)
}

describe("women's-health child-page narrative compression", () => {
  it("compresses UTI education, scope, and commercial truth into one clear sequence", () => {
    expectOrdered(uti, [
      'id="symptoms-and-red-flags"',
      'id="eligibility-and-scope"',
      'id="review-cost-and-outcomes"',
      'id="alternatives"',
      'id="sources"',
      "<FAQSection",
      "Start a UTI symptom assessment",
    ])

    expectFirstFoldContract(uti, 'id="symptoms-and-red-flags"', "choose UTI symptoms")

    const education = uti.slice(
      uti.indexOf('id="symptoms-and-red-flags"'),
      uti.indexOf('id="eligibility-and-scope"'),
    )
    expect(education).toContain("ArticleVisuals")
    expect(education).toContain("SYMPTOM_FIT")
    expect(education).toContain("SAFETY_CHECKS")

    expect(uti).not.toContain('id="how-it-works"')
    expect(uti).not.toContain('id="visual-guide"')
    expect(uti).not.toContain('id="expect"')
    expect(uti).toContain("UTI_LANDING_FAQ")
  })

  it("makes pill safety exits truthful before presenting the paid review path", () => {
    expectOrdered(pill, [
      'id="safety"',
      'id="eligibility-and-scope"',
      'id="review-cost-and-outcomes"',
      'id="alternatives"',
      'id="sources"',
      "<FAQSection",
      "Request a contraceptive pill assessment",
    ])

    expectFirstFoldContract(pill, 'id="safety"', "choose start or switch pill")

    const safety = pill.slice(
      pill.indexOf('id="safety"'),
      pill.indexOf('id="eligibility-and-scope"'),
    )
    expect(safety).toContain("ArticleVisuals")
    expect(safety).toContain("SAFETY_CHECKS")
    expect(safety).toContain("before checkout")
    expect(safety).toContain("possible pregnancy")
    expect(safety).toContain("migraine with aura")
    expect(safety).toContain("blood clot")
    expect(safety).toContain("smoking")
    expect(pill).toContain('visual.id === "pill-suitability-map"')
    expect(pill).toContain('item.label === "Doctor review"')
    expect(pill).toContain('label: "Safety exit"')

    expect(pill).not.toMatch(/possible pregnancy[^.]{0,120}(?:call|message)/i)
    expect(pill).not.toContain('title="May need contact"')
    expect(pill).not.toContain('id="how-it-works"')
    expect(pill).not.toContain('id="visual-guide"')
    expect(pill).not.toContain('id="expect"')
    expect(pill).toContain("PILL_LANDING_FAQ")
  })

  it("uses the same compact FAQ set on-page and in structured data", () => {
    expect(faqData).toContain("export const UTI_LANDING_FAQ")
    expect(faqData).toContain("export const PILL_LANDING_FAQ")

    expect(uti).toContain("items={UTI_LANDING_FAQ}")
    expect(utiPage).toContain("<FAQSchema faqs={[...UTI_LANDING_FAQ]} />")
    expect(pill).toContain("items={PILL_LANDING_FAQ}")
    expect(pillPage).toContain("<FAQSchema faqs={[...PILL_LANDING_FAQ]} />")

    expect(faqData).toContain("this paid pathway stops before checkout")
    expect(faqData).not.toContain("The doctor may ask for a pregnancy test, contact you")
  })

  it("preserves each child-page intent without inventing pseudo-service aliases", () => {
    expect(uti).toContain(
      'const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health&intent=uti"',
    )
    expect(pill).toContain(
      'const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health&intent=ocp_new"',
    )

    for (const source of [uti, pill]) {
      expect(source).not.toMatch(/service=(?:uti|ocp_new|pill)/)
      expect(source).not.toContain("hover:-translate")
      expect(source).not.toContain("group-hover:translate")
      expect(source).not.toContain("transition-[border-color,box-shadow,transform]")
    }
  })
})
