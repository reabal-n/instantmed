"use client"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Stethoscope,
  Users,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

// Hero is above-fold - not lazy loaded
import { PrescriptionsHeroSection } from "@/components/marketing/heroes/prescriptions-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import {
  type LandingPageConfig,
  LandingPageShell,
  RecentActivityTicker,
  ReferralStrip,
  type SocialProofStat,
  SocialProofStrip,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { RelatedArticles } from "@/components/marketing/shared/related-articles"
import { TestimonialCard } from "@/components/marketing/shared/testimonial-card"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { FAQList } from "@/components/ui/faq-list"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { PRESCRIPTION_FAQ } from "@/lib/data/prescription-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { getPatientCount,SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

// Below-fold lazy loads
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
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const RepeatRxGuideSection = dynamic(
  () => import("@/components/marketing/sections/repeat-rx-guide-section").then((m) => m.RepeatRxGuideSection),
  { loading: () => <div className="min-h-[400px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const SOCIAL_PROOF_STATS: SocialProofStat[] = [
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

const RELATED_ARTICLES_DATA = [
  { title: "Understanding eScripts in Australia", href: "/blog/understanding-escripts-australia" },
  { title: "How to Get a Repeat Prescription Online", href: "/blog/repeat-prescription-online" },
  { title: "PBS Subsidies: What You Need to Know", href: "/blog/pbs-subsidies-guide" },
]

const HOW_IT_WORKS_STEPS = [
  {
    icon: ClipboardList,
    step: 1,
    title: "Enter your medication",
    description: "Tell us what you need renewed. Takes about five minutes.",
    time: "~5 minutes",
  },
  {
    icon: Stethoscope,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor checks your request and medical history.",
    time: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
  },
  {
    icon: Smartphone,
    step: 3,
    title: "eScript sent to your phone",
    description: "Your electronic prescription is sent via SMS. Take it to any pharmacy.",
    time: "Instant",
  },
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "scripts",
  analyticsId: "prescription",
  sticky: {
    ctaText: `Renew your medication \u00b7 $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
    ctaHref: "/request?service=prescription",
    mobileSummary: `Need your medication? Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST.`,
    desktopLabel: `Repeat Medication \u00b7 Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST \u00b7 7 days`,
    priceLabel: `From $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
    desktopCtaText: "Renew your medication",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
  },
}

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/** How It Works - simplified 3-step inline section */
function HowItWorksInline({ onCTAClick, isDisabled }: { onCTAClick?: () => void; isDisabled?: boolean }) {
  const animate = !useReducedMotion()
  return (
    <section id="how-it-works" aria-label="How it works" className="py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Three steps. No waiting room.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            From your couch to your pharmacy - most scripts are sent same day.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <Reveal
              key={step.step}
              delay={i * 0.1}
              className="relative bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl p-6 text-center"
            >
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
            </Reveal>
          ))}
        </div>

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

/** Service differentiation - repeat ($29.95) vs new prescription ($49.95) */
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
            Repeat or new - one flat fee.
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

        {/* Subscription upsell */}
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
            Subscribe &amp; Save for <span className="font-medium text-foreground">${PRICING.REPEAT_RX_MONTHLY}/mo</span> - your repeat script auto-renews each month with no forms to fill out.
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

/** FAQ section - prescription-specific */
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

/** Inline Final CTA - prescription-specific */
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
            Join {getPatientCount().toLocaleString()}+ Australians who trust InstantMed. Answer a few questions, a doctor reviews it, and your script is sent same day.
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

/** Data viz: prescription turnaround vs GP visit */
function PrescriptionComparisonViz() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Time comparison" className="py-12 lg:py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <motion.div
          className="text-center mb-8"
          initial={animate ? { y: 12 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <SectionPill>Time saved</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-4 mb-2">
            Skip the waiting room
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
              value: "~45 min",
              subtext: "Average prescription turnaround",
            }}
            them={{
              label: "GP visit",
              value: "3+ hours",
              subtext: "Travel + wait + consult + pharmacy",
            }}
            ratio={0.25}
          />
        </motion.div>
      </div>
    </section>
  )
}

/** Compact testimonial strip - 3 cards for visual rhythm breaks */
function QuickTestimonialStrip() {
  const testimonials = getTestimonialsByService("prescription").slice(0, 3)
  if (testimonials.length === 0) return null

  return (
    <section aria-label="Patient experiences" className="py-8 lg:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <TestimonialCard
              key={t.name}
              variant="compact"
              testimonial={{
                name: `${t.name}${t.age ? `, ${t.age}` : ""}`,
                quote: t.text,
                rating: t.rating,
                location: t.location,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function PrescriptionsLanding() {
  // Testimonials data - service-specific with fallback
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

  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={
        <>
          <ContentHubLinks service="prescriptions" />
          <RelatedArticles articles={RELATED_ARTICLES_DATA} />
        </>
      }
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero */}
          <PrescriptionsHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} isDisabled={isDisabled} />

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["scripts"]} />

          {/* Recent activity ticker */}
          <RecentActivityTicker
            entries={RECENT_ACTIVITY_ENTRIES}
            messageTemplate="{name} from {city} received their eScript {minutesAgo} min ago"
          />

          {/* Social proof stats */}
          <SocialProofStrip stats={SOCIAL_PROOF_STATS} />

          {/* PBS callout strip */}
          <PBSCalloutStrip />

          {/* 2. How It Works */}
          <HowItWorksInline onCTAClick={handleHowItWorksCTA} isDisabled={isDisabled} />

          {/* 3. eScript explainer - muted bg for rhythm */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <EScriptExplainerSection />
          </div>

          {/* 4. Supported medications */}
          <SupportedMedicationsSection />

          {/* Data viz: turnaround comparison */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <PrescriptionComparisonViz />
          </div>

          {/* Doctor profile */}
          <DoctorProfileSection />

          {/* Quick testimonials strip */}
          <QuickTestimonialStrip />

          {/* Pre-qualify before pricing */}
          <PrescriptionLimitationsSection />

          {/* 5. Service comparison - repeat vs new Rx */}
          <ServiceComparisonSection isDisabled={isDisabled} />

          {/* 6. Testimonials - muted bg for rhythm */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <TestimonialsSection
              testimonials={testimonialsForColumns}
              title="What patients say"
              subtitle="Real reviews from Australians who've used our service"
            />
          </div>

          {/* Competitor comparisons */}
          <CompetitorLinksSection slugs={["instantmed-vs-instantscripts", "instantmed-vs-hub-health", "instantmed-vs-doctors-on-demand"]} />

          {/* Regulatory Partners - Medicare excluded */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* Deep E-E-A-T guide content */}
          <RepeatRxGuideSection />

          {/* 7. FAQ - muted bg for rhythm */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <PrescriptionFAQSection onFAQOpen={handleFAQOpen} />
          </div>

          {/* Clinical references */}
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
            <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
              Electronic prescribing reduces dispensing errors by 48% compared to handwritten scripts (Westbrook et al., <em>PLoS Med</em>, 2012). Telehealth prescription management achieves equivalent clinical outcomes to face-to-face for stable chronic medications (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All prescribers are AHPRA-registered and comply with TGA scheduling requirements.
            </p>
          </div>

          {/* Referral strip */}
          <ReferralStrip contextText="who needs their medication renewed" />

          {/* 8. Final CTA */}
          <FinalCTAInline onCTAClick={handleFinalCTA} isDisabled={isDisabled} />
        </>
      )}
    </LandingPageShell>
  )
}
