"use client"

import {
  Building2,
  CheckCircle2,
  Search,
  ShieldCheck,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback } from "react"

import { StripePaymentLogos } from "@/components/checkout/payment-logos"
// Hero is above-fold - not lazy loaded
import { MedCertHeroSection } from "@/components/marketing/heroes/med-cert-hero"
import { IntakeResumeChip } from "@/components/marketing/intake-resume-chip"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { type LogoItem, ScrollingLogoMarquee } from "@/components/marketing/shared/scrolling-logo-marquee"
import { Reveal } from "@/components/ui/reveal"
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
    description: "Tell us about your symptoms and how long you've been unwell. Takes about 2 minutes.",
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
    ctaText: `Get your certificate \u00b7 $${PRICING.MED_CERT.toFixed(2)}`,
    ctaHref: "/request?service=med-cert",
    mobileSummary: "Med certs 24/7 \u00b7 ~20 min review",
    desktopLabel: "Doctor available now \u00b7 Medical Certificate",
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

/** Employer acceptance - scrolling logo marquee + verify/employer links */
function EmployerCalloutStrip({ onEmployerClick, onVerifyClick }: { onEmployerClick?: () => void; onVerifyClick?: () => void }) {
  return (
    <section data-track-section="employer" className="py-8 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] p-6 sm:p-8">
          <p className="text-center text-sm text-success font-medium flex items-center justify-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Accepted by {SOCIAL_PROOF.employerAcceptancePercent}% of Australian employers and universities
          </p>
          <p className="text-center text-xs text-muted-foreground mt-1">
            Legally valid under the Fair Work Act 2009 (Cth), s 107 - same as a GP certificate
          </p>
          <ScrollingLogoMarquee
            logos={EMPLOYER_LOGOS}
            colored
            tooltipPrefix="Accepted by"
            analyticsEvent="employer_marquee_view"
            className="py-4"
          />
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/for/employers"
              onClick={onEmployerClick}
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              For Employers & HR
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
  return (
    <section aria-label="Time comparison" className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <Reveal instant className="text-center mb-5">
          <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">Your time is valuable</p>
        </Reveal>
        <Reveal instant className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] p-5 sm:p-6">
          <ComparisonBar
            us={{
              label: "InstantMed",
              value: `~${SOCIAL_PROOF.certTurnaroundMinutes} min`,
              subtext: "Average delivery",
            }}
            them={{
              label: "GP clinic",
              value: "2+ hours",
              subtext: "Travel + wait + admin",
            }}
            ratio={0.25}
          />
        </Reveal>
      </div>
    </section>
  )
}

/** Outcome preview - what the approved certificate looks like */

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
            {/* Resume unfinished intake — shown above hero so returning visitors
                see it immediately without scrolling past the value prop. */}
            <IntakeResumeChip className="mx-4 mt-3 max-w-5xl sm:mx-auto" />

            {/* 1. Hero */}
            <MedCertHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

            {/* Live wait time strip — mirrors peer landing pages (scripts/ed/hair-loss). */}
            <LiveWaitTime variant="strip" services={["med-cert"]} />

            {/* 2. Employer acceptance — legitimacy before asking for a decision */}
            <EmployerCalloutStrip onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

            {/* 3. Certificate type selector — now the "pick your option" moment */}
            <div data-track-section="selector">
              <CertificateTypeSelector />
            </div>

            {/* 4. How It Works */}
            <div data-track-section="how_it_works">
              <HowItWorksInline
                steps={HOW_IT_WORKS_STEPS}
                ctaHref="/request?service=med-cert"
                ctaText={`Get your certificate \u00b7 $${PRICING.MED_CERT.toFixed(2)}`}
                onCTAClick={handleHowItWorksCTA}
                heading="How it works"
                subheading="No appointment, no waiting room. Fill a form, a doctor reviews it, and your certificate lands in your inbox."
              />
            </div>

            {/* 6. Time comparison data viz */}
            <CertComparisonViz />

            {/* 7. Social proof */}
            <div data-track-section="social_proof">
              <SocialProofSection />
            </div>

            {/* 10. What we cover / limitations */}
            <LimitationsSection />

            {/* 11. FAQ */}
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
              <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                Telehealth-issued medical certificates are accepted by Australian employers under the Fair Work Act 2009 (s 107). Telehealth consultations achieve equivalent clinical accuracy to in-person assessments for common presentations (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All certificates are issued by AHPRA-registered practitioners.
              </p>
            </div>

            {/* 12. Pre-CTA reassurance — refund first, then friction */}
            <div className="pt-6 sm:pt-8 pb-4 sm:pb-5">
              <div className="mx-auto max-w-2xl px-4 sm:px-6">
                <div className="flex items-center gap-3 rounded-full border border-success/20 bg-success/[0.04] dark:bg-success/[0.08] px-4 py-2.5 text-center justify-center">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <p className="text-xs sm:text-sm text-foreground">
                    <span className="font-semibold">100% refund guarantee.</span>
                    <span className="text-muted-foreground"> If our doctor can&apos;t issue your certificate, you pay nothing.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 13. Final CTA */}
            <div data-track-section="final_cta">
              <CTABanner
                title="Back to bed in two minutes."
                subtitle={`Fill the form, a real GP reviews it, and your certificate lands in your inbox. Trusted by ${patientCount.toLocaleString()}+ Australians.`}
                ctaText={isDisabled ? "Contact us" : `Get your certificate \u00b7 $${PRICING.MED_CERT.toFixed(2)}`}
                ctaHref={isDisabled ? "/contact" : "/request?service=med-cert"}
              />
            </div>

            {/* 14. Compliant with — regulatory logos footer closer */}
            <RegulatoryPartners />
          </>
        )
      }}
    </LandingPageShell>
  )
}
