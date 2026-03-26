"use client"

import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  AlertCircle,
  HelpCircle,
  PhoneOff,
  Users,
  Clock,
  Star,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FAQList } from "@/components/ui/faq-list"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { DoctorAvailabilityPill } from "@/components/shared/doctor-availability-pill"
import { RotatingText } from "@/components/marketing/rotating-text"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { FloatingCard } from "@/components/marketing/floating-card"
import { DottedGrid } from "@/components/marketing/dotted-grid"
import { StepOneMockup, StepTwoMockup, StepThreeMockup } from "@/components/marketing/mockups/how-it-works-steps"
import { PricingSection } from "@/components/marketing/sections/pricing-section"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import { Skeleton } from "@/components/ui/skeleton"
import { PRICING, CONTACT_EMAIL } from "@/lib/constants"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/hooks/use-landing-analytics"

import { CertificateShowcaseMockup } from "@/components/marketing/mockups/certificate-showcase"

// Below-fold lazy loads — keep initial bundle small
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <Skeleton className="w-full h-[300px] rounded-xl" /> },
)
const ExitIntentOverlay = dynamic(
  () => import("@/components/marketing/exit-intent-overlay").then((m) => m.ExitIntentOverlay),
  { ssr: false },
)

// =============================================================================
// DATA
// =============================================================================

const ROTATING_WORDS = [
  "reviewed by a real Australian doctor.",
  "accepted everywhere.",
  "no appointment needed.",
]

const HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Tell us what\u2019s going on",
    description:
      "Quick form, takes about 2 minutes. No account needed to start.",
    badge: "~2 min",
  },
  {
    number: "2",
    title: "A real GP reviews it",
    description:
      "AHPRA-registered doctor reviews your request. Same standards as in-person.",
    badge: "~30 min",
  },
  {
    number: "3",
    title: "Certificate in your inbox",
    description:
      "Approved certificates are sent as a secure PDF straight to your email.",
    badge: "Same day",
  },
]

const CERTIFICATE_FEATURES = [
  "AHPRA-registered doctor\u2019s name and provider number",
  "Unique certificate ID with online verification",
  "Accepted by all Australian employers and universities",
  "Secure PDF delivered directly to your email",
]

const PRICING_FEATURES = [
  "Accepted by all Australian employers",
  "Reviewed by an AHPRA-registered GP",
  "Secure PDF delivered to your inbox",
  "Doctor\u2019s name & provider number on every cert",
  "Message your doctor if you have questions",
  "Covers work, uni, or carer\u2019s leave",
]

const SOCIAL_PROOF_STATS = [
  { icon: Users, value: SOCIAL_PROOF.certApprovalPercent, suffix: "%", label: "requests approved", color: "text-success" },
  { icon: Clock, value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: " min", label: "avg turnaround", color: "text-primary" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
  { icon: ShieldCheck, value: SOCIAL_PROOF.employerAcceptancePercent, suffix: "%", label: "employer accepted", color: "text-success" },
]

const RELATED_ARTICLES = [
  { title: "Your Sick Leave Rights in Australia", href: "/blog/sick-leave-rights-australia" },
  { title: "Medical Certificates for Mental Health Days", href: "/blog/medical-certificate-mental-health-day" },
  { title: "How Long Can a Medical Certificate Cover?", href: "/blog/how-long-can-medical-certificate-cover" },
]

// =============================================================================
// SMALL COMPONENTS
// =============================================================================

/** Breadcrumb navigation */
function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 pt-4">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </li>
        <li><ChevronRight className="h-3 w-3" /></li>
        <li aria-current="page" className="text-foreground font-medium">Medical Certificate</li>
      </ol>
    </nav>
  )
}

/** Animated number counter using NumberFlow when available */
function AnimatedStat({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          observer.disconnect()

          if (prefersReducedMotion) {
            setDisplayed(value)
            return
          }

          const duration = 1200
          const start = performance.now()
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
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

/** Employer acceptance callout — thin strip between stats and how-it-works */
function EmployerCalloutStrip() {
  return (
    <div className="bg-success/5 border-y border-success/15">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3">
        <p className="text-center text-sm text-success/90 font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Accepted by {SOCIAL_PROOF.employerAcceptancePercent}% of Australian employers and universities — identical to an in-person GP certificate
        </p>
      </div>
    </div>
  )
}

/** Section 1: Hero with product mockup + embedded trust signals */
function HeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement | null>
  onCTAClick?: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Medical certificate service overview" className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-8"
              initial={animate ? { opacity: 0, y: -10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-6 leading-[1.15]"
              initial={animate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              Medical certificates,{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                <RotatingText texts={ROTATING_WORDS} interval={3500} />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance"
              initial={animate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Valid for work, uni, or carer&apos;s leave. Reviewed by an
              AHPRA-registered GP and delivered straight to your inbox.
            </motion.p>

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
                  Open today {SOCIAL_PROOF_DISPLAY.operatingHours} AEST &middot; 7 days
                </p>
              </div>
            </motion.div>

            {/* Trust signals + wait time */}
            <motion.div
              className="flex flex-col gap-2"
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
              <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span>
                  No account required &middot; Full refund if not approved
                </span>
              </p>
            </motion.div>

            {/* Secondary anchor CTA */}
            <motion.div
              className="flex justify-center lg:justify-start mt-4"
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

/** Section 2: How It Works with animated FloatingCard mockups */
function HowItWorksSection({ onCTAClick }: { onCTAClick?: () => void }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const stepMockups = [StepOneMockup, StepTwoMockup, StepThreeMockup]
  const directions: Array<"left" | "up" | "right"> = ["left", "up", "right"]

  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="relative py-20 lg:py-24 scroll-mt-20"
    >
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 tracking-tight">
            Three steps. Stay in bed.
          </h2>
          <p className="text-sm text-muted-foreground">
            No appointments. No waiting rooms. Just your phone and a few
            minutes.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Desktop connector */}
          <div className="hidden lg:block absolute top-[2.5rem] left-[16%] right-[16%] border-t-2 border-dashed border-primary/20" />

          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const Mockup = stepMockups[index]
            return (
              <div key={step.number} className="relative">
                <div className="text-center mb-4">
                  <span className="text-5xl font-light text-muted-foreground/15 dark:text-muted-foreground/10 select-none">
                    {step.number}
                  </span>
                </div>

                <FloatingCard delay={index * 0.15} direction={directions[index]}>
                  <Mockup />
                </FloatingCard>

                <div className="text-center mt-4">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    {step.description}
                  </p>
                  <span className="inline-block mt-2 text-[10px] text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">
                    {step.badge}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={animate ? { opacity: 0, y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-11 font-semibold shadow-lg shadow-primary/25 dark:shadow-primary/15 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
          >
            <Link href="/request?service=med-cert">
              Get your certificate <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-2.5">
            Most people are sorted in under an hour
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/** Section 3: Certificate Preview — split layout with animated mockup */
function CertificatePreviewSection({ onCTAClick }: { onCTAClick?: () => void }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Certificate preview" className="py-20 lg:py-24 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text content */}
          <motion.div
            initial={animate ? { opacity: 0, x: -20 } : {}}
            whileInView={animate ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                What you&apos;ll receive
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight">
              A real certificate from a real doctor
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Every certificate is issued by an AHPRA-registered GP and includes
              everything your employer or university needs. Identical to what
              you&apos;d receive at a clinic.
            </p>

            <ul className="space-y-3 mb-8">
              {CERTIFICATE_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant="outline"
              className="active:scale-[0.98]"
              onClick={onCTAClick}
            >
              <Link href="/request?service=med-cert">
                Get your certificate
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Certificate mockup */}
          <motion.div
            initial={animate ? { opacity: 0, x: 20 } : {}}
            whileInView={animate ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center"
          >
            <CertificateShowcaseMockup />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** Doctor profile — trust signal, med-cert page only */
function DoctorProfileSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Reviewed by a real doctor" className="py-16 lg:py-20 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] dark:shadow-none p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6"
        >
          {/* Avatar */}
          <div className="shrink-0">
            <Image
              src="https://api.dicebear.com/7.x/notionists/svg?seed=ReabalNajjar"
              alt="Dr. Reabal Najjar"
              width={72}
              height={72}
              className="rounded-full bg-primary/10"
              unoptimized
            />
          </div>

          {/* Details */}
          <div className="text-center sm:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">AHPRA Verified</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-0.5">
              Dr. Reabal Najjar
            </h3>
            <p className="text-sm text-muted-foreground mb-0.5">BHSc, MD, AFHEA</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              AHPRA registration: MED0002576546
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SOCIAL_PROOF.doctorCombinedYears}+ years of GP experience. Every request is
              reviewed and approved by a registered doctor — no automated
              clinical decisions.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/** Section 5: FAQ with expanded items */
function FaqCtaSection({ onFAQOpen }: { onFAQOpen?: (question: string, index: number) => void }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id="faq" aria-label="Frequently asked questions" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 dark:bg-white/[0.06] border border-border/50 mb-6">
            <HelpCircle className="h-4 w-4 text-foreground/40 dark:text-foreground/50" />
            <span className="text-sm font-medium text-foreground/60 dark:text-foreground/50">
              FAQ
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight">
            Common questions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Everything you need to know about getting your certificate.
          </p>
        </motion.div>

        {/* Accordion */}
        <FAQList
          items={MED_CERT_FAQ}
          onValueChange={(value) => {
            if (value && onFAQOpen) {
              const idx = parseInt(value, 10)
              onFAQOpen(MED_CERT_FAQ[idx]?.question ?? "", idx)
            }
          }}
        />

        {/* Contact */}
        <motion.div
          className="mt-10 text-center"
          initial={animate ? { opacity: 0 } : {}}
          whileInView={animate ? { opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-2 text-sm">
            Still have questions?
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm"
          >
            Contact our support team
          </a>
        </motion.div>

        {/* Emergency note */}
        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          For emergencies, call 000. This service is for non-urgent conditions
          only.
        </p>
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

/** Limitations callout — honest scope boundary, reduces bad-fit conversions */
function LimitationsSection() {
  return (
    <section aria-label="Service limitations" className="pb-4">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-medium text-foreground mb-3">
            Not the right fit for every situation
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              "Backdated certificates for past absences",
              "Conditions needing physical examination",
              "Workers\u2019 compensation claims",
              "Complex or ongoing chronic conditions",
              "Patients under 18 (parental consent required)",
              "Medical emergencies \u2014 call 000",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 text-muted-foreground/40 shrink-0">&times;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Not sure if we can help?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              Ask us first
            </a>{" "}
            — we&apos;ll be straight with you.
          </p>
        </div>
      </div>
    </section>
  )
}

/** Section 7: Final CTA */
function FinalCtaSection({ onCTAClick }: { onCTAClick?: () => void }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section aria-label="Get started" className="py-20 lg:py-24 bg-linear-to-br from-primary/5 via-primary/10 to-sky-100/50 dark:from-primary/10 dark:via-primary/5 dark:to-card">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4 tracking-tight">
            Let a doctor handle the paperwork.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Two minutes on your phone. A real doctor reviews it. Certificate in
            your inbox.
          </p>
          <Button
            asChild
            size="lg"
            className="px-10 h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
          >
            <Link href="/request?service=med-cert">
              Get your certificate
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-foreground/70 text-sm font-medium">
            From ${PRICING.MED_CERT.toFixed(2)} &middot; No account required
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Takes about 2 minutes &middot; Full refund if we can&apos;t help
          </p>
        </motion.div>
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
          <div className="sticky top-0 z-40 mx-4 mt-2 mb-0 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
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

        {/* Breadcrumb navigation */}
        <Breadcrumbs />

        <main className="relative">
          {/* 1. Hero */}
          <HeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* Live wait time — med cert only */}
          <LiveWaitTime variant="strip" services={["med-cert"]} />

          {/* Social proof stats */}
          <SocialProofStrip />

          {/* Employer acceptance callout */}
          <EmployerCalloutStrip />

          {/* 2. How It Works */}
          <HowItWorksSection onCTAClick={handleHowItWorksCTA} />

          {/* 3. Certificate Preview */}
          <CertificatePreviewSection onCTAClick={handleCertPreviewCTA} />

          {/* Doctor profile — trust signal, this page only */}
          <DoctorProfileSection />

          {/* 4. Pricing with comparison table */}
          <PricingSection
            title="One flat fee. Save ~$50 vs a GP."
            subtitle="One flat fee — no hidden costs. Full refund if we can't help."
            price={PRICING.MED_CERT}
            originalPrice="~$72"
            features={PRICING_FEATURES}
            refundNote={`Full refund if we can't help (minus ${SOCIAL_PROOF_DISPLAY.adminFee} admin fee)`}
            medicareNote="Medicare rebates do not apply to telehealth consultations"
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
            badgeText="Patient Feedback"
          />

          {/* Regulatory Partners — Medicare excluded (no rebate applies here) */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* 6. FAQ */}
          <FaqCtaSection onFAQOpen={handleFAQOpen} />

          {/* Honest limitations — reduces bad-fit conversions */}
          <LimitationsSection />

          {/* 7. Final CTA */}
          <FinalCtaSection onCTAClick={handleFinalCTA} />
        </main>

        <MarketingFooter />

        {/* Related articles — SEO internal linking, after footer to avoid draining conversion */}
        <RelatedArticles />

        {/* Exit-intent overlay — desktop only, once per session */}
        {!isDisabled && (
          <ExitIntentOverlay
            onShow={() => analytics.trackExitIntent("shown")}
            onCTAClick={() => analytics.trackExitIntent("clicked")}
            onDismiss={() => analytics.trackExitIntent("dismissed")}
          />
        )}

        {/* Sticky mobile CTA — appears after hero CTA scrolls out of view */}
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
              Need a certificate today? Open {SOCIAL_PROOF_DISPLAY.operatingHours} AEST.
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
      </div>
    </MarketingPageShell>
  )
}
