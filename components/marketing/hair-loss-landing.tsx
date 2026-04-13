"use client"

import { motion } from "framer-motion"
import { Pill } from "lucide-react"
import dynamic from "next/dynamic"
import { useRef } from "react"

import { ContextualMessage } from "@/components/marketing/contextual-message"
// Hero is above-fold - not lazy loaded
import { HairLossHeroSection } from "@/components/marketing/heroes/hair-loss-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { RecentReviewsTicker } from "@/components/marketing/recent-reviews-ticker"
import {
  type LandingPageConfig,
  LandingPageShell,
  RecentActivityTicker,
  ReferralStrip,
  type SocialProofStat,
  SocialProofStrip,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { STAT_PRESETS } from "@/components/marketing/total-patients-counter"
import { ContentHubLinks } from "@/components/seo"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion, useScrollReveal } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { HAIR_LOSS_FAQ } from "@/lib/data/hair-loss-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

// Below-fold lazy loads
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
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
const PricingSection = dynamic(
  () => import("@/components/marketing/sections/pricing-section").then((m) => m.PricingSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const CompetitorLinksSection = dynamic(
  () => import("@/components/marketing/sections/competitor-links-section").then((m) => m.CompetitorLinksSection),
  { loading: () => <div className="min-h-[200px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const PRICING_FEATURES = [
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Discreet packaging - nothing on the outside",
  "Full refund if we can't help",
]

const SOCIAL_PROOF_STATS: SocialProofStat[] = [...STAT_PRESETS['consult']]

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
    results: "Visible results typically 3\u20136 months",
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
    results: "Visible results typically 2\u20134 months",
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

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "hair-loss",
  analyticsId: "hair-loss",
  sticky: {
    ctaText: `Start assessment - $${PRICING.HAIR_LOSS.toFixed(2)}`,
    ctaHref: "/request?service=consult&subtype=hair_loss",
    mobileSummary: "Doctor-reviewed hair loss treatment. No call needed.",
    desktopLabel: "Hair loss treatment \u00b7 Doctor-reviewed",
    priceLabel: `From $${PRICING.HAIR_LOSS.toFixed(2)}`,
    desktopCtaText: "Start assessment",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
  },
}

// =============================================================================
// UNIQUE SECTION: Treatment Options
// =============================================================================

function TreatmentOptions() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useScrollReveal(ref)
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
              initial={prefersReducedMotion ? {} : { y: 16 }}
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

// =============================================================================
// UNIQUE SECTION: Inline Social Proof Band
// =============================================================================

function HairLossSocialProofBand() {
  return (
    <section aria-label="Social proof" className="py-8 lg:py-12 border-b border-border/30 dark:border-white/10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 text-center">
        <p className="text-base sm:text-lg text-foreground font-medium">
          {SOCIAL_PROOF.averageRating}/5{" "}
          <span className="text-muted-foreground text-sm sm:text-base">
            patient rating &middot; AHPRA-registered doctors
          </span>
        </p>
        <ContextualMessage service="hair-loss" className="text-sm text-muted-foreground italic" />
        <RecentReviewsTicker format="named" artifact="treatment" />
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function HairLossLanding() {
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
    light: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
    button: "bg-primary hover:bg-primary/90",
  }

  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="consult" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero */}
          <HairLossHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult-hair-loss"]} />

          {/* 2. Hair loss hook quiz - Norwood self-rating + duration */}
          <HairLossHookQuiz />

          {/* 3. Social proof band */}
          <HairLossSocialProofBand />

          {/* Recent activity ticker */}
          <RecentActivityTicker
            entries={RECENT_ACTIVITY_ENTRIES}
            messageTemplate="A patient in {city} received their treatment plan {minutesAgo} min ago"
          />

          {/* Social proof stats */}
          <SocialProofStrip stats={SOCIAL_PROOF_STATS} />

          {/* 4. How It Works */}
          <HowItWorksSection
            onCTAClick={handleHowItWorksCTA}
            steps={HAIR_LOSS_HOW_IT_WORKS_STEPS}
            ctaText={`Start assessment - $${PRICING.HAIR_LOSS.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=hair_loss"
          />

          {/* Response time comparison */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="py-12 lg:py-16 px-4 sm:px-6">
              <div className="mx-auto max-w-xl">
                <div className="text-center mb-6">
                  <SectionPill>Why go online?</SectionPill>
                </div>
                <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                  <ComparisonBar
                    us={{
                      label: "InstantMed",
                      value: "~1 hour",
                      subtext: "Online assessment, eScript to your phone",
                    }}
                    them={{
                      label: "GP clinic visit",
                      value: "2+ hours",
                      subtext: "Book, travel, wait, face-to-face consult",
                    }}
                    ratio={0.3}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Treatment options - unique to hair loss */}
          <TreatmentOptions />

          {/* Progress timeline */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <HairLossProgressTimeline />
          </div>

          {/* Long-form guide - E-E-A-T content for SEO depth */}
          <HairLossGuideSection />

          {/* Family history strip */}
          <HairLossFamilyHistoryStrip />

          {/* Doctor profile - trust signal */}
          <DoctorProfileSection />

          {/* Pre-qualify before pricing */}
          <HairLossLimitationsSection />

          {/* Pricing */}
          <PricingSection
            title="One flat fee. No hidden costs."
            subtitle="You only pay if the doctor approves treatment."
            price={PRICING.HAIR_LOSS}
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Start assessment - $${PRICING.HAIR_LOSS.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=consult&subtype=hair_loss"}
            colors={pricingColors}
          />

          {/* Testimonials */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our consultation service"
          />
          </div>

          {/* Competitor comparisons */}
          <CompetitorLinksSection slugs={["instantmed-vs-hub-health", "instantmed-vs-doctors-on-demand", "instantmed-vs-instantscripts"]} />

          {/* Regulatory Partners */}
          <RegulatoryPartners className="py-12" />

          {/* FAQ */}
          <FaqCtaSection
            onFAQOpen={handleFAQOpen}
            faqs={HAIR_LOSS_FAQ}
            subtitle="Everything you need to know about hair loss treatment online."
          />

          {/* Referral strip */}
          <ReferralStrip contextText="dealing with hair loss" />

          {/* Final CTA */}
          <FinalCtaSection
            onCTAClick={handleFinalCTA}
            title="Start treating hair loss today."
            subtitle="Trusted by 3,000+ Australians for online healthcare. Fill a short form, a doctor reviews it, and your treatment is sent straight to your phone."
            ctaText={`Start assessment - $${PRICING.HAIR_LOSS.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=hair_loss"
            price={PRICING.HAIR_LOSS}
          />
        </>
      )}
    </LandingPageShell>
  )
}
