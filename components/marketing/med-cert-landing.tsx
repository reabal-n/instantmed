"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Search,
  ShieldCheck,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback } from "react"

import { ComplianceMarquee } from "@/components/marketing/compliance-marquee"
// Hero is above-fold - not lazy loaded
import { MedCertHeroSection } from "@/components/marketing/heroes/med-cert-hero"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { type LogoItem,ScrollingLogoMarquee } from "@/components/marketing/shared/scrolling-logo-marquee"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { usePatientCount } from "@/lib/hooks/use-patient-count"
import { useSectionVisibilityFunnel } from "@/lib/hooks/use-section-visibility-funnel"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

// Below-fold lazy loads
const CertificateTypeSelector = dynamic(
  () => import("@/components/marketing/sections/certificate-type-selector").then((m) => m.CertificateTypeSelector),
  { loading: () => <div className="min-h-[400px]" />, ssr: false },
)
const HowItWorksSection = dynamic(
  () => import("@/components/marketing/sections/how-it-works-section").then((m) => m.HowItWorksSection),
  { loading: () => <div className="min-h-[400px]" /> },
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
const MedCertGuideSection = dynamic(
  () => import("@/components/marketing/sections/med-cert-guide-section").then((m) => m.MedCertGuideSection),
  { loading: () => <div className="min-h-[600px]" /> },
)
const CompetitorLinksSection = dynamic(
  () => import("@/components/marketing/sections/competitor-links-section").then((m) => m.CompetitorLinksSection),
  { loading: () => <div className="min-h-[200px]" /> },
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

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "med-cert",
  analyticsId: "med-cert",
  sticky: {
    ctaText: `Get your certificate - $${PRICING.MED_CERT.toFixed(2)}`,
    ctaHref: "/request?service=med-cert",
    mobileSummary: "Doctor available now \u00b7 Available 24/7",
    desktopLabel: "Doctor available now \u00b7 Medical Certificate",
    priceLabel: `From $${PRICING.MED_CERT.toFixed(2)}`,
    desktopCtaText: "Get your certificate",
    pricingScrollTarget: "certificate-type",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
    mobileFooter: (
      <div className="flex items-center justify-center gap-2 mt-1.5">
        <span className="text-[10px] text-muted-foreground/50">Secured by Stripe</span>
        <span className="text-muted-foreground/30">&middot;</span>
        <span className="text-[10px] text-muted-foreground/50">Apple Pay</span>
        <span className="text-muted-foreground/30">&middot;</span>
        <span className="text-[10px] text-muted-foreground/50">Google Pay</span>
      </div>
    ),
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
          <p className="text-center text-sm text-success/90 font-medium flex items-center justify-center gap-2 mb-4">
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
              className="inline-flex items-center gap-1.5 font-medium text-primary/80 hover:text-primary transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              For Employers & HR
            </Link>
            <span className="text-border dark:text-white/20">|</span>
            <Link
              href="/verify"
              onClick={onVerifyClick}
              className="inline-flex items-center gap-1.5 font-medium text-primary/80 hover:text-primary transition-colors"
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

/** Data viz: certificate turnaround vs GP visit — compact */
function CertComparisonViz() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Time comparison" className="py-6 lg:py-8">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <motion.div
          className="text-center mb-4"
          initial={animate ? { y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-[0.12em]">Your time is valuable</p>
        </motion.div>
        <motion.div
          className="rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-sm p-4"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <ComparisonBar
            us={{
              label: "InstantMed",
              value: "~30 min",
              subtext: "Average delivery",
            }}
            them={{
              label: "GP clinic",
              value: "2+ hours",
              subtext: "Travel + wait + admin",
            }}
            ratio={0.25}
          />
        </motion.div>
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
            {/* 1. Hero */}
            <MedCertHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

            {/* 2. Certificate type selector — get intent before social proof */}
            <div data-track-section="selector">
              <CertificateTypeSelector />
            </div>

            {/* 3. Employer acceptance — validates the selection just made */}
            <EmployerCalloutStrip onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

            {/* 4. Regulatory authority logos */}
            <RegulatoryPartners />

            {/* 5. How It Works */}
            <div data-track-section="how_it_works">
              <HowItWorksSection onCTAClick={handleHowItWorksCTA} />
            </div>

            {/* 6. Time comparison data viz */}
            <div className="bg-muted/30 dark:bg-white/[0.02]">
              <CertComparisonViz />
            </div>

            {/* 7. Refund guarantee + trust counter — combined */}
            <section className="py-6 sm:py-8">
              <div className="mx-auto max-w-lg px-4">
                <div className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] p-5 flex items-center gap-4">
                  <div className="shrink-0">
                    <ShieldCheck className="h-9 w-9 text-success" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">100% refund guarantee</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      If our doctor can&apos;t issue your certificate, you get a full refund. Trusted by {patientCount.toLocaleString()}+ Australians.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. Social proof */}
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
                initialCount={6}
                onFAQOpen={handleFAQOpen}
                viewAllHref="/faq"
              />
            </div>

            {/* Clinical references */}
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4">
              <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
                Telehealth-issued medical certificates are accepted by Australian employers under the Fair Work Act 2009 (s 107). Telehealth consultations achieve equivalent clinical accuracy to in-person assessments for common presentations (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All certificates are issued by AHPRA-registered practitioners.
              </p>
            </div>

            {/* 12. Deep-dive guide + competitor links (SEO, above footer) */}
            <MedCertGuideSection />
            <CompetitorLinksSection slugs={["instantmed-vs-cleanbill", "instantmed-vs-qoctor", "instantmed-vs-instantscripts"]} />

            {/* 13. Pre-CTA friction removal */}
            <div className="py-6 sm:py-8">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {[
                  "No Medicare card needed",
                  "No phone call required",
                  "2-minute form",
                  "Full refund if declined",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border/40 bg-white dark:bg-card shadow-sm"
                  >
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 14. Final CTA */}
            <div data-track-section="final_cta">
              <CTABanner
                title="Let a doctor handle the paperwork"
                subtitle={`Trusted by ${patientCount.toLocaleString()}+ Australians. Two minutes on your phone, a real doctor reviews it, and your certificate lands in your inbox.`}
                ctaText={isDisabled ? "Contact us" : `Get your certificate - $${PRICING.MED_CERT.toFixed(2)}`}
                ctaHref={isDisabled ? "/contact" : "/request?service=med-cert"}
              />
            </div>

            {/* Compliance strip */}
            <ComplianceMarquee />
          </>
        )
      }}
    </LandingPageShell>
  )
}
