"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Phone,
  Users,
  Clock,
  Star,
  ShieldCheck,
  Gift,
  ClipboardList,
  Stethoscope,
  FileCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { ConsultChatMockup } from "@/components/marketing/mockups/consult-chat-mockup"
import { PricingSection } from "@/components/marketing/sections/pricing-section"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ContentHubLinks } from "@/components/seo/content-hub-links"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import { FAQList } from "@/components/ui/faq-list"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
import { CONSULT_FAQ } from "@/lib/data/consult-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/hooks/use-landing-analytics"

// Below-fold lazy loads — keep initial bundle small
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const ExitIntentOverlay = dynamic(
  () => import("@/components/marketing/exit-intent-overlay").then((m) => m.ExitIntentOverlay),
  { ssr: false },
)
const ExpectCallStrip = dynamic(
  () => import("@/components/marketing/sections/expect-call-strip").then((m) => m.ExpectCallStrip),
  { loading: () => <div className="min-h-[60px]" /> },
)
const CommonConcernsSection = dynamic(
  () => import("@/components/marketing/sections/common-concerns-section").then((m) => m.CommonConcernsSection),
  { loading: () => <div className="min-h-[350px]" /> },
)
const SpecialisedConsultsSection = dynamic(
  () => import("@/components/marketing/sections/specialised-consults-section").then((m) => m.SpecialisedConsultsSection),
  { loading: () => <div className="min-h-[350px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const ConsultLimitationsSection = dynamic(
  () => import("@/components/marketing/sections/consult-limitations-section").then((m) => m.ConsultLimitationsSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const FinalCtaSection = dynamic(
  () => import("@/components/marketing/sections/final-cta-section").then((m) => m.FinalCtaSection),
  { loading: () => <div className="min-h-[300px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const ROTATING_BADGES = [
  "AHPRA registered doctors",
  "Medication if needed",
  "Same-day response",
  "Full refund if we can\u2019t help",
]

const PRICING_FEATURES = [
  "Full clinical assessment by an AHPRA-registered GP",
  "Phone or video consultation",
  "Medication if clinically appropriate",
  "Referral letters if needed",
  "Follow-up messaging with your doctor",
  "Written summary of your consultation",
]

const SOCIAL_PROOF_STATS = [
  { icon: Clock, value: 2, suffix: " hrs", label: "avg response", color: "text-primary" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
  { icon: Users, value: 100, suffix: "%", label: "AHPRA verified", color: "text-success" },
  { icon: ShieldCheck, value: 100, suffix: "%", label: "refund guarantee", color: "text-success" },
]

const RECENT_ACTIVITY_ENTRIES = [
  { name: "Chris", city: "Newcastle", minutesAgo: 22 },
  { name: "Jenny", city: "Brisbane", minutesAgo: 38 },
  { name: "Mark", city: "Melbourne", minutesAgo: 14 },
  { name: "Emma", city: "Sydney", minutesAgo: 45 },
  { name: "Michael", city: "Perth", minutesAgo: 9 },
  { name: "Sophie", city: "Canberra", minutesAgo: 31 },
  { name: "James", city: "Adelaide", minutesAgo: 18 },
  { name: "Lisa", city: "Hobart", minutesAgo: 52 },
]

const HOW_IT_WORKS_STEPS = [
  {
    icon: ClipboardList,
    title: "Describe your concern",
    description: "Answer a short questionnaire about your symptoms and health history. Takes 3\u20135 minutes.",
    time: "3\u20135 min",
  },
  {
    icon: Stethoscope,
    title: "Doctor assessment",
    description: "An AHPRA-registered GP reviews your information and calls you to discuss your concern.",
    time: "Within 2 hours",
  },
  {
    icon: FileCheck,
    title: "Treatment plan",
    description: "Receive your prescription, referral, or medical advice &mdash; all digitally, same day.",
    time: "Same day",
  },
]

const RELATED_ARTICLES = [
  { title: "When to See a Doctor Online vs In Person", href: "/blog/online-vs-in-person-doctor" },
  { title: "What to Expect from a Telehealth Consultation", href: "/blog/telehealth-consultation-guide" },
  { title: "Getting Referrals Through Telehealth", href: "/blog/telehealth-referrals" },
]

// =============================================================================
// SMALL COMPONENTS
// =============================================================================

/** Closing time countdown — shows "Closes in Xh Ym" during operating hours */
function ClosingCountdown() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    function update() {
      const now = new Date()
      const aestOffset = 10 * 60
      const utc = now.getTime() + now.getTimezoneOffset() * 60_000
      const aest = new Date(utc + aestOffset * 60_000)
      const hour = aest.getHours()
      const minute = aest.getMinutes()

      const openHour = SOCIAL_PROOF.operatingHoursStart
      const closeHour = SOCIAL_PROOF.operatingHoursEnd

      if (hour < openHour) {
        const minsUntilOpen = (openHour - hour) * 60 - minute
        const h = Math.floor(minsUntilOpen / 60)
        const m = minsUntilOpen % 60
        setLabel(`Opens in ${h}h ${m}m`)
      } else if (hour >= closeHour) {
        setLabel("Opens at 8am AEST")
      } else {
        const minsUntilClose = (closeHour - hour) * 60 - minute
        if (minsUntilClose <= 120) {
          const h = Math.floor(minsUntilClose / 60)
          const m = minsUntilClose % 60
          setLabel(h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`)
        } else {
          setLabel(null)
        }
      }
    }

    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!label) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <Clock className="h-3 w-3 shrink-0" />
      {label}
    </span>
  )
}

/** Live activity ticker — rotates through recent consult completions */
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
      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
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
            {entry.name} from {entry.city} completed their consult {entry.minutesAgo} min ago
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Day-of-week contextual hero message — time-aware copy near hero CTA */
function ContextualMessage() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const aestOffset = 10 * 60
    const utc = now.getTime() + now.getTimezoneOffset() * 60_000
    const aest = new Date(utc + aestOffset * 60_000)
    const hour = aest.getHours()
    const day = aest.getDay()

    if (day === 1 && hour < 12) {
      setMessage("Waiting weeks for a GP? Most consults are completed same day.")
    } else if (day === 0 && hour >= 17) {
      setMessage("Start tonight \u2014 doctor typically responds by Monday morning.")
    } else if (day >= 1 && day <= 5 && hour >= 18) {
      setMessage("Too late for a GP? We\u2019re open until 10pm AEST, seven days.")
    } else if ((day === 0 || day === 6) && hour >= 8 && hour < 17) {
      setMessage("Weekend and your GP is closed? We\u2019re open right now.")
    } else {
      setMessage(null)
    }
  }, [])

  if (!message) return null

  return (
    <p className="text-xs text-muted-foreground italic mt-1">
      {message}
    </p>
  )
}

/** Animated number counter */
function AnimatedStat({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(value)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated) return

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

          if (prefersReducedMotion) return

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
              <stat.icon className={cn("w-5 h-5 shrink-0", stat.color)} />
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

/** Section: Hero with consult mockup + embedded trust signals */
function HeroSection({
  ctaRef,
  onCTAClick,
  isDisabled,
}: {
  ctaRef?: React.RefObject<HTMLDivElement | null>
  onCTAClick?: () => void
  isDisabled?: boolean
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="General consultation service overview" className="relative overflow-hidden pt-8 pb-10 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline — plain h1 with CSS animation so LCP text is visible on first paint */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Talk to a doctor today.{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                From your phone.
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance"
              initial={animate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              A full clinical assessment with an AHPRA-registered GP.
              Medication, referrals, and medical advice &mdash; without the waiting room.
            </motion.p>

            {/* Rotating secondary proof badge */}
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={animate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 dark:text-primary/70">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
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
                  disabled={isDisabled}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
                    {isDisabled ? "Contact us" : `Start your consult \u2014 $${PRICING.CONSULT.toFixed(2)}`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparisonComplex} visit
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  Open today {SOCIAL_PROOF_DISPLAY.operatingHours} AEST &middot; 7 days
                </p>
                <ClosingCountdown />
                <ContextualMessage />
              </div>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              className="hidden sm:flex flex-col gap-2"
              initial={animate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  AHPRA-registered doctors &middot; Medication &amp; referrals if needed
                  &middot; Full refund if we can&apos;t help
                </span>
              </p>
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary/80 dark:bg-primary/10 dark:border-primary/30 dark:text-primary/70">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  Doctor calls when needed
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
                <ChevronDown className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          </div>

          {/* Hero product mockup — desktop only */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <ConsultChatMockup />
          </div>

          {/* Mobile mockup — compact, below text content */}
          <div className="lg:hidden mt-8 w-full max-w-sm mx-auto">
            <ConsultChatMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}

/** How It Works — inline 3-step section */
function HowItWorksInline({ onCTAClick, isDisabled }: { onCTAClick?: () => void; isDisabled?: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id="how-it-works" aria-label="How it works" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Three steps to a doctor consultation &mdash; no waiting room, no travel.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-10 mb-12">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className="relative flex flex-col items-center text-center md:items-start md:text-left"
              initial={animate ? { opacity: 0, y: 20 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {/* Step number + icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1.5">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{step.description}</p>
              <span className="text-xs font-medium text-primary/70">{step.time}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA after steps */}
        <motion.div
          className="flex justify-center"
          initial={animate ? { opacity: 0, y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
              {isDisabled ? "Contact us" : "Start your consult"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

/** Related blog articles — internal links for SEO */
function RelatedArticles() {
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
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
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

export function GeneralConsultLanding() {
  const isDisabled = useServiceAvailability().isServiceDisabled("consult")
  const heroCTARef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics("consult")

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
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
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
          <HeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} isDisabled={isDisabled} />

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult"]} />

          {/* Recent activity ticker */}
          <RecentActivityTicker />

          {/* Social proof stats */}
          <SocialProofStrip />

          {/* Expect a call reassurance */}
          <ExpectCallStrip />

          {/* 2. How It Works — inline 3-step */}
          <HowItWorksInline onCTAClick={handleHowItWorksCTA} isDisabled={isDisabled} />

          {/* Common concerns — what you can consult about */}
          <CommonConcernsSection />

          {/* Specialised consults — hair loss, weight loss, etc. */}
          <SpecialisedConsultsSection />

          {/* Doctor profile — trust signal */}
          <DoctorProfileSection />

          {/* Pre-qualify before pricing — reduces bad-fit conversions */}
          <ConsultLimitationsSection />

          {/* 3. Pricing */}
          <PricingSection
            title="One flat fee. Save $30\u201370 vs a clinic."
            subtitle="One flat fee \u2014 no gap fees, no surprises. Same quality of care as in-person."
            price={PRICING.CONSULT}
            originalPrice="~$120"
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Start your consult \u2014 $${PRICING.CONSULT.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=consult"}
            colors={{
              light: "bg-primary/10",
              text: "text-primary",
              border: "border-primary/20",
              button: "bg-primary hover:bg-primary/90",
            }}
            showComparisonTable={false}
          />

          {/* 4. Testimonials */}
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who\u2019ve used our service"
          />

          {/* Regulatory Partners — Medicare excluded */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* 5. FAQ */}
          <section id="faq" aria-label="Frequently asked questions" className="py-20 lg:py-24 scroll-mt-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-10"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight">
                  Common questions
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                  Everything you need to know about online consultations.
                </p>
              </motion.div>

              <FAQList
                items={CONSULT_FAQ as unknown as { question: string; answer: string }[]}
                itemClassName="border-b border-border/40 last:border-b-0 first:border-t first:border-t-border/40 rounded-none bg-transparent shadow-none px-0 hover:border-border/40 hover:shadow-none"
                onValueChange={(value) => {
                  if (value && handleFAQOpen) {
                    const idx = parseInt(value, 10)
                    handleFAQOpen(CONSULT_FAQ[idx]?.question ?? "", idx)
                  }
                }}
              />

              <motion.div
                className="mt-10 text-center"
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-muted-foreground mb-2 text-sm">
                  Still have questions?
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-primary underline underline-offset-2 hover:no-underline font-medium"
                >
                  {CONTACT_EMAIL}
                </a>
              </motion.div>
            </div>
          </section>

          {/* Referral awareness strip */}
          <div className="py-6 border-t border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" />
                Know someone who could use a doctor?{" "}
                <Link href="/patient" className="text-primary underline underline-offset-2 hover:no-underline font-medium">
                  Refer a friend
                </Link>
                {" "}&mdash; you both get $5 off.
              </p>
            </div>
          </div>

          {/* 6. Final CTA */}
          <FinalCtaSection onCTAClick={handleFinalCTA} />
        </main>

        <MarketingFooter />

        {/* Content hub cross-links — distributes PageRank to condition/symptom/guide pages */}
        <ContentHubLinks service="general-consult" />

        {/* Related articles — SEO internal linking, after footer */}
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
              Need to see a doctor? Open {SOCIAL_PROOF_DISPLAY.operatingHours} AEST.
            </p>
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
              disabled={isDisabled}
              onClick={handleStickyCTA}
            >
              <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
                {isDisabled
                  ? "Contact us"
                  : `Start your consult \u2014 $${PRICING.CONSULT.toFixed(2)}`}
                <ArrowRight className="ml-2 h-4 w-4" />
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
                General Consult &middot; Open {SOCIAL_PROOF_DISPLAY.operatingHours} AEST &middot; 7 days
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-muted-foreground">
                  From <span className="font-semibold text-foreground">${PRICING.CONSULT.toFixed(2)}</span>
                </span>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-5 font-semibold shadow-sm shadow-primary/20"
                  disabled={isDisabled}
                  onClick={handleStickyCTA}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
                    {isDisabled ? "Contact us" : "Start your consult"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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
