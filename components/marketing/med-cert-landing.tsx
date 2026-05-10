"use client"

import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MessageSquareText,
  RotateCcw,
  Search,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useCallback } from "react"

import { StripePaymentLogos } from "@/components/checkout/payment-logos"
import { Hero } from "@/components/marketing/hero"
import { IntakeResumeChip } from "@/components/marketing/intake-resume-chip"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { CertificateTypeSelector } from "@/components/marketing/sections/certificate-type-selector"
import { CommercialIntentLinksSection } from "@/components/marketing/sections/commercial-intent-links-section"
import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { LimitationsSection } from "@/components/marketing/sections/limitations-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared"
import { CTABanner, FAQSection } from "@/components/sections"
import { EmployerLogoMarquee } from "@/components/shared/employer-logo-marquee"
import { Heading } from "@/components/ui/heading"
import { PRICING } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { usePatientCount } from "@/lib/hooks/use-patient-count"
import { useSectionVisibilityFunnel } from "@/lib/hooks/use-section-visibility-funnel"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"
import { GUARANTEE, MED_CERT_WEDGE } from "@/lib/marketing/voice"
import { commercialCertificateLinks, commercialLocationLinks } from "@/lib/seo/commercial-links"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

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
    description: `An AHPRA-registered doctor reviews your assessment. Average review time is ~${SOCIAL_PROOF.averageResponseMinutes} minutes.`,
    time: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
  },
  {
    sticker: "certificate" as const,
    step: 3,
    title: "Certificate sent to you",
    description: "If approved, your medical certificate is emailed to you as a PDF with verification details.",
    time: "Same day",
  },
]

const MED_CERT_START_HREF = buildMedCertRequestHref({ duration: "1" })

const MED_CERT_PILL = (
  <div className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]">
    <span
      className="inline-flex items-center gap-0.5 text-amber-400"
      role="img"
      aria-label="Google star rating"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="w-3 h-3 fill-current" aria-hidden="true" />
      ))}
    </span>
    <span className="text-border/70" aria-hidden="true">&middot;</span>
    <span className="text-muted-foreground">No Medicare needed</span>
    <span className="text-border/70 hidden sm:inline" aria-hidden="true">&middot;</span>
    <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
        style={{ animation: "pulse 3s ease-in-out infinite" }}
        aria-hidden="true"
      />
      Open now
    </span>
  </div>
)

const FEE_DETAILS = [
  {
    icon: CreditCard,
    title: "What your fee covers",
    body: "The doctor review, certificate decision, secure PDF delivery, and verification details. No subscription.",
  },
  {
    icon: MessageSquareText,
    title: "If the doctor needs more",
    body: "They can message you through the secure platform. In rare cases, a quick call may be needed.",
  },
  {
    icon: RotateCcw,
    title: "If online review is not suitable",
    body: "We refund the request and explain why, so you are not paying for a dead end.",
  },
] as const

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "med-cert",
  analyticsId: "med-cert",
  sticky: {
    ctaText: `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`,
    ctaHref: MED_CERT_START_HREF,
    mobileSummary: "Doctor-issued certificate · Employer policies vary",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
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
 * footer links to /employers and /verify.
 */
function WorkplaceProofPanel({ onEmployerClick, onVerifyClick }: { onEmployerClick?: () => void; onVerifyClick?: () => void }) {
  return (
    <div data-track-section="employer">
      <ServiceClaimSection
        eyebrow="Workplace documentation"
        headline={
          <>
            Doctor-issued certificate with verification built in.
          </>
        }
        body="Issued by AHPRA-registered Australian doctors with standard sick-leave evidence details."
      >
        <div className="overflow-hidden rounded-2xl border border-border/45 bg-muted/25 dark:bg-white/[0.04]">
          <EmployerLogoMarquee className="border-0 bg-transparent py-5 sm:py-6" />
        </div>
        <div className="pt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/employers"
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

function FeeSuitabilityPanel() {
  return (
    <section aria-label="Medical certificate fee and suitability" className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-[1.75rem] border border-border/50 bg-white p-4 shadow-lg shadow-primary/[0.07] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
          <div className="rounded-2xl bg-muted/35 p-5 dark:bg-white/[0.04]">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Before payment
            </p>
            <Heading level="h2" className="mb-3 text-balance">
              Clear fee. Clear fallback.
            </Heading>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Most patients are trying to avoid a waiting room, not decode a
              health platform. This is the plain version of what happens.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {FEE_DETAILS.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border/50 bg-white p-4 shadow-sm shadow-primary/[0.04] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/10 dark:bg-card dark:shadow-none"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 text-primary transition-transform duration-200 group-hover:scale-105">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Data viz: certificate turnaround vs GP visit. Thin wrapper around the
 *  shared TimeComparisonViz primitive — same pattern is used on prescriptions
 *  with different copy + numbers. */
function CertComparisonViz() {
  return (
    <TimeComparisonViz
      heading="Back on the couch in minutes. Not hours."
      ours={{ label: "InstantMed", value: `~${SOCIAL_PROOF.certTurnaroundMinutes}`, unit: "min" }}
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
              pill={MED_CERT_PILL}
              primaryCta={{
                text: `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`,
                href: MED_CERT_START_HREF,
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
                {MED_CERT_WEDGE} AHPRA-registered Australian doctors review every request. PDF in your inbox, ready to forward. {GUARANTEE}
              </p>
            </Hero>

            {/* 2. Workplace evidence + employer-logo context in one section */}
            <WorkplaceProofPanel onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

            {/* 3. Compact certificate setup */}
            <div data-track-section="selector">
              <CertificateTypeSelector />
            </div>

            {/* 4. Time comparison - anchors the value prop before explaining the process */}
            <CertComparisonViz />

            <CommercialIntentLinksSection
              title="Common certificate searches"
              body="Useful routes for patients comparing same-day, work, carer, student, and local certificate options before starting a request."
              links={commercialCertificateLinks.slice(0, 6)}
              compactLinks={[
                ...commercialCertificateLinks.slice(6),
                ...commercialLocationLinks,
              ]}
              className="bg-muted/30 dark:bg-white/[0.02]"
            />

            {/* 5. How It Works */}
            <div data-track-section="how_it_works">
              <HowItWorksInline
                steps={HOW_IT_WORKS_STEPS}
                ctaHref={MED_CERT_START_HREF}
                ctaText={`Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`}
                onCTAClick={handleHowItWorksCTA}
                heading="How it works"
                subheading="No appointment, no waiting room. Fill a form, a doctor reviews it, and your certificate lands in your inbox."
              />
            </div>

            {/* 6. Fee and suitability - replaces the generic comparison table */}
            <FeeSuitabilityPanel />

            {/* 7. What we cover / limitations */}
            <LimitationsSection />

            {/* 8. FAQ */}
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
                The Fair Work Act 2009 (Cth), s 107 allows employers to request evidence for personal leave. Fair Work guidance says the evidence should satisfy a reasonable person. All InstantMed certificates are issued by AHPRA-registered practitioners.
              </p>
            </div>

            {/* 9. Final CTA — refund pre-pill removed in Pass 2; the
                CTABanner auto-renders the canonical GUARANTEE line below the
                CTA, so the dueling pre-CTA pill was redundant trust signal. */}
            <div data-track-section="final_cta">
              <CTABanner
                title="Back to bed in two minutes."
                subtitle={`Fill the form, a real GP reviews it, and your certificate lands in your inbox. Trusted by ${patientCount.toLocaleString()}+ Australians.`}
                ctaText={isDisabled ? "Contact us" : `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`}
                ctaHref={isDisabled ? "/contact" : MED_CERT_START_HREF}
              />
            </div>

            {/* 10. Compliant with - regulatory logos footer closer */}
            <RegulatoryPartners />
          </>
        )
      }}
    </LandingPageShell>
  )
}
