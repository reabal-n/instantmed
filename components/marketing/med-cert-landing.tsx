"use client"

import {
  Building2,
  CheckCircle2,
  Search,
} from "lucide-react"
import Link from "next/link"
import { useCallback } from "react"

import { StripePaymentLogos } from "@/components/checkout/payment-logos"
import { Hero } from "@/components/marketing/hero"
import { IntakeResumeChip } from "@/components/marketing/intake-resume-chip"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { CertificateTypeSelector, MedCertComparisonTable } from "@/components/marketing/sections/certificate-type-selector"
import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { LimitationsSection } from "@/components/marketing/sections/limitations-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared"
import { SocialProofSection } from "@/components/marketing/social-proof-section"
import { CTABanner, FAQSection } from "@/components/sections"
import { PRICING } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { usePatientCount } from "@/lib/hooks/use-patient-count"
import { useSectionVisibilityFunnel } from "@/lib/hooks/use-section-visibility-funnel"

// =============================================================================
// DATA
// =============================================================================

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Fill a short health form",
    description: "Tell us about your symptoms and how long you have been unwell. Takes about 2 minutes.",
    time: "~2 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor reviews your assessment after you submit.",
    time: "Doctor review",
  },
  {
    sticker: "certificate" as const,
    step: 3,
    title: "Certificate sent to you",
    description: "Your medical certificate is emailed to you as a PDF. Valid under the Fair Work Act 2009.",
    time: "Doctor review",
  },
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "med-cert",
  analyticsId: "med-cert",
  sticky: {
    ctaText: `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`,
    ctaHref: "/request?service=med-cert",
    mobileSummary: "Doctor-issued certificate · Employer policies vary",
    desktopLabel: "Doctor available now · Medical Certificate",
    priceLabel: `From $${PRICING.MED_CERT.toFixed(2)}`,
    desktopCtaText: "Get your certificate",
    pricingScrollTarget: "certificate-type",
    responseTime: "Doctor-reviewed request",
    mobileFooter: <StripePaymentLogos className="mt-1.5 opacity-60" />,
  },
}

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/**
 * Workplace evidence — explains verification without implying employer
 * endorsement, partnership, or guaranteed acceptance.
 *
 * Wraps the shared <ServiceClaimSection> primitive with med-cert-specific
 * footer links to /for/employers and /verify.
 */
function EmployerCalloutStrip({ onEmployerClick, onVerifyClick }: { onEmployerClick?: () => void; onVerifyClick?: () => void }) {
  return (
    <div data-track-section="employer">
      <ServiceClaimSection
        eyebrow="Workplace documentation"
        headline={
          <>
            Doctor-issued certificate with verification built in.
          </>
        }
        body="Issued by AHPRA-registered Australian doctors with standard sick-leave evidence details. Employer and institution policies may vary."
      >
        <div className="pt-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/for/employers"
            onClick={onEmployerClick}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            For Employers and HR
          </Link>
          <span className="h-3 w-px bg-border/60" aria-hidden="true" />
          <Link
            href="/verify"
            onClick={onVerifyClick}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Verify a Certificate
          </Link>
        </div>
      </ServiceClaimSection>
    </div>
  )
}

/** Data viz: certificate turnaround vs GP visit. Thin wrapper around the
 *  shared TimeComparisonViz primitive — same pattern is used on prescriptions
 *  with different copy + numbers. */
function CertComparisonViz() {
  return (
    <TimeComparisonViz
      heading="Back on the couch without the waiting room."
      ours={{ label: "InstantMed", value: "Online", unit: "" }}
      theirs={{ label: "GP clinic", value: "2", valueSuffix: "+", unit: "hrs" }}
      ourSteps={["2 min form", "GP reviews your request", "Certificate in your inbox"]}
      theirSteps={["Call to book appointment", "Travel to clinic", "Waiting room and consult"]}
      primaryFillPercent={18}
    />
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function MedCertLanding() {
  const patientCount = usePatientCount()

  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, analytics, handleHeroCTA, handleHowItWorksCTA, handleFAQOpen }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useSectionVisibilityFunnel(analytics.trackSectionView)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const handleEmployerClick = useCallback(() => analytics.trackCTAClick("employer_link"), [analytics])
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const handleVerifyClick = useCallback(() => analytics.trackCTAClick("verify_link"), [analytics])

        return (
          <>
            {/* Resume unfinished intake - shown above hero so returning visitors
                see it immediately without scrolling past the value prop. */}
            <IntakeResumeChip className="mx-4 mt-3 max-w-5xl sm:mx-auto" />

            {/* 1. Hero — canonical <Hero> with med-cert-specific title, CTA,
                employer-acceptance reassurance line, and the document-realism
                cert mockup. Bespoke MedCertHeroSection retired in Pass 2. */}
            <Hero
              title="Medical certificate. From your bed."
              primaryCta={{
                text: `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`,
                href: "/request?service=med-cert",
                onClick: handleHeroCTA,
                ref: heroCTARef,
              }}
              secondaryCta={null}
              beforeCta={
                <p className="inline-flex items-start sm:items-center gap-2 text-[13px] text-foreground max-w-xl mx-auto lg:mx-0 leading-snug text-left sm:text-center lg:text-left">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-px sm:mt-0" aria-hidden="true" />
                  <span>
                    Issued by AHPRA-registered Australian doctors.
                    <span className="text-muted-foreground"> Employer and institution policies may vary.</span>
                  </span>
                </p>
              }
              mockup={<MedCertHeroMockup />}
            >
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance">
                AHPRA-registered Australian GP reviews every request. PDF in your inbox, ready to forward.
              </p>
            </Hero>

            {/* 2. Employer acceptance - scrolling logos plus Fair Work citation */}
            <EmployerCalloutStrip onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

            {/* 3. Certificate type selector - cleaner version, no embedded comparison */}
            <div data-track-section="selector">
              <CertificateTypeSelector />
            </div>

            {/* 4. Time comparison - anchors the value prop before explaining the process */}
            <CertComparisonViz />

            {/* 5. How It Works */}
            <div data-track-section="how_it_works">
              <HowItWorksInline
                steps={HOW_IT_WORKS_STEPS}
                ctaHref="/request?service=med-cert"
                ctaText={`Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`}
                onCTAClick={handleHowItWorksCTA}
                heading="How it works"
                subheading="No appointment, no waiting room. Fill a form, a doctor reviews it, and your certificate lands in your inbox."
              />
            </div>

            {/* 6. Social proof - testimonials and stats */}
            <div data-track-section="social_proof">
              <SocialProofSection />
            </div>

            {/* 7. Online vs in-person GP comparison - moved out of the selector,
                framed as category comparison (not against named competitors). */}
            <div data-track-section="comparison">
              <MedCertComparisonTable />
            </div>

            {/* 8. What we cover / limitations */}
            <LimitationsSection />

            {/* 9. FAQ */}
            <div data-track-section="faq">
              <FAQSection
                pill="FAQ"
                title="Before you start"
                subtitle="Everything you need to know about getting your certificate."
                items={MED_CERT_FAQ}
                initialCount={4}
                onFAQOpen={handleFAQOpen}
                viewAllHref="/faq"
              />
            </div>

            {/* Clinical references */}
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                The Fair Work Act 2009 (Cth), s 107 allows employers to request medical evidence for personal leave. Telehealth consultations achieve equivalent clinical accuracy to in-person assessments for common presentations (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All certificates are issued by AHPRA-registered practitioners.
              </p>
            </div>

            {/* 10. Final CTA — refund pre-pill removed in Pass 2; the
                CTABanner auto-renders the canonical GUARANTEE line below the
                CTA, so the dueling pre-CTA pill was redundant trust signal. */}
            <div data-track-section="final_cta">
              <CTABanner
                title="Back to bed in two minutes."
                subtitle={`Fill the form, a real GP reviews it, and your certificate lands in your inbox. Trusted by ${patientCount.toLocaleString()}+ Australians.`}
                ctaText={isDisabled ? "Contact us" : `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`}
                ctaHref={isDisabled ? "/contact" : "/request?service=med-cert"}
              />
            </div>

            {/* 12. Compliant with - regulatory logos footer closer */}
            <RegulatoryPartners />
          </>
        )
      }}
    </LandingPageShell>
  )
}
