"use client"

import {
  Building2,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { StripePaymentLogos } from "@/components/checkout/payment-logos"
import { Hero } from "@/components/marketing/hero"
import { IntakeResumeChip } from "@/components/marketing/intake-resume-chip"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared"
import { type LogoItem, ScrollingLogoMarquee } from "@/components/marketing/shared/scrolling-logo-marquee"
import { Heading } from "@/components/ui/heading"
import { useReducedMotion } from "@/components/ui/motion"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { usePatientCount } from "@/lib/hooks/use-patient-count"
import { useSectionVisibilityFunnel } from "@/lib/hooks/use-section-visibility-funnel"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

// Below-fold lazy loads
const CertificateTypeSelector = dynamic(
  () => import("@/components/marketing/sections/certificate-type-selector").then((m) => m.CertificateTypeSelector),
  { loading: () => <div className="min-h-[400px]" /> },
)
const MedCertComparisonTable = dynamic(
  () => import("@/components/marketing/sections/certificate-type-selector").then((m) => m.MedCertComparisonTable),
  { loading: () => <div className="min-h-[300px]" /> },
)
const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((m) => m.HowItWorksInline),
  { loading: () => <div className="min-h-[300px]" /> },
)
const SocialProofSection = dynamic(
  () => import("@/components/marketing/social-proof-section").then((m) => m.SocialProofSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const LimitationsSection = dynamic(
  () => import("@/components/marketing/sections/limitations-section").then((m) => m.LimitationsSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const FAQSection = dynamic(
  () => import("@/components/sections").then((m) => ({ default: m.FAQSection })),
  { loading: () => <div className="min-h-[400px]" /> },
)
const CTABanner = dynamic(
  () => import("@/components/sections").then((m) => ({ default: m.CTABanner })),
  { loading: () => <div className="min-h-[300px]" /> },
)

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
    description: "Your medical certificate is emailed to you as a PDF. Valid under the Fair Work Act 2009.",
    time: "Same day",
  },
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "med-cert",
  analyticsId: "med-cert",
  sticky: {
    ctaText: `Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`,
    ctaHref: "/request?service=med-cert",
    // Mobile sticky now leads with the legitimacy claim, not wait time.
    mobileSummary: `Accepted by ${SOCIAL_PROOF.employerAcceptancePercent}% of AU employers · Fair Work Act`,
    desktopLabel: "Doctor available now · Medical Certificate",
    priceLabel: `From $${PRICING.MED_CERT.toFixed(2)}`,
    desktopCtaText: "Get your certificate",
    pricingScrollTarget: "certificate-type",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
    mobileFooter: <StripePaymentLogos className="mt-1.5 opacity-60" />,
  },
}

const EMPLOYER_LOGOS: LogoItem[] = [
  { name: "Woolworths", src: "/logos/woolworths.png" },
  { name: "Coles", src: "/logos/coles.png" },
  { name: "Commonwealth Bank", src: "/logos/commonwealthbank.png" },
  { name: "ANZ", src: "/logos/ANZ.png" },
  { name: "NAB", src: "/logos/nab.png" },
  { name: "Westpac", src: "/logos/westpac.png" },
  { name: "BHP", src: "/logos/BHP.png" },
  { name: "Telstra", src: "/logos/telstra.png" },
  { name: "JB Hi-Fi", src: "/logos/jbhifi.png" },
  { name: "McDonald's", src: "/logos/mcdonalds.png" },
  { name: "Sonic Healthcare", src: "/logos/sonichealthcare.png" },
  { name: "Bunnings", src: "/logos/bunnings.png" },
  { name: "Amazon", src: "/logos/amazon.png" },
  { name: "Qantas", src: "/logos/qantas.svg" },
  { name: "Deloitte", src: "/logos/deloitte.svg" },
  { name: "PwC", src: "/logos/pwc.svg" },
  { name: "KPMG", src: "/logos/kpmg.svg" },
  { name: "Bupa", src: "/logos/bupa.svg" },
]

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/**
 * Employer acceptance — the page's superpower.
 *
 * Pass 3 elevation:
 *   - /colorize: Morning Canvas warmth tint on the section background
 *     (peach/champagne radial) so the section reads as a warm anchor
 *     rather than another generic card.
 *   - /bolder: percentage moment is bumped to display-weight typography
 *     and headlined as the section's claim. Marquee gets more breathing
 *     room. Footer links separated from the claim with a hairline.
 */
function EmployerCalloutStrip({ onEmployerClick, onVerifyClick }: { onEmployerClick?: () => void; onVerifyClick?: () => void }) {
  return (
    <section
      data-track-section="employer"
      className="relative py-10 sm:py-14 lg:py-16 overflow-hidden"
    >
      {/* Morning Canvas warmth — soft peach radial that fades into ivory.
          Anchors the section as a warm trust moment without competing with
          the colored employer logos inside the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 dark:opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(245, 198, 160, 0.18) 0%, rgba(245, 198, 160, 0.06) 40%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.08] dark:shadow-none p-7 sm:p-10 lg:p-12">
          {/* Headline claim — the page's strongest trust signal, given
              display-tier prominence. */}
          <div className="text-center mb-6 sm:mb-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-success uppercase tracking-[0.12em] mb-3">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Accepted everywhere it counts
            </p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.02em] text-foreground leading-[1.15] text-balance">
              <span className="text-primary tabular-nums">{SOCIAL_PROOF.employerAcceptancePercent}%</span> of Australian employers and universities accept it.
            </p>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Legally valid under the Fair Work Act 2009 (Cth), s 107. Same legal weight as a GP certificate.
            </p>
          </div>

          <ScrollingLogoMarquee
            logos={EMPLOYER_LOGOS}
            colored
            tooltipPrefix="Accepted by"
            analyticsEvent="employer_marquee_view"
            className="py-2 sm:py-3"
          />

          <div className="mt-6 sm:mt-8 pt-5 border-t border-border/30 flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
        </div>
      </div>
    </section>
  )
}

/** Data viz: certificate turnaround vs GP visit */
function CertComparisonViz() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const active = inView || prefersReducedMotion

  return (
    <section aria-label="Time comparison" className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal instant className="text-center mb-10">
          <SectionPill>Time saved</SectionPill>
          <Heading level="h2" className="mt-3">
            Back on the couch in minutes. Not hours.
          </Heading>
        </Reveal>

        <div ref={ref} className="space-y-5">
          {/* Labels + times */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">InstantMed</p>
              <p className="text-4xl sm:text-5xl font-semibold tabular-nums text-foreground leading-none">
                ~{SOCIAL_PROOF.certTurnaroundMinutes}
                <span className="text-xl font-normal text-muted-foreground ml-1">min</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">GP clinic</p>
              <p className="text-4xl sm:text-5xl font-semibold tabular-nums text-muted-foreground/60 leading-none">
                2+
                <span className="text-xl font-normal ml-1">hrs</span>
              </p>
            </div>
          </div>

          {/* Race track */}
          <div className="relative h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={prefersReducedMotion ? "absolute inset-y-0 left-0 bg-border/50 rounded-full" : "absolute inset-y-0 left-0 bg-border/50 rounded-full transition-[width] duration-[1000ms] ease-out"}
              style={{
                width: active ? '100%' : '0%',
                transitionDelay: active && !prefersReducedMotion ? '300ms' : '0ms',
              }}
            />
            <div
              className={prefersReducedMotion ? "absolute inset-y-0 left-0 bg-primary rounded-full" : "absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-700 ease-out"}
              style={{
                width: active ? '18%' : '0%',
                transitionDelay: active && !prefersReducedMotion ? '80ms' : '0ms',
              }}
            />
          </div>

          {/* Step breakdown */}
          <div className="grid grid-cols-2 gap-6 pt-1">
            <div className="space-y-2">
              {[
                "2 min form",
                "GP reviews your request",
                "Certificate in your inbox",
              ].map((step) => (
                <p key={step} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  {step}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              {[
                "Call to book appointment",
                "Travel to clinic",
                "Waiting room and consult",
              ].map((step) => (
                <p key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {step}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
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
                    Accepted by Woolworths, CBA, Telstra, and {SOCIAL_PROOF.employerAcceptancePercent}% of Australian employers.
                    <span className="text-muted-foreground"> Legally valid under Fair Work Act s 107.</span>
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
                Telehealth-issued medical certificates are accepted by Australian employers under the Fair Work Act 2009 (s 107). Telehealth consultations achieve equivalent clinical accuracy to in-person assessments for common presentations (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All certificates are issued by AHPRA-registered practitioners.
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
