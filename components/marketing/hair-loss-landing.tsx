"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, AnimatePresence, useInView } from "framer-motion"
import { useReducedMotion, scrollRevealConfig } from "@/components/ui/motion"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  PhoneOff,
  Clock,
  Star,
  ShieldCheck,
  Gift,
  Pill,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { HairLossHeroMockup } from "@/components/marketing/mockups/hair-loss-hero-mockup"
import { PricingSection } from "@/components/marketing/sections/pricing-section"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { ContextualMessage } from "@/components/marketing/contextual-message"
import { RecentReviewsTicker } from "@/components/marketing/recent-reviews-ticker"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ContentHubLinks } from "@/components/seo/content-hub-links"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import { SOCIAL_PROOF } from "@/lib/social-proof"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/hooks/use-landing-analytics"
import { HAIR_LOSS_FAQ } from "@/lib/data/hair-loss-faq"

// Below-fold lazy loads — keep initial bundle small
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
const HairLossGuideSection = dynamic(
  () => import("@/components/marketing/sections/hair-loss-guide-section").then((m) => m.HairLossGuideSection),
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
const HairLossLimitationsSection = dynamic(
  () => import("@/components/marketing/sections/hair-loss-limitations-section").then((m) => m.HairLossLimitationsSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const HairLossHookQuiz = dynamic(
  () => import("@/components/marketing/sections/hair-loss-hook-quiz").then((m) => m.HairLossHookQuiz),
  { loading: () => <div className="min-h-[500px]" />, ssr: false },
)
const HairLossProgressTimeline = dynamic(
  () => import("@/components/marketing/sections/hair-loss-progress-timeline").then((m) => m.HairLossProgressTimeline),
  { loading: () => <div className="min-h-[400px]" /> },
)
const HairLossFamilyHistoryStrip = dynamic(
  () => import("@/components/marketing/sections/hair-loss-family-history-strip").then((m) => m.HairLossFamilyHistoryStrip),
  { loading: () => <div className="min-h-[200px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const ROTATING_BADGES = [
  "No call needed",
  "Discreet packaging",
  "Evidence-based treatments",
  "Full refund if we can't help",
]

const PRICING_FEATURES = [
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Discreet packaging — nothing on the outside",
  "Full refund if we can't help",
]

const SOCIAL_PROOF_STATS = [
  { icon: Clock, value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: " min", label: "avg review time", color: "text-primary" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
  { icon: ShieldCheck, value: SOCIAL_PROOF.certApprovalPercent, suffix: "%", label: "approval rate", color: "text-success" },
  { icon: CheckCircle2, value: SOCIAL_PROOF.refundPercent, suffix: "%", label: "refund if we can't help", color: "text-success" },
]

const RECENT_ACTIVITY_ENTRIES = [
  { city: "Melbourne", minutesAgo: 18 },
  { city: "Sydney", minutesAgo: 37 },
  { city: "Brisbane", minutesAgo: 9 },
  { city: "Perth", minutesAgo: 52 },
  { city: "Adelaide", minutesAgo: 14 },
  { city: "Gold Coast", minutesAgo: 29 },
  { city: "Canberra", minutesAgo: 6 },
  { city: "Hobart", minutesAgo: 44 },
]

const RELATED_ARTICLES: Array<{ title: string; href: string }> = []

const HAIR_LOSS_HOW_IT_WORKS_STEPS = [
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
    title: "Treatment plan delivered",
    description: "eScript sent to your phone via SMS. Collect your treatment from any Australian pharmacy.",
    badge: "Same day",
  },
]

const TREATMENT_OPTIONS = [
  {
    id: "oral",
    name: "Oral treatment option",
    brand: "Daily oral option",
    description:
      "Doctor-prescribed oral treatment taken once daily. Addresses the hormonal factors that contribute to hair follicle miniaturisation.",
    type: "Oral tablet",
    frequency: "Once daily",
    results: "Visible results typically 3–6 months",
    bestFor: "Hair loss at the crown and mid-scalp",
    popular: true,
  },
  {
    id: "topical",
    name: "Topical treatment option",
    brand: "Applied treatment option",
    description:
      "Doctor-prescribed topical solution or foam applied directly to the scalp. Stimulates hair follicles and supports regrowth.",
    type: "Topical solution/foam",
    frequency: "Once or twice daily",
    results: "Visible results typically 2–4 months",
    bestFor: "Thinning hair or receding hairline",
    popular: true,
  },
  {
    id: "combination",
    name: "Combination approach",
    brand: "Dual treatment approach",
    description:
      "Using both oral and topical treatments together for maximum effectiveness. Addresses hair loss through multiple mechanisms at once.",
    type: "Oral + topical",
    frequency: "As directed by your doctor",
    results: "Often more effective than either alone",
    bestFor: "Moderate to advanced hair loss",
    popular: false,
  },
] as const

// =============================================================================
// SMALL COMPONENTS
// =============================================================================

/** Live activity ticker — rotates through recent hair loss treatment deliveries */
function RecentActivityTicker() {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % RECENT_ACTIVITY_ENTRIES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const entry = RECENT_ACTIVITY_ENTRIES[index]

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
      <div className="relative h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            className="block leading-5"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            A patient in {entry.city} received their treatment plan {entry.minutesAgo} min ago
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Animated number counter using NumberFlow when available */
function AnimatedStat({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(value) // init to real value — no flash on load
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated) return

    // If already in the viewport on mount, mark done — no animation needed
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setHasAnimated(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          observer.disconnect()

          if (prefersReducedMotion) return // already showing real value

          // Count up from 0
          setDisplayed(0)
          const duration = 1200
          const start = performance.now()
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplayed(eased * value)
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, hasAnimated, prefersReducedMotion])

  const formatted = decimals > 0
    ? displayed.toFixed(decimals)
    : Math.round(displayed).toLocaleString()

  return (
    <span ref={ref}>
      {formatted}{suffix}
    </span>
  )
}

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
          initial={animate ? { opacity: 0, y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {SOCIAL_PROOF_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex items-center gap-3"
              initial={animate ? { opacity: 0, y: 10 } : {}}
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
    <section aria-label="Hair loss treatment service overview" className="relative overflow-hidden pt-8 pb-10 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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

            {/* Headline — plain h1 with CSS animation so LCP text is visible on first paint */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Hair loss treatment,{" "}
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
              Doctor-led assessment for hair loss treatment. Discreet,
              evidence-based, and no call required.
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
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-6"
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
                  <Link href="/request?service=consult&subtype=hair_loss">
                    Start assessment — ${PRICING.HAIR_LOSS.toFixed(2)}
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

            {/* Trust signals — hidden on mobile to keep CTA above fold */}
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
            </motion.div>

            {/* Secondary anchor CTA — desktop only */}
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

          {/* Hero product mockup — desktop only, mobile gets version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HairLossHeroMockup />
          </div>

          {/* Mobile mockup — below text content */}
          <div className="lg:hidden mt-8 w-full max-w-sm mx-auto">
            <HairLossHeroMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Treatment options grid — oral / topical / combination cards */
function TreatmentOptions() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: scrollRevealConfig.once, amount: 0.1 })
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="treatments" aria-label="Hair loss treatment options" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-600 dark:text-violet-400 mb-3">
            Treatment options
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-2">
            Clinically-proven approaches
          </h2>
          <p className="text-sm text-muted-foreground">
            Your doctor recommends the best TGA-approved option for your assessment.
          </p>
        </div>

        <div ref={ref} className="space-y-4">
          {TREATMENT_OPTIONS.map((treatment, i) => (
            <motion.div
              key={treatment.id}
              className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { opacity: 1, y: 0 }
                    : {}
              }
              transition={{
                duration: 0.4,
                delay: i * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{treatment.name}</h3>
                    {treatment.popular && (
                      <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 text-xs border-0">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{treatment.brand}</p>
                </div>
                <Pill className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              </div>

              <p className="text-sm text-muted-foreground mb-4">{treatment.description}</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {[
                  { label: "Type", value: treatment.type },
                  { label: "Frequency", value: treatment.frequency },
                  { label: "Results", value: treatment.results },
                  { label: "Best for", value: treatment.bestFor },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="rounded-lg border border-border/50 bg-muted/30 p-3"
                  >
                    <p className="text-muted-foreground text-xs">{field.label}</p>
                    <p className="font-medium text-foreground">{field.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Related blog articles — internal links for SEO */
function RelatedArticles() {
  if (RELATED_ARTICLES.length === 0) return null

  return (
    <section aria-label="Related articles" className="py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Related reading
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {RELATED_ARTICLES.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-card border border-border/30 dark:border-white/15 text-sm text-foreground hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {article.title}
              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function HairLossLanding() {
  const isDisabled = useServiceAvailability().isServiceDisabled("hair-loss")
  const heroCTARef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics("hair-loss")

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
    light: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
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

          {/* Live wait time — hair loss routed via consult queue (HL-specific label) */}
          <LiveWaitTime variant="strip" services={["consult-hair-loss"]} />

          {/* 2. Hair loss hook quiz — Norwood self-rating + duration */}
          <HairLossHookQuiz />

          {/* 3. Social proof band — AnimatedStat + ContextualMessage + named ticker */}
          <section aria-label="Social proof" className="py-8 lg:py-12 border-b border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 text-center">
              <p className="text-base sm:text-lg text-foreground font-medium">
                <AnimatedStat
                  value={SOCIAL_PROOF.averageRating}
                  suffix="/5"
                  decimals={1}
                />{" "}
                <span className="text-muted-foreground text-sm sm:text-base">
                  patient rating &middot; AHPRA-registered doctors
                </span>
              </p>
              <ContextualMessage service="hair-loss" className="text-sm text-muted-foreground italic" />
              <RecentReviewsTicker format="named" artifact="treatment" />
            </div>
          </section>

          {/* Recent activity ticker */}
          <RecentActivityTicker />

          {/* Social proof stats */}
          <SocialProofStrip />

          {/* 2. How It Works */}
          <HowItWorksSection
            onCTAClick={handleHowItWorksCTA}
            steps={HAIR_LOSS_HOW_IT_WORKS_STEPS}
            ctaText={`Start assessment — $${PRICING.HAIR_LOSS.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=hair_loss"
          />

          {/* 2b. Treatment options — unique to hair loss, not on ED page */}
          <TreatmentOptions />

          {/* 3. Progress timeline — month-by-month regrowth expectations */}
          <HairLossProgressTimeline />

          {/* 4. Long-form guide — E-E-A-T content for SEO depth */}
          <HairLossGuideSection />

          {/* 5. Family history strip — reinforces genetic basis */}
          <HairLossFamilyHistoryStrip />

          {/* Doctor profile — trust signal, this page only */}
          <DoctorProfileSection />

          {/* Pre-qualify before pricing — reduces bad-fit conversions */}
          <HairLossLimitationsSection />

          {/* 4. Pricing */}
          <PricingSection
            title="One flat fee. No hidden costs."
            subtitle="You only pay if the doctor approves treatment."
            price={PRICING.HAIR_LOSS}
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Start assessment — $${PRICING.HAIR_LOSS.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=consult&subtype=hair_loss"}
            colors={pricingColors}
          />

          {/* 5. Testimonials */}
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our consultation service"
          />

          {/* Regulatory Partners — Medicare included */}
          <RegulatoryPartners className="py-12" />

          {/* 6. FAQ */}
          <FaqCtaSection
            onFAQOpen={handleFAQOpen}
            faqs={HAIR_LOSS_FAQ}
            subtitle="Everything you need to know about hair loss treatment online."
          />

          {/* Referral awareness strip */}
          <div className="py-6 border-t border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" aria-hidden="true" />
                Know someone dealing with hair loss?{" "}
                <Link href="/patient" className="text-primary hover:underline font-medium">
                  Refer a friend
                </Link>
                {" "}&mdash; you both get $5 off.
              </p>
            </div>
          </div>

          {/* 7. Final CTA */}
          <FinalCtaSection
            onCTAClick={handleFinalCTA}
            title="Start treating hair loss today."
            subtitle="Fill a short form. A doctor reviews it and — if appropriate — sends treatment straight to your phone. No call, no waiting room."
            ctaText={`Start assessment — $${PRICING.HAIR_LOSS.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=hair_loss"
            price={PRICING.HAIR_LOSS}
          />
        </main>

        <MarketingFooter />

        {/* Content hub cross-links — distributes PageRank to condition/symptom/guide pages */}
        <ContentHubLinks service="consult" />

        {/* Related articles — SEO internal linking (empty until hair loss blog slugs exist) */}
        <RelatedArticles />

        {/* Exit-intent overlay — desktop only, once per session */}
        {!isDisabled && (
          <ExitIntentOverlay
            service="consult"
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
              Doctor-reviewed hair loss treatment. No call needed.
            </p>
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
              disabled={isDisabled}
              onClick={handleStickyCTA}
            >
              <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=hair_loss"}>
                {isDisabled
                  ? "Contact us"
                  : `Start assessment — $${PRICING.HAIR_LOSS.toFixed(2)}`}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Sticky desktop CTA — top bar, appears after hero scrolls out */}
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
                Hair loss treatment &middot; Doctor-reviewed
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-muted-foreground">
                  From <span className="font-semibold text-foreground">${PRICING.HAIR_LOSS.toFixed(2)}</span>
                </span>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-5 font-semibold shadow-sm shadow-primary/20"
                  disabled={isDisabled}
                  onClick={handleStickyCTA}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=hair_loss"}>
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
