"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  PhoneOff,
  Clock,
  Gift,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { EDHeroMockup } from "@/components/marketing/mockups/ed-hero-mockup"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/hooks/use-landing-analytics"
import { ED_FAQ } from "@/lib/data/ed-faq"

// Below-fold lazy loads - keep initial bundle small
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const HowItWorksSection = dynamic(
  () => import("@/components/marketing/sections/how-it-works-section").then((m) => m.HowItWorksSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const EDGuideSection = dynamic(
  () => import("@/components/marketing/sections/ed-guide-section").then((m) => m.EDGuideSection),
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
const EdOutcomesSection = dynamic(
  () => import("@/components/marketing/sections/ed-outcomes-section").then((m) => m.EdOutcomesSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const EdHookQuiz = dynamic(
  () => import("@/components/marketing/sections/ed-hook-quiz").then((m) => m.EdHookQuiz),
  { loading: () => <div className="min-h-[500px]" />, ssr: false },
)
const EdPrevalenceCalculator = dynamic(
  () => import("@/components/marketing/sections/ed-prevalence-calculator").then((m) => m.EdPrevalenceCalculator),
  { loading: () => <div className="min-h-[400px]" /> },
)
const EdMechanismExplainer = dynamic(
  () => import("@/components/marketing/sections/ed-mechanism-explainer").then((m) => m.EdMechanismExplainer),
  { loading: () => <div className="min-h-[500px]" /> },
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
const CompetitorLinksSection = dynamic(
  () => import("@/components/marketing/sections/competitor-links-section").then((m) => m.CompetitorLinksSection),
  { loading: () => <div className="min-h-[200px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const ROTATING_BADGES = [
  "No call needed",
  "Discreet packaging",
  "Doctor-reviewed",
  "Full refund if we can't help",
]

const PRICING_FEATURES = [
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Discreet packaging - nothing on the outside",
  "Full refund if we can't help",
]

const ED_HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Tell us what\u2019s going on",
    description: "Quick health form, takes about 2 minutes. No account needed to start.",
    badge: "~2 min",
  },
  {
    number: "2",
    title: "A real GP reviews it",
    description: "AHPRA-registered doctor reviews your assessment. Same standards as in-person.",
    badge: "~1 hour",
  },
  {
    number: "3",
    title: "eScript sent to your phone",
    description: "Your prescription is sent via SMS. Collect your treatment from any Australian pharmacy.",
    badge: "Same day",
  },
]

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

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
    <section aria-label="ED treatment service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-8"
              initial={animate ? { opacity: 0, y: -10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill alwaysAvailable />
            </motion.div>

            {/* Headline - plain h1 with CSS animation so LCP text is visible on first paint */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Discreet ED treatment,{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                reviewed by a real Australian doctor.
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance"
              initial={animate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Fill a short health form. A doctor reviews it and - if
              appropriate - sends treatment straight to your phone. No call,
              no waiting room.
            </motion.p>

            {/* Rotating secondary proof badge */}
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={animate ? { opacity: 0 } : {}}
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
              initial={animate ? { opacity: 0, y: 12 } : {}}
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
                  <Link href="/request?service=consult&subtype=ed">
                    Start assessment - ${PRICING.MENS_HEALTH.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  8am–10pm AEST, 7 days
                </p>
              </div>
            </motion.div>

            {/* Quick quiz anchor - low-commitment engagement hook */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-6"
              initial={animate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <a
                href="#ed-quiz"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors dark:text-primary/70 dark:hover:text-primary/90"
              >
                Not sure? Take a 30-second quiz
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </motion.div>

            {/* Trust signals - hidden on mobile to keep CTA above fold */}
            <motion.div
              className="hidden sm:flex flex-col gap-2"
              initial={animate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span>
                  AHPRA-registered doctors &middot; Discreet packaging
                  &middot; Full refund if we can&apos;t help
                </span>
              </p>
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary/80 dark:bg-primary/10 dark:border-primary/30 dark:text-primary/70">
                  <PhoneOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  No call required
                </div>
              </div>
              <TrustBadgeRow preset="trust_certifications" className="justify-center lg:justify-start" />
            </motion.div>

            {/* Secondary anchor CTA - desktop only */}
            <motion.div
              className="hidden sm:flex justify-center lg:justify-start mt-4"
              initial={animate ? { opacity: 0 } : {}}
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

          {/* Hero product mockup - desktop only, mobile gets version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <EDHeroMockup />
          </div>

          {/* Mobile mockup - below text content */}
          <div className="lg:hidden mt-4 w-full max-w-xs mx-auto">
            <EDHeroMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function ErectileDysfunctionLanding() {
  const isDisabled = useServiceAvailability().isServiceDisabled("ed")
  const heroCTARef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics("ed")

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

  // Testimonials data - service-specific with fallback
  const serviceTestimonials = getTestimonialsByService("consultation")
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
    light: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    button: "bg-primary hover:bg-primary/90",
  }

  // CTA click handlers with analytics
  const handleHeroCTA = useCallback(() => analytics.trackCTAClick("hero"), [analytics])
  const handleHowItWorksCTA = useCallback(() => analytics.trackCTAClick("how_it_works"), [analytics])
  const handleFinalCTA = useCallback(() => analytics.trackCTAClick("final_cta"), [analytics])
  const handleStickyCTA = useCallback(() => analytics.trackCTAClick("sticky_mobile"), [analytics])
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

          {/* 2. Single trust strip - wait time + doctors online indicator */}
          <LiveWaitTime variant="strip" services={["consult-ed"]} />

          {/* 3. Prevalence calculator - normalises shame before engagement */}
          <EdPrevalenceCalculator />

          {/* 4. Hook quiz - engagement after normalisation */}
          <section id="ed-quiz" className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 scroll-mt-20">
            <EdHookQuiz />
          </section>

          {/* 5. How It Works */}
          <HowItWorksSection
            onCTAClick={handleHowItWorksCTA}
            steps={ED_HOW_IT_WORKS_STEPS}
            ctaText={`Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=ed"
          />

          {/* 6. Mechanism explainer - completes the "how" narrative */}
          <EdMechanismExplainer />

          {/* 7. Guide - accordion-collapsed, all content rendered for SEO */}
          <EDGuideSection />

          {/* 8. Outcomes - what treatment is/isn't, contraindications visible */}
          <EdOutcomesSection />

          {/* 9. Doctor profile - trust signal */}
          <DoctorProfileSection />

          {/* 10. Pricing */}
          <PricingSection
            title="One flat fee. No hidden costs."
            subtitle="You only pay if the doctor approves treatment."
            price={PRICING.MENS_HEALTH}
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=consult&subtype=ed"}
            colors={pricingColors}
          />

          {/* 11. Testimonials */}
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our consultation service"
          />

          {/* Competitor comparisons - SEO internal links */}
          <CompetitorLinksSection slugs={["instantmed-vs-hub-health", "instantmed-vs-doctors-on-demand", "instantmed-vs-qoctor"]} />

          {/* Regulatory Partners - Medicare included */}
          <RegulatoryPartners className="py-12" />

          {/* 13. FAQ */}
          <FaqCtaSection
            onFAQOpen={handleFAQOpen}
            faqs={ED_FAQ}
            subtitle="Everything you need to know about ED treatment online."
          />

          {/* Referral awareness strip */}
          <div className="py-6 border-t border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" aria-hidden="true" />
                Know someone dealing with ED?{" "}
                <Link href="/patient" className="text-primary hover:underline font-medium">
                  Refer a friend
                </Link>
                {" "}- you both get $5 off.
              </p>
            </div>
          </div>

          {/* 15. Final CTA */}
          <FinalCtaSection
            onCTAClick={handleFinalCTA}
            title="Discreet ED treatment, reviewed by a real doctor."
            subtitle="Fill a short form. A doctor reviews it and - if appropriate - sends treatment straight to your phone. No call, no waiting room."
            ctaText={`Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=ed"
            price={PRICING.MENS_HEALTH}
          />
        </main>

        <MarketingFooter />

        {/* Content hub cross-links - distributes PageRank to condition/symptom/guide pages */}
        <ContentHubLinks service="consult" />


        {/* Sticky mobile CTA - bottom drawer, appears after hero scrolls out */}
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
              2-min form · Doctor-reviewed · No call needed
            </p>
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
              disabled={isDisabled}
              onClick={handleStickyCTA}
            >
              <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=ed"}>
                {isDisabled
                  ? "Contact us"
                  : `Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Sticky desktop CTA - top bar, appears after hero scrolls out */}
        <motion.div
          className="hidden lg:block fixed top-0 left-0 right-0 z-40"
          initial={prefersReducedMotion ? {} : { y: -60, opacity: 0 }}
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
                ED Treatment · Discreet &amp; doctor-reviewed
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-muted-foreground">
                  From <span className="font-semibold text-foreground">${PRICING.MENS_HEALTH.toFixed(2)}</span>
                </span>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-5 font-semibold shadow-sm shadow-primary/20"
                  disabled={isDisabled}
                  onClick={handleStickyCTA}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=ed"}>
                    {isDisabled ? "Contact us" : "Start assessment"}
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
