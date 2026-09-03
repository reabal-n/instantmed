import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { faqItems, footerLinks } from "@/lib/marketing/homepage"
import { DEEP_CITY_CONTENT } from "@/lib/seo/data/deep-city-content"
import { KEEP_INDEXED_LOCATIONS } from "@/lib/seo/index-policy"
import { intentPages } from "@/lib/seo/intents"
import { getActiveServices, getServiceMarketingHref } from "@/lib/services/service-catalog"

const root = process.cwd()
const locationPageSource = readFileSync(
  join(root, "app/locations/[city]/page.tsx"),
  "utf8",
)
const locationContentSource = readFileSync(
  join(root, "components/marketing/location-page-content.tsx"),
  "utf8",
)
const telehealthAustraliaSource = readFileSync(
  join(root, "app/telehealth-australia/page.tsx"),
  "utf8",
)
const websiteSchemaSource = readFileSync(
  join(root, "components/seo/schemas/website.tsx"),
  "utf8",
)
const voiceSource = readFileSync(join(root, "lib/marketing/voice.ts"), "utf8")
const homePageSource = readFileSync(join(root, "app/(marketing)/page.tsx"), "utf8")
const homepageMarketingSource = readFileSync(join(root, "lib/marketing/homepage.ts"), "utf8")
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
  "components/marketing/how-it-works-content.tsx",
  "docs/AI_ONBOARDING.md",
  "docs/CLINICAL.md",
  "docs/TESTING.md",
  "lib/data/general-faq.ts",
  "lib/seo/data/competitor-comparisons.ts",
].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

const eligibilityAndAutomationSources = [
  "app/consult/page.tsx",
  "app/how-it-works/page.tsx",
  "app/how-we-decide/page.tsx",
  "app/medical-certificate/[slug]/page.tsx",
  "app/medical-certificate/employer-acceptance/page.tsx",
  "app/our-doctors/our-doctors-client.tsx",
  "app/pricing/pricing-content.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/trust/trust-client.tsx",
  "app/why-instant/page.tsx",
  "components/marketing/citation-facts.tsx",
  "components/marketing/how-it-works-content.tsx",
  "components/marketing/medical-certificate-online-landing.tsx",
  "components/marketing/sections/how-we-decide-guide-section.tsx",
  "content/blog/same-day-medical-certificate-fast.mdx",
  "content/blog/same-day-medical-certificate.mdx",
  "docs/VOICE.md",
  "lib/marketing/homepage.ts",
  "lib/marketing/med-cert-intent-config.ts",
  "lib/marketing/voice.ts",
  "lib/seo/intents.ts",
  "lib/seo/data/audience-pages.ts",
  "lib/social-proof/index.ts",
  "public/llms-full.txt",
  "public/llms.txt",
].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

const staticTimingClaimSources = [
  "app/about/about-client.tsx",
  "app/contact/contact-client.tsx",
  "app/telehealth-australia/page.tsx",
  "lib/seo/data/states.ts",
  "lib/social-proof/index.ts",
].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

const prescribingIdentityMirrorPaths = [
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/online-prescriptions-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "components/marketing/uti-assessment-landing.tsx",
  "components/marketing/contraceptive-pill-assessment-landing.tsx",
  "components/marketing/mens-health-landing.tsx",
  "components/request/service-hub-screen.tsx",
  "components/request/help-tooltip.tsx",
  "lib/data/ed-faq.ts",
  "lib/data/mens-health-faq.ts",
  "lib/data/online-prescriptions-faq.ts",
  "lib/data/prescription-faq.ts",
  "lib/marketing/homepage.ts",
  "app/for/page.tsx",
  "app/how-it-works/page.tsx",
  "app/pricing/pricing-content.tsx",
  "app/symptoms/[slug]/page.tsx",
  "app/compare/[slug]/page.tsx",
  "app/consult/page.tsx",
  "app/locations/[city]/page.tsx",
  "app/online-doctor-australia/page.tsx",
  "app/telehealth-australia/page.tsx",
  "lib/seo/data/deep-city-content/nsw.ts",
] as const

const prescribingIdentityClaimConsumerPaths = [
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/online-prescriptions-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "components/marketing/uti-assessment-landing.tsx",
  "components/marketing/contraceptive-pill-assessment-landing.tsx",
  "components/marketing/mens-health-landing.tsx",
  "components/request/service-hub-screen.tsx",
  "components/request/help-tooltip.tsx",
  "lib/data/ed-faq.ts",
  "lib/data/mens-health-faq.ts",
  "lib/data/online-prescriptions-faq.ts",
  "lib/data/prescription-faq.ts",
  "app/compare/[slug]/page.tsx",
  "app/consult/page.tsx",
  "app/locations/[city]/page.tsx",
  "app/online-doctor-australia/page.tsx",
  "app/telehealth-australia/page.tsx",
  "lib/seo/data/deep-city-content/nsw.ts",
] as const

describe("marketing copy contracts", () => {
  it("keeps city and telehealth acquisition copy inside approved public truth", () => {
    const combined = [
      locationPageSource,
      locationContentSource,
      telehealthAustraliaSource,
      websiteSchemaSource,
    ].join("\n")

    expect(combined).not.toMatch(/within 45 minutes during business hours/i)
    expect(combined).not.toMatch(/join thousands/i)
    expect(combined).not.toMatch(/google star rating/i)
    expect(combined).not.toMatch(/outcomes are comparable to in-person care/i)
    expect(combined).not.toMatch(/sometimes superior/i)
    expect(combined).not.toMatch(/never shared with.*third party/i)
    expect(combined).not.toMatch(/discuss a symptom or get a treatment plan/i)
    expect(combined).not.toMatch(/same-day work and study absence notes/i)
    expect(combined).not.toMatch(/online doctor services/i)
    expect(combined).not.toMatch(/certificate, script, or referral sent to your phone/i)
    expect(combined).not.toMatch(/eScripts? sent (?:direct )?to your phone/i)
    expect(combined).not.toContain("No Medicare card is required")
    expect(combined).not.toContain("without booking an appointment or providing a Medicare card")
    expect(combined).not.toContain('medicalSpecialty: "General Practice"')
    expect(combined).not.toContain("doctor consultations")
    expect(combined).not.toContain("InstantMed connects you with a doctor from anywhere with phone signal.")
    expect(combined).not.toContain("InstantMed lets you see a doctor without braving the weather or the traffic")
    expect(combined).not.toContain("InstantMed gives you access to Australian-registered doctors without the queue")
    expect(combined).not.toContain("InstantMed works on WA time and connects you with doctors who understand the unique needs of Western Australian patients, no matter where you are in the metro area.")
    expect(combined).not.toContain("Mental health check-ins and continuing care")
    expect(combined).not.toContain("Hair loss, skin concerns with photos, acne management")
    expect(combined).not.toContain("Sexual health screening requests and referrals")
    expect(combined).not.toContain("Travel-related script needs for returning travellers")
    expect(combined).not.toContain("Conditions we treat")
    expect(combined).not.toContain("Full list of conditions suited to telehealth")
    expect(combined).not.toContain("Refund if it&apos;s not the right fit.")
    expect(telehealthAustraliaSource).not.toContain("uncomplicated acute issues")
    expect(telehealthAustraliaSource).toMatch(
      /medical\s+certificate requests, repeat prescription review for a regular medicine you already\s+take/,
    )
    expect(telehealthAustraliaSource).toMatch(
      /focused ED, hair-loss, women&apos;s-health \(UTI or a new or switch\s+contraceptive pill\), and weight-management assessments/,
    )
    expect(telehealthAustraliaSource).not.toContain("accepted documentation")

    for (const city of KEEP_INDEXED_LOCATIONS) {
      expect(locationPageSource, city).toMatch(
        new RegExp(
          `\\b${city}:\\s*"[^"]*\\bsubmit a medical certificate or repeat prescription(?: review)? request\\b[^"]*"`,
        ),
      )

      const deepCityContent = DEEP_CITY_CONTENT[city]
      expect(deepCityContent, city).toBeDefined()

      const renderedDeepCityContent = JSON.stringify(deepCityContent)
      expect(renderedDeepCityContent, city).not.toMatch(
        /cannot refuse|requires acceptance|accepted under all|fully valid|we&apos;ve never had.*rejected|we've never had.*rejected|ideal for telehealth|no clinical reason.{0,80}(?:in-person|waiting room)|same process as an in-person|(?:consultation method|method of consultation).{0,120}(?:doesn&apos;t|doesn't|does not).{0,120}(?:acceptance|validity|workplace evidence status)|(?:certificate&apos;s|certificate's|workplace evidence status).{0,120}(?:is|are) not affected by.{0,80}(?:consultation|telehealth)|(?:recognis(?:e|es)|recogniz(?:e|es)).{0,120}(?:medical cert|telehealth-issued certificate|certificate)|meets (?:your )?leave requirements|meet(?:s)? (?:this|the )?requirement|(?:medical certificates?|telehealth-issued certificates?|certificates?).{0,100}(?:are|can be)(?: used as)?.{0,60}evidence|(?:certificate|cert).{0,100}(?:all required elements|formatted identically|next working day)|(?:you|we) (?:(?:won&apos;t|won't|will not)(?: be)?|aren&apos;t|aren't|are not) charged|14-day response SLA/i,
      )
      expect(renderedDeepCityContent, city).not.toMatch(
        /immediate access to an Australian doctor|medical certificate that takes a doctor.{0,40}assess|your telehealth doctor assesses|our doctors assess whether your symptoms are appropriate|our doctors can help|our doctors can provide medical certificates and prescriptions/i,
      )
    }

    const medCertIntentContent = JSON.stringify(
      intentPages.filter((page) => page.commercial.cluster === "medical-certificate"),
    )
    expect(medCertIntentContent).not.toMatch(
      /doctor reviewed|doctor (?:assesses|decides) whether|where a doctor can assess|doctor considers online review suitable|scope check, doctor review/i,
    )
    const comparisonIntentContent = JSON.stringify(
      intentPages.filter((page) => page.commercial.cluster === "comparison"),
    )
    expect(comparisonIntentContent).not.toMatch(
      /by price, doctor review|price, doctor review|between doctor review and self-declaration|focus on doctor review|clear pricing and doctor review/i,
    )

    expect(telehealthAustraliaSource).not.toMatch(
      /doctor review before certificate issue/i,
    )
    expect(locationContentSource).toContain(
      'getApprovedClaim("clinical_review_sequence")',
    )
    expect(locationContentSource).toContain(
      'getApprovedClaim("doctor_registration")',
    )
    expect(locationContentSource).not.toContain(
      "AHPRA-registered doctor review where required",
    )
    expect(locationContentSource).not.toMatch(
      /Reviewed by AHPRA-registered Australian doctors|title:\s*"Doctor reviews"|An Australian doctor reviews your request|the doctor's outcome|Doctor review, digital delivery|Reviewed by real Australian doctors/i,
    )
    expect(telehealthAustraliaSource).not.toMatch(
      /You submit a structured form; a doctor reviews it|the doctor reviews it later|submit 24\/7 for doctor review/i,
    )
    expect(locationPageSource).not.toContain(
      "an AHPRA-registered doctor can help",
    )
    expect(locationPageSource).not.toMatch(
      /(?:access to|connects?[^.]{0,50}with) (?:Australian(?:-registered)? )?doctors/i,
    )

    const intentPageSource = readFileSync(
      join(root, "app/intent/[slug]/page.tsx"),
      "utf8",
    )
    expect(intentPageSource).not.toMatch(
      /AHPRA-registered doctor review|Doctor reviewed|AHPRA-registered review/i,
    )

    expect(locationPageSource).toContain(
      'getApprovedClaim("med_cert_document_scope")',
    )
    expect(locationPageSource).toContain(
      'getApprovedClaim("trust_doctor_issued_tooltip")',
    )
    expect(telehealthAustraliaSource).toContain(
      'getApprovedClaim("clinical_access_scope")',
    )
    expect(locationPageSource).toContain(
      'getApprovedClaim("prescribing_identity_required")',
    )
    expect(telehealthAustraliaSource).toContain(
      'getApprovedClaim("prescribing_identity_required")',
    )
    expect(locationPageSource).toContain(
      'getApprovedClaim("clinical_review_sequence")',
    )
    expect(locationPageSource).toContain(
      'getApprovedClaim("prescription_if_approved")',
    )
    expect(locationContentSource).toContain(
      'getApprovedClaim("prescription_if_approved")',
    )
    expect(telehealthAustraliaSource).toContain(
      'getApprovedClaim("prescription_if_approved")',
    )
    expect(telehealthAustraliaSource).toContain("{GUARANTEE}")
  })

  it("keeps active prescribing mirrors on the approved Medicare-or-IHI identity claim", () => {
    const approvedClaimsSource = readFileSync(
      join(root, "lib/marketing/approved-claims.ts"),
      "utf8",
    )

    expect(approvedClaimsSource).toContain('"prescribing_identity_required"')
    expect(approvedClaimsSource).toContain(
      'text: "For prescribing, you need either Medicare details or a valid IHI, plus an Australian address."',
    )

    for (const path of prescribingIdentityMirrorPaths) {
      const source = readFileSync(join(root, path), "utf8")
      expect(source, path).not.toMatch(/Medicare (?:details )?(?:are|is) required/i)
      expect(source, path).not.toMatch(/(?:prescriptions?|consultations?|prescribing requests?) require Medicare details/i)
      expect(source, path).not.toMatch(/(?:have|provide) (?:a valid )?Medicare(?: card| details)?(?:[.,]|\b(?! or IHI))/i)
      expect(source, path).not.toMatch(/Medicare required/i)
    }

    for (const path of prescribingIdentityClaimConsumerPaths) {
      expect(readFileSync(join(root, path), "utf8"), path).toContain(
        'getApprovedClaim("prescribing_identity_required")',
      )
    }

    expect(trustBadgesSource).toContain("label: 'No Medicare required'")
  })

  it("keeps the homepage hero kicker calm and clinically grounded", () => {
    expect(voiceSource).not.toContain("Three minutes. Done.")
    expect(voiceSource).toContain('export const ICONIC_HOOK = getApprovedClaim("iconic_hook")')
    expect(readFileSync(join(root, "lib/marketing/approved-claims.ts"), "utf8")).toContain(
      'text: "Start with a secure form. Takes about 3 minutes."',
    )
    expect(homePageSource).toContain("text-foreground/85")
    expect(homePageSource).not.toContain("text-[color:var(--brand-coral)]")
  })

  it("keeps the homepage narrative compressed around one service selector", () => {
    expect(faqItems.map((item) => item.question)).toEqual([
      "What if the doctor says no?",
      "How fast is it really?",
      "Is my information private?",
      "How much does it cost compared to a GP?",
      "Does Medicare cover InstantMed?",
      "How do prescriptions work?",
    ])
    expect(homepageMarketingSource).not.toContain('cta: "Notify me"')
    expect(homePageSource).toContain("<PortfolioRouteMap />")
    expect(homePageSource).not.toContain("ServiceCards")
    expect(homePageSource).not.toContain("HomeFactsBlock")
    expect(homePageSource).not.toContain("<HowItWorks")
    expect(homePageSource).not.toContain("ComplianceMarquee")
    expect(existsSync(join(root, "components/marketing/waitlist-form.tsx"))).toBe(false)
    expect(existsSync(join(root, "app/actions/waitlist.ts"))).toBe(false)
  })

  it("keeps the footer service links aligned with live public services", () => {
    const footerServiceHrefs = footerLinks.services.map((link) => link.href)
    const activeServiceHrefs = getActiveServices().map(getServiceMarketingHref)

    expect(activeServiceHrefs).toContain("/womens-health")
    expect(footerServiceHrefs).toContain("/womens-health")
    // Weight management launched 2026-08-10 — the footer now lists it.
    expect(footerServiceHrefs).toContain("/weight-loss")
  })

  it("does not imply prescribing requests are guaranteed to be approved", () => {
    expect(doctorProfileSource).toContain('getApprovedClaim("doctor_registration")')
    expect(doctorProfileSource).toContain('getApprovedClaim("clinical_decision_model")')
    expect(doctorProfileSource).not.toContain("reviewed and approved")
    expect(doctorProfileSource).not.toContain("med-cert page only")
  })

  it("keeps route Open Graph image text wrappers compatible with next/og", () => {
    for (const source of [rootOgImageSource, medCertOgImageSource]) {
      expect(source).not.toContain("display: 'inline'")
      expect(source).toContain("display: 'flex'")
    }

    expect(rootOgImageSource).toContain("Medical Certificates & Prescriptions")
    expect(rootOgImageSource).toContain("AHPRA-registered clinical governance")
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
    expect(doctorProfileSectionSource).toContain('getApprovedClaim("doctor_registration")')
    expect(doctorProfileSectionSource).toContain('getApprovedClaim("clinical_decision_model")')
    expect(doctorProfileSectionSource).not.toContain("reviewed and approved")
    expect(doctorProfileSectionSource).not.toContain("med-cert page only")
  })

  it("renders the employer logo marquee on the medical certificate landing page", () => {
    expect(medCertLandingSource).toContain("EmployerLogoMarquee")
    expect(medCertLandingSource).toContain("WorkplaceProofPanel")
    // CertificateTypeSelector was retired from this surface on 2026-05-26
    // (Tier 1 review /medical-certificate #5). The wizard owns the
    // duration choice now. WorkplaceProofPanel must still come before
    // the process section so the employer-policy context lands early.
    expect(medCertLandingSource).not.toContain("CertificateTypeSelector")
    expect(medCertLandingSource.indexOf("<WorkplaceProofPanel")).toBeLessThan(
      medCertLandingSource.indexOf("<HowItWorksInline"),
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
    expect(medCertPageSource).toContain(
      "Medical Certificates Online | From ${PRICING_DISPLAY.MED_CERT} | InstantMed",
    )
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
    expect(trustBadgesSource).toContain('getApprovedClaim("clinical_decision_model")')
  })

  it("uses truthful static trust signals instead of fabricated daily activity", () => {
    const intentPage = readFileSync(
      join(root, "components/marketing/med-cert-intent-page.tsx"),
      "utf8",
    )

    expect(existsSync(join(root, "lib/marketing/daily-stats.ts"))).toBe(false)
    expect(intentPage).not.toContain("getDailyStats")
    expect(intentPage).not.toContain("reviewed today")
    expect(intentPage).not.toMatch(/Avg.*min/)
    expect(intentPage).toContain("Full refund if declined")
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

  it("keeps public eligibility strictly 18+ and retires child-as-patient claims", () => {
    expect(eligibilityAndAutomationSources).not.toMatch(/parental\/?guardian consent/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/parental consent required/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/minors may be assessed/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/we can issue certificates for children/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/complete(?:s)? the form on behalf of (?:your|the) child/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/parents? or guardians? can request medical certificates for their children/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/provide the child(?:'|&apos;|’)s details/i)
    expect(eligibilityAndAutomationSources).not.toMatch(/complex presentations in children under 18/i)
    expect(readFileSync(join(root, "app/terms/page.tsx"), "utf8")).toContain("Be at least 18 years of age")
    expect(medCertIntentSource).toContain("InstantMed currently accepts patients aged 18 and over only")
  })

  it("describes the active protocol boundary without implying post-issue review", () => {
    expect(eligibilityAndAutomationSources).not.toMatch(/individually reviewed afterward/i)
    expect(eligibilityAndAutomationSources).toContain(
      "Standard medical-certificate requests are assessed under a Medical Director-approved clinical protocol. Concerning or uncertain certificate requests, and every prescribing request, require review by an AHPRA-registered doctor before issue.",
    )
    expect(eligibilityAndAutomationSources).toContain("AI never prescribes")
  })

  it("keeps static public response-time claims out until fresh evidence supports them", () => {
    expect(staticTimingClaimSources).not.toContain("averageResponseMinutes")
    expect(staticTimingClaimSources).not.toContain("certTurnaroundMinutes")
    expect(staticTimingClaimSources).not.toMatch(/average certificate delivery/i)
    expect(staticTimingClaimSources).not.toMatch(/average support response time/i)
  })
})
