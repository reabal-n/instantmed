import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

const edLanding = read("components/marketing/erectile-dysfunction-landing.tsx")
const edPage = read("app/erectile-dysfunction/page.tsx")
const hairLanding = read("components/marketing/hair-loss-landing.tsx")
const edVisual = edLanding.slice(
  edLanding.indexOf("const ED_DECISION_SIGNALS"),
  edLanding.indexOf("export function ErectileDysfunctionLanding"),
)
const hairVisual = hairLanding.slice(
  hairLanding.indexOf("function HairAssessmentModel"),
  hairLanding.indexOf("function HairLossPricingSection"),
)

describe("money-page art-direction contract", () => {
  it("gives ED a semantic safety-screen to doctor-review decision map", () => {
    const renderStart = edLanding.indexOf("export function ErectileDysfunctionLanding")
    expect(edLanding).toContain('data-art-direction="ed-safety-decision-map"')
    expect(edLanding).toContain('aria-labelledby="ed-decision-map-title"')
    expect(edLanding).toContain('aria-describedby="ed-decision-map-warning"')
    expect(edLanding).toContain('<figcaption id="ed-decision-map-warning"')
    expect(edLanding).not.toMatch(/<figcaption\b[^>]*\brole=/)
    expect(edLanding).toContain("<figure")
    expect(edLanding).toContain("<figcaption")
    expect(edLanding).toContain("ED_DECISION_SIGNALS")
    expect(edLanding).toContain("Erection pattern")
    expect(edLanding).toContain("Cardiovascular context")
    expect(edLanding).toContain("Medicine safety")
    expect(edLanding).toContain("Red flags")
    expect(edLanding).toContain("Doctor review")
    expect(edLanding).toContain("whether remote care is suitable")
    expect(edLanding).toContain("may call or message for clarification")
    expect(edLanding).toContain("recommend GP, sexual-health, or cardiovascular follow-up")
    expect(edLanding.indexOf("<EdReviewCostOutcomeSection", renderStart)).toBeLessThan(
      edLanding.indexOf("<EdSafetyDecisionMap />", renderStart),
    )
  })

  it("retires the generic ED article-visual pass from the service page", () => {
    expect(edLanding).not.toContain("ArticleVisuals")
    expect(edLanding).not.toContain("VisualTextIndex")
    expect(edLanding).not.toContain("RenderableArticleVisual")
    expect(edPage).not.toContain("getArticleVisualsForRender")
    expect(edPage).toContain("<ErectileDysfunctionLanding />")
  })

  it("gives hair loss a high, semantic pattern-tempo-symptom assessment model", () => {
    expect(hairLanding).toContain('data-art-direction="hair-pattern-tempo-assessment"')
    expect(hairLanding).toContain('aria-labelledby="hair-assessment-model-title"')
    expect(hairLanding).toContain("<figure")
    expect(hairLanding).toContain("<figcaption")
    expect(hairLanding).toContain("<dl")
    expect(hairLanding).toContain("Pattern")
    expect(hairLanding).toContain("Tempo")
    expect(hairLanding).toContain("Scalp symptoms")
    expect(hairLanding).toContain("Health context")
    expect(hairLanding).toContain("The doctor may approve")
    expect(hairLanding).toContain("The doctor may ask for more detail")
    expect(hairLanding).toContain("may be safer to assess in person")
    expect(hairLanding.indexOf("<HairAssessmentModel />")).toBeLessThan(
      hairLanding.indexOf("<HowItWorksInline"),
    )
    expect(hairLanding.indexOf("<HairLossPricingSection")).toBeLessThan(
      hairLanding.indexOf("<HairAssessmentModel />"),
    )
  })

  it("removes generic hair-loss photography and the superseded card treatment list", () => {
    expect(hairLanding).not.toContain('from "next/image"')
    expect(hairLanding).not.toContain("/images/hairloss-1.webp")
    expect(hairLanding).not.toContain("/images/hairloss-2.webp")
    expect(hairLanding).not.toContain("ASSESSMENT_AREAS")
    expect(hairLanding).not.toContain("TreatmentOptions")
  })

  it("keeps both visual families restrained, responsive, and drug-neutral", () => {
    for (const source of [edVisual, hairVisual]) {
      expect(source).toContain("dark:border-white/15")
      expect(source).toContain("min-w-0")
      expect(source).not.toMatch(/(?:linear|radial)-gradient/)
      expect(source).not.toContain("backdrop-blur")
      expect(source).not.toContain("<svg")
      expect(source).not.toMatch(/sildenafil|tadalafil|finasteride|minoxidil|alpha[- ]blockers?/i)
      expect(source).not.toMatch(/no call needed|guaranteed prescription/i)
    }

    expect(edLanding).toContain("sm:grid-cols-2")
    expect(hairLanding).toContain("sm:grid-cols-2")
    expect(hairLanding).toContain("3-min form")
    expect(hairLanding).not.toContain("2-min")
  })
})
