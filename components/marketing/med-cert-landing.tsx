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
  ChevronDown,
  AlertCircle,
  Clock,
  Gift,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { EmployerLogoMarquee } from "@/components/shared/employer-logo-marquee"
import { ContextualMessage } from "@/components/marketing/contextual-message"
import { AnimatedStat } from "@/components/marketing/animated-stat"
import { STAT_PRESETS } from "@/components/marketing/total-patients-counter"
import { BADGE_REGISTRY } from "@/lib/trust-badges"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/hooks/use-landing-analytics"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"

// Below-fold lazy loads — keep initial bundle small
const CertificateTypeSelector = dynamic(
  () => import("@/components/marketing/sections/certificate-type-selector").then((m) => m.CertificateTypeSelector),
  { loading: () => <div className="min-h-[400px]" />, ssr: false },
)
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const ExitIntentOverlay = dynamic(
  () => import("@/components/marketing/exit-intent-overlay").then((m) => m.ExitIntentOverlay),
  { ssr: false },
)
const HowItWorksSection = dynamic(
  () => import("@/components/marketing/sections/how-it-works-section").then((m) => m.HowItWorksSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const CertificatePreviewSection = dynamic(
  () => import("@/components/marketing/sections/certificate-preview-section").then((m) => m.CertificatePreviewSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const MedCertGuideSection = dynamic(
  () => import("@/components/marketing/sections/med-cert-guide-section").then((m) => m.MedCertGuideSection),
  { loading: () => <div className="min-h-[600px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const FaqCtaSection = dynamic(
  () => import("@/components/marketing/sections/faq-cta-section").then((m) => m.FaqCtaSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const FinalCtaSection = dynamic(
  () => import("@/components/marketing/sections/final-cta-section").then((m) => m.FinalCtaSection),
  { loading: () => <div className="min-h-[300px]" /> },
)
const LimitationsSection = dynamic(
  () => import("@/components/marketing/sections/limitations-section").then((m) => m.LimitationsSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const PricingSection = dynamic(
  () => import("@/components/marketing/sections/pricing-section").then((m) => m.PricingSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const ContentHubLinks = dynamic(
  () => import("@/components/seo/content-hub-links").then((m) => m.ContentHubLinks),
  { loading: () => <div className="min-h-[200px]" /> },
)
const RecentReviewsTicker = dynamic(
  () => import("@/components/marketing/recent-reviews-ticker").then((m) => m.RecentReviewsTicker),
  { loading: () => <div className="min-h-[40px]" /> },
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

const PRICING_FEATURES = [
  "Accepted by all Australian employers and universities",
  "Reviewed by an AHPRA-registered GP",
  "Secure PDF delivered to your inbox",
  "Covers work, uni, or carer\u2019s leave",
]

const SOCIAL_PROOF_STATS = STAT_PRESETS['med-cert']


// =============================================================================
// SECTION COMPONENTS
// =============================================================================

/** Social proof stats strip */
function SocialProofStrip() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Social proof statistics" className="py-8 border-y border-border/30 dark:border-white/10 bg-muted/50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
          initial={animate ? { y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {SOCIAL_PROOF_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex items-center gap-3"
              initial={animate ? { y: 10 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <stat.icon className={cn("w-5 h-5 shrink-0", stat.color)} aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold text-foreground leading-tight">
                  <AnimatedStat value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/** Employer acceptance — logo marquee + verify/employer links */
function EmployerCalloutStrip({ onEmployerClick, onVerifyClick }: { onEmployerClick?: () => void; onVerifyClick?: () => void }) {
  return (
    <div className="border-y border-border/30 dark:border-white/10 bg-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-success/90 font-medium flex items-center justify-center gap-2 pt-6">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Accepted by {SOCIAL_PROOF.employerAcceptancePercent}% of Australian employers and universities
        </p>
        <EmployerLogoMarquee className="py-5" />
        <div className="flex items-center justify-center gap-4 pb-6 text-xs text-muted-foreground">
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
    <section aria-label="Medical certificate service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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
              Medical certificates,{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                reviewed by a real Australian doctor.
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
                    Get your certificate — ${PRICING.MED_CERT.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparison} clinic
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Available 24/7
                </p>
                <ContextualMessage service="med-cert" className="text-xs text-muted-foreground/80 italic mt-1" />
              </div>
            </motion.div>

            {/* Selector anchor — low-commitment engagement hook */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-6"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <a
                href="#certificate-type"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors dark:text-primary/70 dark:hover:text-primary/90"
              >
                Not sure which type? Find out
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </motion.div>

            {/* Trust signals — hidden on mobile to keep CTA above fold */}
            <motion.div
              className="hidden sm:flex flex-col gap-2"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TrustBadgeRow preset="hero_medcert" className="mt-3" />
              <TrustBadgeRow preset="trust_certifications" className="justify-center lg:justify-start mt-1" />
            </motion.div>

            {/* Secondary anchor CTA */}
            <motion.div
              className="flex justify-center lg:justify-start mt-4"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                See how it works
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
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


// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function MedCertLanding() {
  const isDisabled = useServiceAvailability().isServiceDisabled("med-cert")
  const heroCTARef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics("med-cert")

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

  // Testimonials data — service-specific with fallback
  const serviceTestimonials = getTestimonialsByService("medical-certificate")
  const columnsData = serviceTestimonials.slice(0, 9).map((t) => ({
    text: t.text,
    image:
      t.image ||
      `https://api.dicebear.com/7.x/notionists/svg?seed=${t.name.replace(/\s/g, "")}`,
    name: `${t.name}${t.age ? `, ${t.age}` : ""}`,
    role: `${t.location}${t.role ? ` \u00b7 ${t.role}` : ""}`,
  }))
  const testimonialsForColumns =
    columnsData.length >= 6
      ? columnsData
      : getTestimonialsForColumns().slice(0, 9)

  const pricingColors = {
    light: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    button: "bg-primary hover:bg-primary/90",
  }

  // CTA click handlers with analytics
  const handleHeroCTA = useCallback(() => analytics.trackCTAClick("hero"), [analytics])
  const handleHowItWorksCTA = useCallback(() => analytics.trackCTAClick("how_it_works"), [analytics])
  const handleCertPreviewCTA = useCallback(() => analytics.trackCTAClick("certificate_preview"), [analytics])
  const handleFinalCTA = useCallback(() => analytics.trackCTAClick("final_cta"), [analytics])
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

        <main className="relative">
          {/* 1. Hero */}
          <HeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* 2. Live wait time */}
          <LiveWaitTime variant="strip" services={["med-cert"]} />

          {/* 3. Certificate type selector — engagement hook */}
          <CertificateTypeSelector />

          {/* 4. How It Works */}
          <HowItWorksSection onCTAClick={handleHowItWorksCTA} />

          {/* 5. Social proof stats — backs up the process with numbers */}
          <SocialProofStrip />

          {/* 6. Certificate Preview — what you'll receive */}
          <CertificatePreviewSection onCTAClick={handleCertPreviewCTA} />

          {/* 7. Employer acceptance — contextual after "what you get" */}
          <EmployerCalloutStrip onEmployerClick={handleEmployerClick} onVerifyClick={handleVerifyClick} />

          {/* 8. Guide — E-E-A-T content mid-funnel (Fair Work, validity, telehealth) */}
          <MedCertGuideSection />

          {/* 9. Limitations — honest boundaries before pricing */}
          <LimitationsSection />

          {/* 10. Doctor profile — trust signal before pricing */}
          <DoctorProfileSection />

          {/* 11. Pricing with comparison table */}
          <PricingSection
            title="One flat fee. Save ~$50 vs a GP."
            subtitle="One flat fee — no hidden costs. Full refund if we can't help."
            price={PRICING.MED_CERT}
            originalPrice="~$72"
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Get your certificate — $${PRICING.MED_CERT.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=med-cert"}
            colors={pricingColors}
            showComparisonTable
          />

          {/* 12. Testimonials + recent reviews */}
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our service"
          />
          <RecentReviewsTicker format="named" artifact="certificate" />

          {/* 13. Regulatory Partners — Medicare excluded (no rebate applies here) */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* 14. FAQ */}
          <FaqCtaSection
            onFAQOpen={handleFAQOpen}
            faqs={MED_CERT_FAQ}
            subtitle="Everything you need to know about getting your certificate."
          />

          {/* Referral awareness strip */}
          <div className="py-6 border-t border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" aria-hidden="true" />
                Know someone who needs a certificate?{" "}
                <Link href="/patient" className="text-primary hover:underline font-medium">
                  Refer a friend
                </Link>
                {" "}&mdash; you both get $5 off.
              </p>
            </div>
          </div>

          {/* 15. Final CTA */}
          <FinalCtaSection onCTAClick={handleFinalCTA} />
        </main>

        <MarketingFooter />

        {/* Content hub cross-links — distributes PageRank to condition/symptom/guide pages */}
        <ContentHubLinks service="med-cert" />

        {/* Exit-intent overlay — desktop only, once per session */}
        {!isDisabled && (
          <ExitIntentOverlay
            service="medical-certificate"
            onShow={() => analytics.trackExitIntent("shown")}
            onCTAClick={() => analytics.trackExitIntent("clicked")}
            onDismiss={() => analytics.trackExitIntent("dismissed")}
            onEmailCapture={() => analytics.trackExitIntent("email_captured")}
          />
        )}

        {/* Sticky mobile CTA — bottom drawer, appears after hero scrolls out */}
        <motion.div
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
              2-min form · GP-reviewed · Available 24/7
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
                  : `Get your certificate — $${PRICING.MED_CERT.toFixed(2)}`}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Sticky desktop CTA — top bar, appears after hero scrolls out */}
        <motion.div
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
                Medical Certificate · Available 24/7
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-muted-foreground">
                  From <span className="font-semibold text-foreground">${PRICING.MED_CERT.toFixed(2)}</span>
                </span>
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
