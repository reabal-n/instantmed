import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { faqItems, footerLinks } from "@/lib/marketing/homepage"
import { getActiveServices, getServiceMarketingHref } from "@/lib/services/service-catalog"

const root = process.cwd()
const voiceSource = readFileSync(join(root, "lib/marketing/voice.ts"), "utf8")
const homePageSource = readFileSync(join(root, "app/(marketing)/page.tsx"), "utf8")
const homepageMarketingSource = readFileSync(join(root, "lib/marketing/homepage.ts"), "utf8")
const homeServiceCardsSource = readFileSync(join(root, "components/marketing/service-cards.tsx"), "utf8")
const marketingIndexSource = readFileSync(join(root, "components/marketing/index.ts"), "utf8")
const heroSource = readFileSync(join(root, "components/marketing/hero.tsx"), "utf8")
const stickyCtaSource = readFileSync(join(root, "components/marketing/shared/sticky-cta.tsx"), "utf8")
const waitCounterSource = readFileSync(join(root, "components/marketing/wait-counter.tsx"), "utf8")
const whatHappensNextSource = readFileSync(join(root, "components/patient/what-happens-next.tsx"), "utf8")
const designSource = readFileSync(join(root, "DESIGN.md"), "utf8")
const brandSource = readFileSync(join(root, "docs/BRAND.md"), "utf8")
const medCertLandingSource = readFileSync(join(root, "components/marketing/med-cert-landing.tsx"), "utf8")
const doctorProfileSource = readFileSync(join(root, "components/marketing/sections/doctor-profile-section.tsx"), "utf8")
const requestPageSource = readFileSync(join(root, "app/request/page.tsx"), "utf8")
const requestFlowSource = readFileSync(join(root, "components/request/request-flow.tsx"), "utf8")
const requestStepRouterSource = readFileSync(join(root, "components/request/step-router.tsx"), "utf8")
const certificateStepSource = readFileSync(join(root, "components/request/steps/certificate-step.tsx"), "utf8")
const employerMarqueeSource = readFileSync(join(root, "components/shared/employer-logo-marquee.tsx"), "utf8")
const medCertPageSource = readFileSync(join(root, "app/medical-certificate/page.tsx"), "utf8")
const employerEvidenceSource = readFileSync(join(root, "app/medical-certificate/employer-acceptance/page.tsx"), "utf8")
const medCertIntentSource = readFileSync(join(root, "lib/marketing/med-cert-intent-config.ts"), "utf8")
const nextConfigSource = readFileSync(join(root, "next.config.mjs"), "utf8")
const trustBadgesSource = readFileSync(join(root, "lib/marketing/trust-badges.ts"), "utf8")
const howItWorksContentSource = readFileSync(join(root, "components/marketing/how-it-works-content.tsx"), "utf8")
const speedClaimsSource = readFileSync(join(root, "lib/marketing/speed-claims.ts"), "utf8")
const doctorProfileSectionSource = readFileSync(
  join(root, "components/marketing/sections/doctor-profile-section.tsx"),
  "utf8",
)
const rootOgImageSource = readFileSync(join(root, "app/opengraph-image.tsx"), "utf8")
const medCertOgImageSource = readFileSync(join(root, "app/medical-certificate/opengraph-image.tsx"), "utf8")
const workplaceClaimSources = [
  readFileSync(join(root, "app/employers/page.tsx"), "utf8"),
  readFileSync(join(root, "components/employers/bulk-verification-panel.tsx"), "utf8"),
  medCertIntentSource,
  employerEvidenceSource,
  readFileSync(join(root, "components/marketing/med-cert-intent-page.tsx"), "utf8"),
  readFileSync(join(root, "lib/seo/intents.ts"), "utf8"),
  readFileSync(join(root, "lib/seo/service-metadata.ts"), "utf8"),
  readFileSync(join(root, "lib/data/general-faq.ts"), "utf8"),
  readFileSync(join(root, "app/for/[audience]/page.tsx"), "utf8"),
  readFileSync(join(root, "app/for/shift-workers/page.tsx"), "utf8"),
  readFileSync(join(root, "app/for/corporate/page.tsx"), "utf8"),
  readFileSync(join(root, "app/for/employers/page.tsx"), "utf8"),
  readFileSync(join(root, "app/online-doctor-australia/page.tsx"), "utf8"),
  readFileSync(join(root, "app/request/page.tsx"), "utf8"),
  readFileSync(join(root, "app/trust/trust-client.tsx"), "utf8"),
  readFileSync(join(root, "lib/seo/data/deep-city-content/sa.ts"), "utf8"),
].join("\n")

const staleCommercialPolicySources = [
  "app/about/about-client.tsx",
  "app/telehealth-australia/page.tsx",
  "app/for/[audience]/page.tsx",
  "app/for/students/page.tsx",
  "app/for/tradies/page.tsx",
  "app/medical-certificate/[slug]/page.tsx",
  "components/marketing/blog-cta-card.tsx",
  "components/marketing/how-it-works-content.tsx",
  "docs/AI_ONBOARDING.md",
  "docs/CLINICAL.md",
  "docs/TESTING.md",
  "lib/data/general-faq.ts",
  "lib/seo/data/competitor-comparisons.ts",
  "lib/seo/pages/definitions.ts",
].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

describe("marketing copy contracts", () => {
  it("keeps the homepage hero kicker calm and clinically grounded", () => {
    expect(voiceSource).not.toContain("Three minutes. Done.")
    expect(voiceSource).toContain('export const ICONIC_HOOK = getApprovedClaim("iconic_hook")')
    expect(readFileSync(join(root, "lib/marketing/approved-claims.ts"), "utf8")).toContain(
      'text: "Start with a secure form. Takes about 3 minutes."',
    )
    expect(homePageSource).toContain("text-foreground/70")
    expect(homePageSource).not.toContain("text-[color:var(--brand-coral)]")
  })

  it("keeps homepage FAQs and coming-soon services compact", () => {
    expect(faqItems.map((item) => item.question)).toEqual([
      "What if the doctor says no?",
      "How fast is it really?",
      "Is my information private?",
      "How much does it cost compared to a GP?",
      "Does Medicare cover InstantMed?",
      "How do prescriptions work?",
    ])
    expect(homepageMarketingSource).not.toContain('cta: "Notify me"')
    expect(homeServiceCardsSource).not.toContain("WaitlistForm")
    expect(homeServiceCardsSource).not.toContain("Join the waitlist")
    expect(homeServiceCardsSource).not.toContain("Notify me")
    expect(homeServiceCardsSource).toContain("Coming next")
    expect(homeServiceCardsSource).toContain("Not taking requests yet")
    expect(marketingIndexSource).not.toContain("waitlist-form")
    expect(existsSync(join(root, "components/marketing/waitlist-form.tsx"))).toBe(false)
    expect(existsSync(join(root, "app/actions/waitlist.ts"))).toBe(false)
  })

  it("keeps the footer service links aligned with live public services", () => {
    const footerServiceHrefs = footerLinks.services.map((link) => link.href)
    const activeServiceHrefs = getActiveServices().map(getServiceMarketingHref)

    expect(activeServiceHrefs).toContain("/womens-health")
    expect(footerServiceHrefs).toContain("/womens-health")
    expect(footerServiceHrefs).not.toContain("/weight-loss")
  })

  it("does not imply prescribing requests are guaranteed to be approved", () => {
    expect(doctorProfileSource).toContain("Every request is reviewed by an experienced")
    expect(doctorProfileSource).not.toContain("reviewed and approved")
    expect(doctorProfileSource).not.toContain("med-cert page only")
  })

  it("keeps route Open Graph image text wrappers compatible with next/og", () => {
    for (const source of [rootOgImageSource, medCertOgImageSource]) {
      expect(source).not.toContain("display: 'inline'")
      expect(source).toContain("display: 'flex'")
    }

    expect(rootOgImageSource).toContain("Medical Certificates & Prescriptions")
    expect(rootOgImageSource).toContain("Reviewed by AHPRA-registered Australian doctors")
    expect(medCertOgImageSource).toContain("Online Medical Certificate")
    expect(medCertOgImageSource).toContain("Routine sick, study, and carer")
  })

  it("keeps live reviewing indicators green instead of urgent coral", () => {
    expect(waitCounterSource).toContain("bg-emerald-500")
    expect(waitCounterSource).not.toContain("var(--brand-coral)")
    expect(whatHappensNextSource).toContain("bg-emerald-500")
    expect(whatHappensNextSource).not.toContain("var(--brand-coral)")
    expect(designSource).toContain("Live/reviewing indicators use success green")
    expect(brandSource).toContain("Dot indicators use success green")
  })

  it("keeps review proof quiet and disables the desktop top sticky CTA", () => {
    expect(homePageSource).not.toContain("SocialProofSection")
    expect(medCertLandingSource).not.toContain("SocialProofSection")
    expect(homePageSource).not.toContain("Real patients. Real reviews.")
    expect(medCertLandingSource).not.toContain("Real patients. Real reviews.")
    expect(heroSource).toContain("GoogleReviewsBadge")
    expect(stickyCtaSource).not.toContain("hidden lg:block fixed")
    expect(stickyCtaSource).not.toContain("top: '62px'")
  })

  it("keeps shared doctor trust copy to review, not approval outcome language", () => {
    expect(doctorProfileSectionSource).toContain("Every request is reviewed by an experienced")
    expect(doctorProfileSectionSource).not.toContain("reviewed and approved")
    expect(doctorProfileSectionSource).not.toContain("med-cert page only")
  })

  it("renders the employer logo marquee on the medical certificate landing page", () => {
    expect(medCertLandingSource).toContain("EmployerLogoMarquee")
    expect(medCertLandingSource).toContain("WorkplaceProofPanel")
    // CertificateTypeSelector was retired from this surface on 2026-05-26
    // (Tier 1 review /medical-certificate #5). The wizard owns the
    // duration choice now. WorkplaceProofPanel must still come before
    // the comparison viz so the trust block lands above the fold.
    expect(medCertLandingSource).not.toContain("CertificateTypeSelector")
    expect(medCertLandingSource.indexOf("<WorkplaceProofPanel")).toBeLessThan(
      medCertLandingSource.indexOf("<CertComparisonViz"),
    )
  })

  it("does not imply employer endorsement or guaranteed acceptance in the logo marquee", () => {
    expect(employerMarqueeSource).not.toMatch(/\baccept(?:ed|s)?\b/i)
    expect(employerMarqueeSource).not.toMatch(/\bendors(?:ed|ement)\b/i)
    expect(employerMarqueeSource).toContain("Workplace policy context")
    expect(employerMarqueeSource).toContain("No employer relationship is implied.")
    expect(employerMarqueeSource).toContain("group-focus-within/marquee:[animation-play-state:paused]")
  })

  it("keeps medical certificate trust copy specific instead of slogan-like", () => {
    expect(medCertPageSource).toContain("Online Medical Certificate | AHPRA Doctor Review | InstantMed")
    expect(medCertPageSource).not.toContain("Under 30 Minutes, No Call")
    expect(medCertPageSource).not.toContain("no call, no appointment")
    expect(medCertPageSource).not.toContain("in under 30 minutes")
    expect(medCertIntentSource).not.toContain("Real doctor review")
    expect(workplaceClaimSources).not.toContain("All employers")
    expect(workplaceClaimSources).not.toContain("98% AU employers accept")
    expect(workplaceClaimSources).not.toContain("in under 30 minutes")
    expect(workplaceClaimSources).not.toContain("legally equivalent")
    expect(workplaceClaimSources).not.toContain("legally valid")
    expect(workplaceClaimSources).not.toContain("carry the same legal weight")
    expect(workplaceClaimSources).not.toContain("could constitute a breach")
    expect(workplaceClaimSources).not.toContain("within 15 minutes")
    expect(workplaceClaimSources).not.toContain("everything HR needs")
    expect(workplaceClaimSources).not.toContain("Fair Work compliant")
    expect(workplaceClaimSources).not.toContain("legal validity")
    expect(workplaceClaimSources).not.toContain("identical legal")
    expect(workplaceClaimSources).not.toContain("Tamper-Proof")
    expect(trustBadgesSource).toContain("AHPRA doctor review")
  })

  it("routes employer guidance to the canonical employer verification hub", () => {
    expect(nextConfigSource).toContain('source: "/for/employers"')
    expect(nextConfigSource).toContain('destination: "/employers"')
    expect(readFileSync(join(root, "app/for/employers/page.tsx"), "utf8")).toContain('redirect("/employers")')
    expect(workplaceClaimSources).toContain("BulkVerificationPanel")
    expect(workplaceClaimSources).toContain("/api/employer/verify-bulk")
    expect(workplaceClaimSources).toContain("No diagnosis shown")
    expect(workplaceClaimSources).not.toContain('href="/for/employers"')
  })

  it("keeps the medical certificate landing flow compact and price-consistent", () => {
    expect(medCertLandingSource).toContain("MED_CERT_START_HREF")
    expect(medCertLandingSource).toContain("duration: \"1\"")
    expect(medCertLandingSource).toContain("Clear fee. Clear fallback.")
    expect(medCertLandingSource).toContain("What your fee covers")
    expect(medCertLandingSource).not.toContain("MedCertComparisonTable")
    expect(requestPageSource).toContain("duration?: string")
    expect(requestPageSource).toContain("initialDuration={params.duration}")
    expect(requestFlowSource).toContain("initialDuration={initialDuration}")
    expect(requestStepRouterSource).toContain("initialDuration?: string")
    expect(requestStepRouterSource).toContain("initialDuration={initialDuration}")
    expect(certificateStepSource).toContain("initialUrlDurationRef")
    expect(certificateStepSource).toContain("parseDuration(initialDuration)")
  })

  it("keeps the employer evidence page aligned to the solid card system", () => {
    expect(employerEvidenceSource).toContain("Online Medical Certificate Evidence | InstantMed")
    expect(employerEvidenceSource).toContain("bg-white p-5 shadow-sm shadow-primary/[0.04]")
    expect(employerEvidenceSource).not.toContain("backdrop-blur")
    expect(employerEvidenceSource).not.toContain("bg-emerald")
    expect(employerEvidenceSource).not.toContain("text-emerald")
  })

  it("keeps index-depth copy specific, safe, and internally linked", () => {
    expect(howItWorksContentSource).toContain("Service pathway detail")
    expect(howItWorksContentSource).toContain("/medical-certificate")
    expect(howItWorksContentSource).toContain("/prescriptions")
    expect(howItWorksContentSource).toContain("/consult")
    expect(howItWorksContentSource).not.toContain("fully async")
    expect(howItWorksContentSource).not.toContain("legally valid under the Fair Work Act")

  })

  it("removes stale refund, retired general-consult, and static 15-minute claims from acquisition copy", () => {
    expect(staleCommercialPolicySources).not.toMatch(/refund minus a small admin fee/i)
    expect(staleCommercialPolicySources).not.toMatch(/small admin fee may apply/i)
    expect(staleCommercialPolicySources).not.toMatch(/50%\s+(?:partial\s+)?refund/i)
    expect(staleCommercialPolicySources).not.toMatch(/general consultations/i)
    expect(staleCommercialPolicySources).not.toMatch(/general consults/i)
    expect(staleCommercialPolicySources).not.toMatch(/\b(?:in|within|sorted in|ready in)\s+15 minutes\b/i)
    expect(speedClaimsSource).toContain("buildMedCertSpeedClaim")
    expect(speedClaimsSource).toContain("newestSampleAgeMinutes")
  })
})
