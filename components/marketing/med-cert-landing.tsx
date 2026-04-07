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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { PricingSection } from "@/components/marketing/sections/pricing-section"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ContentHubLinks } from "@/components/seo/content-hub-links"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
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

// =============================================================================
// DATA
// =============================================================================

const ROTATING_BADGES = [
  "Accepted by all employers",
  "No appointment needed",
  "Same day delivery",
  "Full refund if we can't help",
]


const PRICING_FEATURES = [
  "Accepted by all Australian employers and universities",
  "Reviewed by an AHPRA-registered GP",
  "Secure PDF delivered to your inbox",
  "Covers work, uni, or carer\u2019s leave",
]

const SOCIAL_PROOF_STATS = [
  { icon: Users, value: SOCIAL_PROOF.certApprovalPercent, suffix: "%", label: "requests approved", color: "text-success" },
  { icon: Clock, value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: " min", label: "avg turnaround", color: "text-primary" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
  { icon: ShieldCheck, value: SOCIAL_PROOF.employerAcceptancePercent, suffix: "%", label: "employer accepted", color: "text-success" },
]

const RECENT_ACTIVITY_ENTRIES = [
  { name: "Sarah", city: "Melbourne", minutesAgo: 23 },
  { name: "James", city: "Sydney", minutesAgo: 41 },
  { name: "Priya", city: "Brisbane", minutesAgo: 12 },
  { name: "Tom", city: "Perth", minutesAgo: 55 },
  { name: "Emily", city: "Adelaide", minutesAgo: 8 },
  { name: "Liam", city: "Gold Coast", minutesAgo: 34 },
  { name: "Anh", city: "Canberra", minutesAgo: 17 },
  { name: "Rachel", city: "Hobart", minutesAgo: 47 },
]


const RELATED_ARTICLES = [
  { title: "Your Sick Leave Rights in Australia", href: "/blog/sick-leave-rights-australia" },
  { title: "Medical Certificates for Mental Health Days", href: "/blog/medical-certificate-mental-health-day" },
  { title: "How Long Can a Medical Certificate Cover?", href: "/blog/how-long-can-medical-certificate-cover" },
]

// =============================================================================
// SMALL COMPONENTS
// =============================================================================

/** Closing time countdown — shows "Closes in Xh Ym" during operating hours */
function ClosingCountdown() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    function update() {
      // AEST is UTC+10 (ignoring daylight savings edge — close enough)
      const now = new Date()
      const aestOffset = 10 * 60 // minutes
      const utc = now.getTime() + now.getTimezoneOffset() * 60_000
      const aest = new Date(utc + aestOffset * 60_000)
      const hour = aest.getHours()
      const minute = aest.getMinutes()

      const openHour = SOCIAL_PROOF.operatingHoursStart // 8
      const closeHour = SOCIAL_PROOF.operatingHoursEnd   // 22

      // Med certs are 24/7 — no closing countdown needed
      setLabel(null)
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


/** Live activity ticker — rotates through recent certificate deliveries */
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
            {entry.name} from {entry.city} received their certificate {entry.minutesAgo} min ago
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
    // AEST is UTC+10 (same pattern as ClosingCountdown)
    const now = new Date()
    const aestOffset = 10 * 60 // minutes
    const utc = now.getTime() + now.getTimezoneOffset() * 60_000
    const aest = new Date(utc + aestOffset * 60_000)
    const hour = aest.getHours()
    const day = aest.getDay() // 0 = Sunday, 1 = Monday, ...

    if (day === 1 && hour < 12) {
      setMessage("Calling in sick? Most certificates are delivered before your boss checks email.")
    } else if (day === 0 && hour >= 17) {
      setMessage("Get sorted tonight \u2014 certificate ready before Monday morning.")
    } else if (day >= 1 && day <= 5 && hour >= 18) {
      setMessage("Too late for a GP? Medical certificates are available 24/7.")
    } else if ((day === 0 || day === 6) && hour >= 8 && hour < 17) {
      setMessage("Weekend and your GP is closed? We\u2019re open right now.")
    } else {
      setMessage(null)
    }
  }, [])

  if (!message) return null

  return (
    <p className="text-xs text-muted-foreground/80 italic mt-1">
      {message}
    </p>
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

const EMPLOYER_NAMES = [
  "Woolworths", "Coles", "ANZ", "Commonwealth Bank", "Telstra",
  "BHP", "NAB", "Westpac", "Qantas", "Bunnings",
]

/** Employer acceptance callout — thin strip between stats and how-it-works */
function EmployerCalloutStrip() {
  return (
    <div className="bg-success/5 border-y border-success/15">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-sm text-success/90 font-medium flex items-center justify-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Accepted by {SOCIAL_PROOF.employerAcceptancePercent}% of Australian employers and universities — identical to an in-person GP certificate
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {EMPLOYER_NAMES.map((name) => (
            <span
              key={name}
              className="text-[11px] font-medium text-success/70 dark:text-success/60 px-2.5 py-1 rounded-full border border-success/20 bg-success/5 dark:bg-success/10"
            >
              {name}
            </span>
          ))}
          <span className="text-[11px] font-medium text-success/50 px-2.5 py-1 rounded-full border border-success/10 bg-success/5">
            + more
          </span>
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
    <section aria-label="Medical certificate service overview" className="relative overflow-hidden pt-8 pb-10 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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
              Medical certificates,{" "}
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
              Valid for work, uni, or carer&apos;s leave. Reviewed by an
              AHPRA-registered GP and delivered straight to your inbox.
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
                >
                  <Link href="/request?service=med-cert">
                    Get your certificate — ${PRICING.MED_CERT.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparison} clinic
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  Available 24/7
                </p>
                <ClosingCountdown />
                <ContextualMessage />
              </div>
            </motion.div>

            {/* Trust signals + wait time — hidden on mobile to keep CTA above fold */}
            <motion.div
              className="hidden sm:flex flex-col gap-2"
              initial={animate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  AHPRA-registered doctors &middot; Accepted by all employers
                  &middot; Full refund if we can&apos;t help
                </span>
              </p>
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary/80 dark:bg-primary/10 dark:border-primary/30 dark:text-primary/70">
                  <PhoneOff className="h-3.5 w-3.5 shrink-0" />
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
                <ChevronDown className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          </div>

          {/* Hero product mockup — desktop only, mobile gets compact version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <MedCertHeroMockup />
          </div>

          {/* Mobile mockup — compact, below text content */}
          <div className="lg:hidden mt-8 w-full max-w-sm mx-auto">
            <MedCertHeroMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}




/** Related blog articles — internal links for SEO */
function RelatedArticles() {
  return (
    <section aria-label="Related articles" className="py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Related reading
        </h3>
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
          <HeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* Live wait time — med cert only */}
          <LiveWaitTime variant="strip" services={["med-cert"]} />

          {/* Recent activity ticker */}
          <RecentActivityTicker />

          {/* Social proof stats */}
          <SocialProofStrip />

          {/* Employer acceptance callout */}
          <EmployerCalloutStrip />

          {/* 2. How It Works */}
          <HowItWorksSection onCTAClick={handleHowItWorksCTA} />

          {/* 3. Certificate Preview */}
          <CertificatePreviewSection onCTAClick={handleCertPreviewCTA} />

          {/* 3b. Long-form guide — E-E-A-T content for SEO depth */}
          <MedCertGuideSection />

          {/* Doctor profile — trust signal, this page only */}
          <DoctorProfileSection />

          {/* Pre-qualify before pricing — reduces bad-fit conversions */}
          <LimitationsSection />

          {/* 4. Pricing with comparison table */}
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

          {/* 5. Testimonials */}
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our service"
          />

          {/* Regulatory Partners — Medicare excluded (no rebate applies here) */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* 6. FAQ */}
          <FaqCtaSection onFAQOpen={handleFAQOpen} />

          {/* Referral awareness strip */}
          <div className="py-6 border-t border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline h-4 w-4 mr-1.5 text-primary align-text-bottom" />
                Know someone who needs a certificate?{" "}
                <Link href="/patient" className="text-primary hover:underline font-medium">
                  Refer a friend
                </Link>
                {" "}&mdash; you both get $5 off.
              </p>
            </div>
          </div>

          {/* 7. Final CTA */}
          <FinalCtaSection onCTAClick={handleFinalCTA} />
        </main>

        <MarketingFooter />

        {/* Content hub cross-links — distributes PageRank to condition/symptom/guide pages */}
        <ContentHubLinks service="med-cert" />

        {/* Related articles — SEO internal linking, after footer to avoid draining conversion */}
        <RelatedArticles />

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
              Medical certificates available 24/7.
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
