import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8")
}

function expectInOrder(source: string, markers: readonly string[]) {
  let cursor = -1

  for (const marker of markers) {
    const next = source.indexOf(marker, cursor + 1)
    expect(next, `Expected ${marker} after source offset ${cursor}`).toBeGreaterThan(cursor)
    cursor = next
  }
}

describe("money-page narrative compression", () => {
  it("keeps active mobile sticky summaries distinct from review timing", () => {
    const summaries = [
      ["components/marketing/prescriptions-landing.tsx", "Repeat medication request"],
      ["components/marketing/erectile-dysfunction-landing.tsx", "ED assessment"],
      ["components/marketing/hair-loss-landing.tsx", "3-min form"],
      ["components/marketing/uti-assessment-landing.tsx", "UTI symptom assessment"],
      ["components/marketing/contraceptive-pill-assessment-landing.tsx", "Start or switch pill"],
    ] as const

    for (const [path, summary] of summaries) {
      const source = read(path)
      expect(source).toContain(`mobileSummary: "${summary}"`)
      expect(summary.toLowerCase()).not.toContain("doctor")
    }

    expect(read("components/marketing/uti-assessment-landing.tsx")).toContain(
      "Start · choose UTI next",
    )
    expect(read("components/marketing/contraceptive-pill-assessment-landing.tsx")).toContain(
      "Start · choose pill next",
    )
  })

  it("keeps the medical-certificate decision path short and complete", () => {
    const source = read("components/marketing/med-cert-landing.tsx")
    const controls = read("components/marketing/med-cert-client-controls.tsx")
    const workplaceStart = source.indexOf("function WorkplaceProofPanel")
    const workplaceEnd = source.indexOf("function FeeSuitabilityPanel")

    expect(source).toContain("Australia only")
    expect(source).toContain("Ages 18+")
    expect(source).toContain("No Medicare needed")
    expect(source).toContain("Routine short absences")
    expect(source).toContain("PRICING_DISPLAY.FROM_MED_CERT")
    expect(source).toContain("PRICING_DISPLAY.MED_CERT_2DAY")
    expect(source).toContain("PRICING_DISPLAY.MED_CERT_3DAY")
    expect(source).toContain('getApprovedClaim("refund_payment_process")')

    expect(source).not.toContain("<CitationFacts")
    expect(source).not.toContain("RelatedEvidenceGuides")
    expect(source).not.toContain("CertComparisonViz")
    expect(source).not.toContain("<CommercialIntentLinksSection")
    expect(source).not.toContain("RelatedPrescriptionServiceLink")
    expect(controls).not.toContain("SOCIAL_PROOF")
    expect(controls).not.toContain("responseTime=")

    expect(workplaceStart).toBeGreaterThan(-1)
    expect(workplaceEnd).toBeGreaterThan(workplaceStart)
    expect(source.slice(workplaceStart, workplaceEnd)).toContain("Fair Work Act 2009")

    expectInOrder(source, [
      "<MedCertHero />",
      "<LimitationsSection />",
      "<WorkplaceProofPanel />",
      "<HowItWorksInline",
      "<FeeSuitabilityPanel />",
      "items={MED_CERT_LANDING_FAQ}",
      "<MedCertFinalCta />",
      "<RegulatoryPartners />",
      "<MedCertReasonLinks />",
    ])
  })

  it("keeps the repeat-prescription decision path focused on one safe renewal", () => {
    const source = read("components/marketing/prescriptions-landing.tsx")
    const page = read("app/prescriptions/page.tsx")

    expect(source).toContain('title="Repeat prescription, reviewed from home."')
    expect(source).toContain("Australia only")
    expect(source).toContain("Ages 18+")
    expect(source).toContain("Medicare details required")
    expect(source).toContain("Previously prescribed")
    expect(source).toContain("Stable medication and dose")
    expect(source).toContain("PRICING_DISPLAY.REPEAT_SCRIPT")
    expect(source).toContain('getApprovedClaim("refund_payment_process")')
    expect(source).toContain('data-prescription-lifecycle="escript"')
    expect(source).toContain("Medicine cost is separate")
    expect(source).toContain("PBS eligibility")
    expect(source).toContain("Takes about 3 minutes.")

    for (const retiredMarker of [
      "{children}",
      "LiveWaitTime",
      "TrustBadgeRow",
      "ServiceComparisonSection",
      "CommercialIntentLinksSection",
      "HowItWorksInline",
      "EScriptExplainerSection",
      "PrescriptionComparisonViz",
      "DoctorProfileSection",
      "PrescriptionLimitationsSection",
      "ReferralStrip",
      "ContentHubLinks",
      "RelatedArticles",
      "afterFooter=",
      "5 minutes",
    ]) {
      expect(source, retiredMarker).not.toContain(retiredMarker)
    }

    expect(page).not.toContain("PrescriptionFactsBlock")
    expect(page).not.toContain("PrescriptionAuthorityResourceLink")
    expect(page).not.toContain("<PrescriptionsLanding>")
    expect(page).toContain("<PrescriptionsLanding />")
    expect(page).toContain("PRESCRIPTION_LANDING_FAQ")

    expectInOrder(source, [
      "<Hero",
      "<RepeatEligibilitySection",
      "<PrescriptionLifecycleGraphic />",
      "<PrescriptionFeePanel />",
      "items={PRESCRIPTION_LANDING_FAQ}",
      "<RegulatoryPartners",
      "<CTABanner",
      "<PrescriptionResourceNav />",
    ])
  })

  it("compresses ED into one safety-led decision path", () => {
    const source = read("components/marketing/erectile-dysfunction-landing.tsx")
    const page = read("app/erectile-dysfunction/page.tsx")

    expect(source.match(/The doctor reviews the whole picture/g)).toHaveLength(1)
    expect(source).toContain('title: "Doctor review and clarification"')

    for (const firstFoldFact of [
      "Australia only",
      "Ages 18+",
      "Medicare details required",
      "PRICING_DISPLAY.MENS_HEALTH",
      "About 3 minutes",
      "Full refund if the doctor declines",
    ]) {
      expect(source, firstFoldFact).toContain(firstFoldFact)
    }

    for (const retiredMarker of [
      "ED_GEO_FACTS",
      "EdGeoFactsBlock",
      "ED_CONTEXT",
      'id="clinical-context"',
      "AFTER_SUBMIT",
      'id="expect"',
      '<ContentHubLinks service="ed" />',
    ]) {
      expect(source, retiredMarker).not.toContain(retiredMarker)
    }

    expect(source).toContain("an erection lasting more than 4 hours")
    expect(source).toContain("chest-pain medicines")
    expect(source).toContain("Medicine cost is separate")
    expect(source).toContain("items={ED_LANDING_FAQ}")
    expect(page).toContain("ED_LANDING_FAQ")

    expectInOrder(source, [
      "function EdHero",
      "<EdHero",
      "<EdEligibilitySection />",
      "<EdSafetyDecisionMap />",
      "<EdScopeBoundarySection />",
      "<EdReviewCostOutcomeSection",
      "<EdAlternativesSection />",
      "<EdSourcesSection />",
      "items={ED_LANDING_FAQ}",
      "<EdFinalCta",
    ])
  })

  it("compresses hair loss around assessment, doctor proof, fee, and limits", () => {
    const source = read("components/marketing/hair-loss-landing.tsx")
    const page = read("app/hair-loss/page.tsx")

    expect(source).toContain('mobileSummary: "3-min form"')
    expect(source).not.toContain('mobileSummary: "3-min form · Doctor-reviewed"')

    for (const firstFoldFact of [
      "Australia only",
      "Ages 18+",
      "Medicare details required",
      "3-min form",
      "PRICING_DISPLAY.HAIR_LOSS",
      "Full refund if the doctor declines",
    ]) {
      expect(source, firstFoldFact).toContain(firstFoldFact)
    }

    for (const retiredMarker of [
      "LiveWaitTime",
      "ServiceClaimSection",
      "HAIR_LOSS_FACTS",
      "HairLossFactsBlock",
      "TimeComparisonViz",
      "HairLossComparisonViz",
      "ReferralStrip",
    ]) {
      expect(source, retiredMarker).not.toContain(retiredMarker)
    }

    const pricingStart = source.indexOf("function HairLossPricingSection")
    const pricingEnd = source.indexOf("function HairLossLimitationsSection")
    expect(pricingStart).toBeGreaterThan(-1)
    expect(pricingEnd).toBeGreaterThan(pricingStart)
    expect(source.slice(pricingStart, pricingEnd)).toContain("<RegulatoryPartners")
    expect(source.slice(pricingStart, pricingEnd)).toContain("Medicine cost is separate")
    expect(source).toContain("does not diagnose the cause of hair loss")
    expect(source).toContain("items={HAIR_LOSS_LANDING_FAQ}")
    expect(source).toContain('afterFooter={<ContentHubLinks service="hair-loss" />}')
    expect(page).toContain("HAIR_LOSS_LANDING_FAQ")

    expectInOrder(source, [
      "<HairHeroFacts />",
      "<HairAssessmentModel />",
      "<HowItWorksInline",
      "<DoctorProfileSection",
      "<HairLossPricingSection",
      "<HairLossLimitationsSection />",
      "items={HAIR_LOSS_LANDING_FAQ}",
      "<CTABanner",
    ])
  })

  it("keeps the women's-health hub as a bounded two-pathway overview", () => {
    const source = read("components/marketing/womens-health-landing.tsx")
    const page = read("app/womens-health/page.tsx")

    for (const commonFact of [
      "Australia only",
      "Ages 18+",
      "Medicare details required",
      "PRICING_DISPLAY.WOMENS_HEALTH",
      "Full refund if the doctor declines",
    ]) {
      expect(source, commonFact).toContain(commonFact)
    }

    for (const retiredMarker of [
      "WomensHealthIntent",
      "INTENT_COPY",
      "EScriptHeroMockup",
      "PILL_FAQ",
      "UTI_FAQ",
      "LiveWaitTime",
      "ServiceClaimSection",
      "HowItWorksInline",
      "TimeComparisonViz",
      "WomensHealthComparisonViz",
      "DoctorProfileSection",
      "ReferralStrip",
      "CTABanner",
      "WOMENS_HEALTH_HREF",
    ]) {
      expect(source, retiredMarker).not.toContain(retiredMarker)
    }

    expect(source).toContain('href="/uti-assessment-online"')
    expect(source).toContain('href="/contraceptive-pill-assessment-online"')
    expect(source).toContain('href="/prescriptions"')
    expect(source).toContain("migraine with aura")
    expect(source).toContain("clot history")
    expect(source).toContain("blood in your urine")
    expect(source).toContain("items={WOMENS_HEALTH_HUB_FAQ}")
    expect(source).toContain('afterFooter={<ContentHubLinks service="womens-health" />}')
    expect(page).toContain("WOMENS_HEALTH_HUB_FAQ")

    const reviewStart = source.indexOf("function WomensHealthReviewAndPriceSection")
    const reviewEnd = source.indexOf("function WomensHealthFinalChoice")
    expect(reviewStart).toBeGreaterThan(-1)
    expect(reviewEnd).toBeGreaterThan(reviewStart)
    expect(source.slice(reviewStart, reviewEnd)).toContain("<RegulatoryPartners")
    expect(source.slice(reviewStart, reviewEnd)).toContain("AHPRA")

    expectInOrder(source, [
      "<WomensHealthDecisionFork />",
      "<WomensHealthCommonFacts />",
      "<WomensHealthPathwaysSection />",
      "<WomensHealthBoundarySection />",
      "<WomensHealthReviewAndPriceSection />",
      "items={WOMENS_HEALTH_HUB_FAQ}",
      "<WomensHealthFinalChoice",
    ])
  })
})
