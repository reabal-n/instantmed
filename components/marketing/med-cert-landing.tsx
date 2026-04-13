"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Heart,
  Search,
  ShieldCheck,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback } from "react"

import { ComplianceMarquee } from "@/components/marketing/compliance-marquee"
import { HeroOutcomeMockup } from "@/components/marketing/hero-outcome-mockup"
// Hero is above-fold - not lazy loaded
import { MedCertHeroSection } from "@/components/marketing/heroes/med-cert-hero"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { type LogoItem,ScrollingLogoMarquee } from "@/components/marketing/shared/scrolling-logo-marquee"
import { ContentHubLinks } from "@/components/seo"
import { TrustBadgeRow } from "@/components/shared"
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
            Legally valid under the Fair Work Act - same as a GP certificate
          </p>
          <ScrollingLogoMarquee
            logos={EMPLOYER_LOGOS}
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

/** Data viz: certificate turnaround vs GP visit */
function CertComparisonViz() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Time comparison" className="py-10 lg:py-14">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <motion.div
          className="text-center mb-6"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <SectionPill>Time saved</SectionPill>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mt-4 mb-2">
            Your time is valuable
          </h2>
        </motion.div>
        <motion.div
          className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6"
          initial={animate ? { y: 16 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <ComparisonBar
            us={{
              label: "InstantMed",
              value: "~30 min",
              subtext: "Average certificate delivery time",
            }}
            them={{
              label: "GP clinic visit",
              value: "2+ hours",
              subtext: "Travel + wait + consult + admin",
            }}
            ratio={0.25}
          />
        </motion.div>
      </div>
    </section>
  )
}

/** Outcome preview - what the approved certificate looks like */
function OutcomePreviewSection() {
  return (
    <section data-track-section="outcome" className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <SectionPill>What you get</SectionPill>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-4">
              Here&apos;s what you&apos;ll get
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
              Your doctor reviews the request and issues a valid medical certificate,
              delivered straight to your inbox as a secure PDF.
            </p>
            <ul className="space-y-2.5">
              {[
                "Employer-accepted PDF certificate",
                "AHPRA-registered doctor on every cert",
                "Verifiable via our online portal",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-6 px-8 h-11 font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
            >
              <Link href="/request?service=med-cert">
                Get your certificate
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="shrink-0">
            <HeroOutcomeMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Certificate type comparison cards */
const CERT_TYPES = [
  {
    icon: Briefcase,
    title: "Work / Sick Leave",
    description: "For calling in sick to work. Covers 1-3 days. Most popular.",
    popular: true,
  },
  {
    icon: Heart,
    title: "Carer's Certificate",
    description: "For caring for a sick family member. Covers 1-3 days.",
    popular: false,
  },
  {
    icon: GraduationCap,
    title: "University / Student",
    description: "For missed classes, exams, or assignments. Covers 1-3 days.",
    popular: false,
  },
] as const

function CertTypeComparison() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section data-track-section="cert_types" className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-8"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <SectionPill>Certificate types</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-4">
            Which certificate do you need?
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {CERT_TYPES.map((cert, i) => (
            <motion.div
              key={cert.title}
              className="relative bg-white dark:bg-card border border-border/50 rounded-2xl shadow-md shadow-primary/[0.06] p-6 flex flex-col"
              initial={animate ? { y: 16, opacity: 0 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {cert.popular && (
                <span className="absolute -top-2.5 left-4 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  Most popular
                </span>
              )}
              <cert.icon className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground mb-1.5">{cert.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                {cert.description}
              </p>
              <p className="text-sm font-medium text-foreground mb-4">
                From ${PRICING.MED_CERT.toFixed(2)}
              </p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/request?service=med-cert">
                  Get started
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
          ))}
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
    <LandingPageShell config={LANDING_CONFIG} afterFooter={
      <>
        <MedCertGuideSection />
        <CompetitorLinksSection slugs={["instantmed-vs-cleanbill", "instantmed-vs-qoctor", "instantmed-vs-instantscripts"]} />
        <ContentHubLinks service="med-cert" />
      </>
    }>
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

            {/* 2. Certificate type selector */}
            <div data-track-section="selector">
              <CertificateTypeSelector />
            </div>

            {/* 3. Regulatory authority logos */}
            <RegulatoryPartners />

            {/* 4. How It Works */}
            <div data-track-section="how_it_works">
              <HowItWorksSection onCTAClick={handleHowItWorksCTA} />
            </div>

            {/* 5. Outcome preview */}
            <OutcomePreviewSection />

            {/* 5b. Time comparison data viz */}
            <div className="bg-muted/30 dark:bg-white/[0.02]">
              <CertComparisonViz />
            </div>

            {/* Refund guarantee + trust counter */}
            <section className="py-8 sm:py-12">
              <div className="mx-auto max-w-xl px-4 text-center">
                <div className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] p-6">
                  <ShieldCheck className="h-8 w-8 text-success mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground mb-2">100% refund guarantee</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If our doctor can&apos;t issue your certificate, you get a full refund. No questions asked.
                  </p>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Trusted by {patientCount.toLocaleString()}+ Australians
                </p>
              </div>
            </section>

            {/* 6. Social proof */}
            <div data-track-section="social_proof">
              <SocialProofSection />
            </div>

            {/* 7. Employer acceptance */}
            <EmployerCalloutStrip onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

            {/* 7b. Certificate type comparison */}
            <div className="bg-muted/30 dark:bg-white/[0.02]">
              <CertTypeComparison />
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
                initialCount={6}
                onFAQOpen={handleFAQOpen}
                viewAllHref="/faq"
              />
            </div>

            {/* 10. Pre-CTA friction removal */}
            <div className="py-6 sm:py-8">
              <p className="text-[10px] font-semibold text-muted-foreground/40 text-center mb-3 uppercase tracking-[0.15em]">
                No barriers
              </p>
              <TrustBadgeRow preset="pre_cta" className="justify-center gap-3" />
            </div>

            {/* 11. Final CTA */}
            <div data-track-section="final_cta">
              <CTABanner
                title="Let a doctor handle the paperwork"
                subtitle="Trusted by 3,000+ Australians. Two minutes on your phone, a real doctor reviews it, and your certificate lands in your inbox."
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
