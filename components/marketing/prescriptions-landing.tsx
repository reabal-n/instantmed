"use client"

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
// Hero is above-fold - not lazy loaded
import { PrescriptionsHeroSection } from "@/components/marketing/heroes/prescriptions-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { ServiceFinalCTA } from "@/components/marketing/sections/service-final-cta"
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
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
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
    sticker: "medical-history" as const,
    step: 1,
    title: "Enter your medication",
    description: "Tell us what you need renewed. Takes about five minutes.",
    time: "~5 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor checks your request and medical history.",
    time: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
  },
  {
    sticker: "sent" as const,
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


/** Service differentiation - repeat ($29.95) vs new prescription ($49.95) */
function ServiceComparisonSection({ isDisabled }: { isDisabled?: boolean }) {
  const services = [
    {
      sticker: "synchronize" as const,
      title: "Repeat prescription",
      subtitle: "Renewing a medication you already take",
      price: PRICING.REPEAT_SCRIPT,
      href: "/request?service=prescription",
      badge: "Most common",
      highlight: true,
      bullets: [
        "Medication you've been prescribed before",
        "eScript via SMS to any Australian pharmacy",
        "PBS pricing applies at the counter",
      ],
      ctaText: "Renew medication",
    },
    {
      sticker: "stethoscope" as const,
      title: "New prescription",
      subtitle: "Starting a medication for the first time",
      price: PRICING.NEW_SCRIPT,
      href: "/request?service=consult",
      badge: null,
      highlight: false,
      bullets: [
        "Doctor assessment included",
        "eScript sent to your phone",
        "Full refund if we can\u2019t help",
      ],
      ctaText: "New prescription",
    },
  ]

  return (
    <section id="pricing" aria-label="Service options" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <SectionPill>Pricing</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-4 mb-3">
            Repeat or new - one flat fee.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            No hidden costs. Full refund if we can&apos;t help.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, i) => (
            <Reveal
              key={service.title}
              delay={i * 0.1}
              className={cn(
                "relative rounded-2xl border flex flex-col overflow-hidden",
                service.highlight
                  ? "bg-white dark:bg-card border-primary/30 shadow-xl shadow-primary/[0.12]"
                  : "bg-white dark:bg-card border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none"
              )}
            >
              {/* Accent strip on highlighted card */}
              {service.highlight && (
                <div className="h-1 w-full bg-linear-to-r from-primary/60 via-primary to-primary/60" />
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Sticker + badge row */}
                <div className="flex items-start justify-between mb-4">
                  <StickerIcon name={service.sticker} size={56} />
                  {service.badge && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {service.badge}
                    </span>
                  )}
                </div>

                {/* Title + subtitle */}
                <h3 className="text-lg font-semibold text-foreground mb-1">{service.title}</h3>
                <p className="text-sm text-muted-foreground mb-5">{service.subtitle}</p>

                {/* Price */}
                <div className="mb-5">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    ${service.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">one-time</span>
                </div>

                {/* Bullets */}
                <ul className="space-y-2 mb-6 flex-1">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
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
                    service.highlight && "shadow-md shadow-primary/20"
                  )}
                  disabled={isDisabled}
                >
                  <Link href={isDisabled ? "/contact" : service.href}>
                    {isDisabled ? "Contact us" : service.ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Subscription upsell */}
        <Reveal className="mt-8 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 sm:p-5" delay={0.2}>
          <div className="flex items-start gap-3">
            <StickerIcon name="synchronize" size={36} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">
                Need repeat scripts every month?
              </p>
              <p className="text-sm text-muted-foreground">
                Subscribe &amp; Save for <span className="font-medium text-foreground">${PRICING.REPEAT_RX_MONTHLY}/mo</span> - your repeat script auto-renews with no forms to fill out. The option appears at checkout.
              </p>
            </div>
          </div>
        </Reveal>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Not sure which you need?{" "}
          <span className="font-medium text-foreground">
            Repeat = medication you already take. New = something you haven&apos;t been prescribed.
          </span>
        </p>
      </div>
    </section>
  )
}

/** FAQ section - prescription-specific */
function PrescriptionFAQSection({ onFAQOpen }: { onFAQOpen?: (question: string, index: number) => void }) {
  return (
    <section aria-label="Frequently asked questions" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-balance">
            Everything you need to know about renewing your medication
          </p>
        </Reveal>
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


/** Data viz: prescription turnaround vs GP visit */
function PrescriptionComparisonViz() {
  return (
    <section aria-label="Time comparison" className="py-12 lg:py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <Reveal className="text-center mb-8">
          <SectionPill>Time saved</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-4 mb-2">
            Skip the waiting room
          </h2>
        </Reveal>
        <Reveal className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6" delay={0.1}>
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
        </Reveal>
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
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref="/request?service=prescription"
            ctaText="Renew your medication"
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            heading="Three steps. No waiting room."
            subheading="From your couch to your pharmacy - most scripts are sent same day."
          />

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

          {/* Regulatory Partners - Medicare excluded */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* 7. FAQ - muted bg for rhythm */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <PrescriptionFAQSection onFAQOpen={handleFAQOpen} />
          </div>

          {/* Clinical references */}
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Electronic prescribing reduces dispensing errors by 48% compared to handwritten scripts (Westbrook et al., <em>PLoS Med</em>, 2012). Telehealth prescription management achieves equivalent clinical outcomes to face-to-face for stable chronic medications (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All prescribers are AHPRA-registered and comply with TGA scheduling requirements.
            </p>
          </div>

          {/* Referral strip */}
          <ReferralStrip contextText="who needs their medication renewed" />

          {/* 8. Final CTA */}
          <ServiceFinalCTA
            title="Your regular medication, renewed from home."
            ctaHref="/request?service=prescription"
            price={PRICING.REPEAT_SCRIPT}
            ctaText="Renew your medication"
            onCTAClick={handleFinalCTA}
            isDisabled={isDisabled}
            subtitle={`Join ${getPatientCount().toLocaleString()}+ Australians who trust InstantMed. Answer a few questions, a doctor reviews it, and your script is sent same day.`}
          />
        </>
      )}
    </LandingPageShell>
  )
}
