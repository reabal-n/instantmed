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
  PhoneOff,
  Users,
  Clock,
  Star,
  ShieldCheck,
  Gift,
  ClipboardList,
  Stethoscope,
  Smartphone,
  RefreshCw,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { EScriptHeroMockup } from "@/components/marketing/mockups/escript-hero-mockup"
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
import { PRESCRIPTION_FAQ } from "@/lib/data/prescription-faq"
import { RepeatRxGuideSection } from "@/components/marketing/sections/repeat-rx-guide-section"
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
const PBSCalloutStrip = dynamic(
  () => import("@/components/marketing/sections/pbs-callout-strip").then((m) => m.PBSCalloutStrip),
  { loading: () => <div className="min-h-[60px]" /> },
)
const EScriptExplainerSection = dynamic(
  () => import("@/components/marketing/sections/escript-explainer-section").then((m) => m.EScriptExplainerSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const SupportedMedicationsSection = dynamic(
  () => import("@/components/marketing/sections/supported-medications-section").then((m) => m.SupportedMedicationsSection),
  { loading: () => <div className="min-h-[350px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const PrescriptionLimitationsSection = dynamic(
  () => import("@/components/marketing/sections/prescription-limitations-section").then((m) => m.PrescriptionLimitationsSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const CompetitorLinksSection = dynamic(
  () => import("@/components/marketing/sections/competitor-links-section").then((m) => m.CompetitorLinksSection),
  { loading: () => <div className="min-h-[200px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const ROTATING_BADGES = [
  "Sent to your phone",
  "Any pharmacy in Australia",
  "Same-day delivery",
  "Full refund if we can\u2019t help",
]

const SOCIAL_PROOF_STATS = [
  { icon: Users, value: SOCIAL_PROOF.scriptFulfillmentPercent, suffix: "%", label: "fulfilled same day", color: "text-success" },
  { icon: Clock, value: SOCIAL_PROOF.averageResponseMinutes, suffix: " min", label: "avg response", color: "text-primary" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
  { icon: ShieldCheck, value: 100, suffix: "%", label: "refund guarantee", color: "text-success" },
]

const RECENT_ACTIVITY_ENTRIES = [
  { name: "David", city: "Gold Coast", minutesAgo: 15 },
  { name: "Jessica", city: "Adelaide", minutesAgo: 28 },
  { name: "Ryan", city: "Darwin", minutesAgo: 8 },
  { name: "Michelle", city: "Sydney", minutesAgo: 42 },
  { name: "Daniel", city: "Melbourne", minutesAgo: 19 },
  { name: "Karen", city: "Brisbane", minutesAgo: 35 },
  { name: "Ben", city: "Perth", minutesAgo: 11 },
  { name: "Sophia", city: "Canberra", minutesAgo: 51 },
]

const RELATED_ARTICLES = [
  { title: "Understanding eScripts in Australia", href: "/blog/understanding-escripts-australia" },
  { title: "How to Get a Repeat Prescription Online", href: "/blog/repeat-prescription-online" },
  { title: "PBS Subsidies: What You Need to Know", href: "/blog/pbs-subsidies-guide" },
]

const HOW_IT_WORKS_STEPS = [
  {
    icon: ClipboardList,
    step: 1,
    title: "Enter your medication",
    description: "Tell us what you need renewed. Takes about two minutes.",
    time: "~2 min",
  },
  {
    icon: Stethoscope,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor checks your request and medical history.",
    time: "~30 min",
  },
  {
    icon: Smartphone,
    step: 3,
    title: "eScript sent to your phone",
    description: "Your electronic prescription is sent via SMS. Take it to any pharmacy.",
    time: "Same day",
  },
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

/** Live activity ticker — rotates through recent eScript deliveries */
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
            initial={prefersReducedMotion ? {} : { y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {entry.name} from {entry.city} received their eScript {entry.minutesAgo} min ago
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
      setMessage("Running low? Most scripts are sent before lunchtime.")
    } else if (day === 0 && hour >= 17) {
      setMessage("Pharmacy tomorrow? Get your eScript sorted tonight.")
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

/** Hero section with eScript mockup + embedded trust signals */
function HeroSection({
  ctaRef,
  onCTAClick,
  isDisabled,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
  isDisabled?: boolean
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Prescription service overview" className="relative overflow-hidden pt-8 pb-10 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline — plain h1 with CSS animation so LCP text is visible on first paint */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Your prescription,{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                without the waiting room.
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance"
              initial={animate ? { y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              An AHPRA-registered GP reviews your request and sends an
              eScript straight to your phone. Any pharmacy in Australia,
              same day.
            </motion.p>

            {/* Rotating secondary proof badge */}
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={{}}
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
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-4"
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
                  disabled={isDisabled}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=prescription"}>
                    {isDisabled
                      ? "Contact us"
                      : `Renew medication \u2014 $${PRICING.REPEAT_SCRIPT.toFixed(2)}`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base"
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
                  New prescription
                </Link>
              </Button>
            </motion.div>
            {/* Sub-CTA labels */}
            <motion.div
              className="flex flex-col sm:flex-row items-center gap-x-6 gap-y-1 justify-center lg:justify-start mb-4 text-xs text-muted-foreground"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 shrink-0 text-primary" />
                Renewing an existing script — from ${PRICING.REPEAT_SCRIPT.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                Need something new — ${PRICING.NEW_SCRIPT.toFixed(2)}
              </span>
            </motion.div>
            <motion.div
              className="flex flex-col items-center lg:items-start gap-0.5 mb-6"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparisonComplex}
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
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  AHPRA-registered doctors &middot; Any pharmacy
                  &middot; Full refund if we can&apos;t help
                </span>
              </p>
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary/80 dark:bg-primary/10 dark:border-primary/30 dark:text-primary/70">
                  <PhoneOff className="h-3.5 w-3.5 shrink-0" />
                  No call required
                </div>
              </div>
              <TrustBadgeRow preset="trust_certifications" className="justify-center lg:justify-start" />
            </motion.div>

            {/* Secondary anchor CTA — desktop only */}
            <motion.div
              className="hidden sm:flex justify-center lg:justify-start mt-4"
              initial={{}}
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
            <EScriptHeroMockup />
          </div>

          {/* Mobile mockup — compact, below text content */}
          <div className="lg:hidden mt-8 w-full max-w-sm mx-auto">
            <EScriptHeroMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}

/** How It Works — simplified 3-step inline section */
function HowItWorksInline({ onCTAClick, isDisabled }: { onCTAClick?: () => void; isDisabled?: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id="how-it-works" aria-label="How it works" className="py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Three steps. No waiting room.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            From your couch to your pharmacy &mdash; most scripts are sent same day.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              className="relative bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl p-6 text-center"
              initial={animate ? { y: 16 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
            >
              {/* Step number */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-4">
                {step.step}
              </div>
              <step.icon className="mx-auto h-8 w-8 text-primary/70 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {step.description}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary/70">
                <Clock className="h-3 w-3" />
                {step.time}
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTA after steps */}
        <motion.div
          className="flex justify-center mt-10"
          initial={animate ? { y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : "/request?service=prescription"}>
              {isDisabled ? "Contact us" : "Renew your medication"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

/** Service differentiation — repeat ($29.95) vs new prescription ($49.95) */
function ServiceComparisonSection({ isDisabled }: { isDisabled?: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const services = [
    {
      icon: RefreshCw,
      title: "Repeat prescription",
      subtitle: "Renew a medication you already take",
      price: PRICING.REPEAT_SCRIPT,
      priceNote: "one-time fee",
      href: "/request?service=prescription",
      badge: "Most common",
      badgeColor: "bg-primary/10 text-primary",
      highlight: true,
      bullets: [
        "Medication you've been prescribed before",
        "eScript sent to your phone via SMS",
        "Works at any pharmacy Australia-wide",
        "PBS subsidies apply at the pharmacy",
        "Repeats included where appropriate",
      ],
    },
    {
      icon: FileText,
      title: "New prescription",
      subtitle: "Start a medication you haven't used before",
      price: PRICING.NEW_SCRIPT,
      priceNote: "one-time fee",
      href: "/request?service=consult",
      badge: null,
      badgeColor: "",
      highlight: false,
      bullets: [
        "Medication you haven't been prescribed",
        "Doctor assessment included",
        "eScript sent to your phone via SMS",
        "Full refund if unsuitable",
        "Most requests reviewed same day",
      ],
    },
  ]

  return (
    <section id="pricing" aria-label="Service options" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-sm shadow-primary/[0.04] mb-4">
            Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Repeat or new — one flat fee.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            No hidden costs. Full refund if we can&apos;t help.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              className={cn(
                "relative rounded-2xl border p-6 flex flex-col transition-all duration-300",
                service.highlight
                  ? "bg-white dark:bg-card border-primary/30 ring-2 ring-primary shadow-lg shadow-primary/[0.1] hover:shadow-xl hover:shadow-primary/[0.15] hover:-translate-y-1"
                  : "bg-white dark:bg-card border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5"
              )}
              initial={animate ? { y: 16 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
            >
              {service.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-primary/20", service.badgeColor)}>
                    {service.badge}
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <service.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">{service.subtitle}</p>
                </div>
              </div>

              <div className="mb-5">
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  ${service.price.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">{service.priceNote}</span>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={service.highlight ? "default" : "outline"}
                className={cn(
                  "w-full h-11 font-semibold",
                  service.highlight && "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                )}
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "/contact" : service.href}>
                  {isDisabled ? "Contact us" : `Get ${service.title.toLowerCase()}`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Subscription upsell for repeat patients */}
        <motion.div
          className="mt-8 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 sm:p-5 text-center"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-sm font-medium text-foreground mb-1">
            <RefreshCw className="inline w-3.5 h-3.5 text-primary mr-1.5 -mt-0.5" />
            Need repeat scripts every month?
          </p>
          <p className="text-sm text-muted-foreground">
            Subscribe &amp; Save for <span className="font-medium text-foreground">${PRICING.REPEAT_RX_MONTHLY}/mo</span> — your repeat script auto-renews each month with no forms to fill out.
            The option appears at checkout.
          </p>
        </motion.div>

        <motion.p
          className="text-center text-xs text-muted-foreground mt-6"
          initial={{}}
          whileInView={animate ? { opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          Not sure which you need?{" "}
          <span className="font-medium text-foreground">
            Repeat = medication you already take. New = something you haven&apos;t been prescribed.
          </span>
        </motion.p>
      </div>
    </section>
  )
}

/** Inline Final CTA — prescription-specific */
function FinalCTAInline({ onCTAClick, isDisabled }: { onCTAClick?: () => void; isDisabled?: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section aria-label="Get started" className="py-20 lg:py-24 bg-linear-to-br from-primary/5 via-primary/10 to-sky-100/50 dark:from-primary/10 dark:via-primary/5 dark:to-card">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4 tracking-tight">
            Your regular medication, renewed from home.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Answer a few questions. A doctor reviews it. Sent to your phone, same day.
          </p>
          <Button
            asChild
            size="lg"
            className="px-10 h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : "/request?service=prescription"}>
              {isDisabled ? "Contact us" : "Renew your medication"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-muted-foreground text-sm font-medium">
            From ${PRICING.REPEAT_SCRIPT.toFixed(2)} &middot; No account required
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Takes about 2 minutes &middot; Full refund if we can&apos;t help
          </p>
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

/** FAQ section — prescription-specific */
function PrescriptionFAQSection({ onFAQOpen }: { onFAQOpen?: (question: string, index: number) => void }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Frequently asked questions" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-balance">
            Everything you need to know about renewing your medication
          </p>
        </motion.div>
        <FAQList
          items={PRESCRIPTION_FAQ}
          type="single"
          onValueChange={(value: string) => {
            if (onFAQOpen && value) {
              const idx = PRESCRIPTION_FAQ.findIndex((f) => f.question === value)
              if (idx !== -1) onFAQOpen(value, idx)
            }
          }}
        />
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function PrescriptionsLanding() {
  const isDisabled = useServiceAvailability().isServiceDisabled("scripts")
  const heroCTARef = useRef<HTMLDivElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics("prescription")

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
  const serviceTestimonials = getTestimonialsByService("prescription")
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

          {/* Live wait time — scripts */}
          <LiveWaitTime variant="strip" services={["scripts"]} />

          {/* Recent activity ticker */}
          <RecentActivityTicker />

          {/* Social proof stats */}
          <SocialProofStrip />

          {/* PBS callout strip */}
          <PBSCalloutStrip />

          {/* 2. How It Works — simplified 3-step */}
          <HowItWorksInline onCTAClick={handleHowItWorksCTA} isDisabled={isDisabled} />

          {/* 3. eScript explainer */}
          <EScriptExplainerSection />

          {/* 4. Supported medications */}
          <SupportedMedicationsSection />

          {/* Doctor profile — trust signal */}
          <DoctorProfileSection />

          {/* Pre-qualify before pricing — reduces bad-fit conversions */}
          <PrescriptionLimitationsSection />

          {/* 5. Service comparison — repeat vs new Rx */}
          <ServiceComparisonSection isDisabled={isDisabled} />

          {/* 6. Testimonials */}
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our service"
          />

          {/* Competitor comparisons — SEO internal links */}
          <CompetitorLinksSection slugs={["instantmed-vs-instantscripts", "instantmed-vs-hub-health", "instantmed-vs-doctors-on-demand"]} />

          {/* Regulatory Partners — Medicare excluded */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* Deep E-E-A-T guide content */}
          <RepeatRxGuideSection />

          {/* 7. FAQ */}
          <PrescriptionFAQSection onFAQOpen={handleFAQOpen} />

          {/* Referral awareness strip */}
          <div className="py-6 border-t border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" />
                Know someone who needs their medication renewed?{" "}
                <Link href="/patient" className="text-primary underline underline-offset-2 hover:no-underline font-medium">
                  Refer a friend
                </Link>
                {" "}&mdash; you both get $5 off.
              </p>
            </div>
          </div>

          {/* 8. Final CTA */}
          <FinalCTAInline onCTAClick={handleFinalCTA} isDisabled={isDisabled} />
        </main>

        <MarketingFooter />

        {/* Content hub cross-links — distributes PageRank to condition/symptom/guide pages */}
        <ContentHubLinks service="prescriptions" />

        {/* Related articles — SEO internal linking, after footer */}
        <RelatedArticles />


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
              Need your medication? Open {SOCIAL_PROOF_DISPLAY.operatingHours} AEST.
            </p>
            <Button
              asChild
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
              disabled={isDisabled}
              onClick={handleStickyCTA}
            >
              <Link href={isDisabled ? "/contact" : "/request?service=prescription"}>
                {isDisabled
                  ? "Contact us"
                  : `Renew your medication \u2014 $${PRICING.REPEAT_SCRIPT.toFixed(2)}`}
                <ArrowRight className="ml-2 h-4 w-4" />
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
                Repeat Medication &middot; Open {SOCIAL_PROOF_DISPLAY.operatingHours} AEST &middot; 7 days
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-muted-foreground">
                  From <span className="font-semibold text-foreground">${PRICING.REPEAT_SCRIPT.toFixed(2)}</span>
                </span>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-5 font-semibold shadow-sm shadow-primary/20"
                  disabled={isDisabled}
                  onClick={handleStickyCTA}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=prescription"}>
                    {isDisabled ? "Contact us" : "Renew your medication"}
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
