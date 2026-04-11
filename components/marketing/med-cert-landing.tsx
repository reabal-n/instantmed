"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { HeroOutcomeMockup } from "@/components/marketing/hero-outcome-mockup"
import { EmployerLogoMarquee } from "@/components/shared/employer-logo-marquee"
import { ContextualMessage } from "@/components/marketing/contextual-message"
import { BADGE_REGISTRY } from "@/lib/trust-badges"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { ComplianceMarquee } from "@/components/shared/compliance-marquee"
import { SectionPill } from "@/components/ui/section-pill"
import { HeroTestimonialRotator } from "@/components/marketing/hero-testimonial-rotator"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
import { usePatientCount } from "@/lib/use-patient-count"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/hooks/use-landing-analytics"
import { useSectionVisibilityFunnel } from "@/hooks/use-section-visibility-funnel"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { CTABanner } from "@/components/sections"
import { FAQSection } from "@/components/sections"

// Below-fold lazy loads — keep initial bundle small
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
const ContentHubLinks = dynamic(
  () => import("@/components/seo/content-hub-links").then((m) => m.ContentHubLinks),
  { loading: () => <div className="min-h-[200px]" /> },
)
const MedCertGuideSection = dynamic(
  () => import("@/components/marketing/sections/med-cert-guide-section").then((m) => m.MedCertGuideSection),
  { loading: () => <div className="min-h-[600px]" /> },
)
const CompetitorLinksSection = dynamic(
  () => import("@/components/marketing/sections/competitor-links-section").then((m) => m.CompetitorLinksSection),
  { loading: () => <div className="min-h-[200px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const ROTATING_BADGES = [
  BADGE_REGISTRY.legally_valid.label,
  BADGE_REGISTRY.no_appointment.label,
  BADGE_REGISTRY.same_day.label,
  BADGE_REGISTRY.refund.label,
]


// =============================================================================
// SECTION COMPONENTS
// =============================================================================

/** Employer acceptance — logo marquee + verify/employer links */
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
          <EmployerLogoMarquee className="py-4" />
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

/** Section 1: Hero with product mockup + embedded trust signals */
function HeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section data-track-section="hero" aria-label="Medical certificate service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-8"
              initial={animate ? { y: -10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill alwaysAvailable />
            </motion.div>

            {/* Headline — plain h1 with CSS animation so LCP text is visible on first paint */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Sick today? Certificate in{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                your inbox in under an hour.
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance"
              initial={animate ? { y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Valid for work, uni, or carer&apos;s leave. Reviewed by an
              AHPRA-registered GP and delivered straight to your inbox.
            </motion.p>

            {/* Price anchor */}
            <motion.p
              className="text-sm font-semibold text-foreground mb-2 flex items-center justify-center lg:justify-start gap-1.5"
              initial={animate ? { y: 8 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.11 }}
            >
              From ${PRICING.MED_CERT.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground">- no hidden fees</span>
            </motion.p>

            {/* Rotating secondary proof badge */}
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 dark:text-primary/70">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <RotatingText texts={ROTATING_BADGES} interval={3000} />
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-4 sm:mb-6"
              initial={animate ? { y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                  onClick={onCTAClick}
                >
                  <Link href="/request?service=med-cert">
                    Get your certificate - ${PRICING.MED_CERT.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparison} clinic
                </p>
                <ContextualMessage service="med-cert" className="text-xs text-muted-foreground/80 italic mt-1" />
              </div>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              className="flex flex-col items-center lg:items-start gap-1"
              initial={animate ? { y: 8 } : {}}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TrustBadgeRow preset="hero_medcert" className="mt-3 justify-center lg:justify-start" />
              <TrustBadgeRow preset="trust_certifications" className="mt-2 justify-center lg:justify-start" />
              {/* Rotating testimonials */}
              <HeroTestimonialRotator className="mt-3 mx-auto lg:mx-0 text-center lg:text-left" />
            </motion.div>
          </div>

          {/* Hero product mockup — desktop only, mobile gets compact version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <MedCertHeroMockup />
          </div>

          {/* Mobile mockup — compact, below text content */}
          <div className="lg:hidden mt-4 w-full max-w-xs mx-auto">
            <MedCertHeroMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Outcome preview — what the approved certificate looks like */
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


// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function MedCertLanding() {
  const isDisabled = useServiceAvailability().isServiceDisabled("med-cert")
  const heroCTARef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics("med-cert")
  const patientCount = usePatientCount()

  useEffect(() => {
    const el = heroCTARef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Section visibility funnel tracking
  useSectionVisibilityFunnel(analytics.trackSectionView)

  // CTA click handlers with analytics
  const handleHeroCTA = useCallback(() => analytics.trackCTAClick("hero"), [analytics])
  const handleHowItWorksCTA = useCallback(() => analytics.trackCTAClick("how_it_works"), [analytics])
  const handleStickyCTA = useCallback(() => analytics.trackCTAClick("sticky_mobile"), [analytics])
  const handleEmployerClick = useCallback(() => analytics.trackCTAClick("employer_link"), [analytics])
  const handleVerifyClick = useCallback(() => analytics.trackCTAClick("verify_link"), [analytics])
  const handleFAQOpen = useCallback((question: string, index: number) => analytics.trackFAQOpen(question, index), [analytics])

  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden">
        {/* Temporarily unavailable banner */}
        {isDisabled && (
          <div className="sticky top-0 z-40 mx-4 mt-2 mb-0 rounded-2xl border border-warning-border bg-warning-light px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-warning">
                This service is temporarily unavailable.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-200">
                We&apos;ll be back soon.{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline hover:no-underline"
                >
                  Contact us
                </a>{" "}
                if you have questions.
              </p>
            </div>
          </div>
        )}

        {/* Returning patient recognition */}
        <ReturningPatientBanner className="mx-4 mt-2" />

        <Navbar variant="marketing" />

        <main id="main" className="relative">
          {/* 1. Hero */}
          <HeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* 2. Certificate type selector — engagement hook + pricing + comparison */}
          <div data-track-section="selector">
            <CertificateTypeSelector />
          </div>

          {/* 3. Regulatory authority logos — scrolling B&W marquee */}
          <RegulatoryPartners />

          {/* 4. How It Works */}
          <div data-track-section="how_it_works">
            <HowItWorksSection onCTAClick={handleHowItWorksCTA} />
          </div>

          {/* 5. Outcome preview — what approval looks like */}
          <OutcomePreviewSection />

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

          {/* 6. Social proof — reviews, doctor credibility, stats */}
          <div data-track-section="social_proof">
            <SocialProofSection />
          </div>

          {/* 7. Employer acceptance — logo marquee + links */}
          <EmployerCalloutStrip onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

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
              subtitle="Two minutes on your phone. A real doctor reviews it. Certificate in your inbox."
              ctaText={isDisabled ? "Contact us" : `Get your certificate - $${PRICING.MED_CERT.toFixed(2)}`}
              ctaHref={isDisabled ? "/contact" : "/request?service=med-cert"}
            />
          </div>
        </main>

        {/* Compliance strip */}
        <ComplianceMarquee />

        <MarketingFooter />

        {/* SEO content — below footer, doesn't disrupt conversion funnel */}
        <MedCertGuideSection />
        <CompetitorLinksSection slugs={["instantmed-vs-cleanbill", "instantmed-vs-qoctor", "instantmed-vs-instantscripts"]} />
        <ContentHubLinks service="med-cert" />

        {/* Sticky mobile CTA — bottom drawer, appears after hero scrolls out */}
        <motion.div
          role="region"
          aria-label="Quick purchase"
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
          initial={prefersReducedMotion ? {} : { y: 100 }}
          animate={prefersReducedMotion
            ? { opacity: showStickyCTA ? 1 : 0 }
            : { y: showStickyCTA ? 0 : 100 }
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-hidden={!showStickyCTA}
        >
          <div className="bg-white/90 dark:bg-card/90 backdrop-blur-lg border-t border-border/50 px-4 pt-2.5 pb-3 safe-area-pb">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Doctor available now · <span className="line-through text-muted-foreground/50">{SOCIAL_PROOF.gpPriceStandard} GP</span> · Available 24/7
            </p>
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
              disabled={isDisabled}
              onClick={handleStickyCTA}
            >
              <Link href={isDisabled ? "/contact" : "/request?service=med-cert"}>
                {isDisabled
                  ? "Contact us"
                  : `Get your certificate - $${PRICING.MED_CERT.toFixed(2)}`}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground/50">Secured by Stripe</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground/50">Apple Pay</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground/50">Google Pay</span>
            </div>
          </div>
        </motion.div>

        {/* Sticky desktop CTA — top bar, appears after hero scrolls out */}
        <motion.div
          role="region"
          aria-label="Quick purchase"
          className="hidden lg:block fixed top-0 left-0 right-0 z-40"
          initial={prefersReducedMotion ? {} : { y: -60 }}
          animate={prefersReducedMotion
            ? { opacity: showStickyCTA ? 1 : 0 }
            : { y: showStickyCTA ? 0 : -60, opacity: showStickyCTA ? 1 : 0 }
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-hidden={!showStickyCTA}
        >
          <div className="bg-white/95 dark:bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
            <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between gap-6">
              <p className="text-sm text-muted-foreground hidden xl:block">
                Doctor available now · Medical Certificate
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-muted-foreground">
                  <span className="line-through text-muted-foreground/50 mr-1.5">{SOCIAL_PROOF.gpPriceStandard}</span>
                  From <span className="font-semibold text-foreground">${PRICING.MED_CERT.toFixed(2)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => document.getElementById("certificate-type")?.scrollIntoView({ behavior: "smooth" })}
                >
                  See pricing
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-5 font-semibold shadow-sm shadow-primary/20"
                  disabled={isDisabled}
                  onClick={handleStickyCTA}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=med-cert"}>
                    {isDisabled ? "Contact us" : "Get your certificate"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MarketingPageShell>
  )
}
