"use client"

import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
import { Hero } from "@/components/marketing/hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { EScriptHeroMockup } from "@/components/marketing/mockups/escript-hero-mockup"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import {
  type LandingPageConfig,
  LandingPageShell,
  RecentActivityTicker,
  ReferralStrip,
  type SocialProofStat,
  SocialProofStrip,
} from "@/components/marketing/shared"
import { RelatedArticles } from "@/components/marketing/shared/related-articles"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { PRESCRIPTION_FAQ } from "@/lib/data/prescription-faq"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

// Below-fold lazy loads
const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((m) => m.HowItWorksInline),
  { loading: () => <div className="min-h-[300px]" /> },
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
  () => import("@/components/marketing/regulatory-partners").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const FAQSection = dynamic(
  () => import("@/components/sections").then((m) => ({ default: m.FAQSection })),
  { loading: () => <div className="min-h-[400px]" /> },
)
const CTABanner = dynamic(
  () => import("@/components/sections").then((m) => ({ default: m.CTABanner })),
  { loading: () => <div className="min-h-[300px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const SOCIAL_PROOF_STATS: SocialProofStat[] = [
  { icon: Users, value: SOCIAL_PROOF.scriptFulfillmentPercent, suffix: "%", label: "fulfilled after doctor approval", color: "text-success" },
  { icon: ShieldCheck, value: 100, suffix: "%", label: "refund guarantee", color: "text-success" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
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
    time: "Doctor review",
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
    ctaText: `Renew your medication · $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
    ctaHref: "/request?service=prescription",
    mobileSummary: `Need your medication? Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST.`,
    desktopLabel: `Repeat Medication · Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST · 7 days`,
    priceLabel: `From $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
    desktopCtaText: "Renew your medication",
    responseTime: "Doctor-reviewed request",
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
        "Full refund if we can’t help",
      ],
      ctaText: "New prescription",
    },
  ]

  return (
    <section id="pricing" aria-label="Service options" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <SectionPill>Pricing</SectionPill>
          <Heading level="h2" className="mt-4 mb-3">
            Two paths, both flat-fee.
          </Heading>
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
              <div className="p-6 flex flex-col flex-1">
                {/* Sticker + badge row */}
                <div className="flex items-start justify-between mb-4">
                  <StickerIcon name={service.sticker} size={56} />
                  {service.badge && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5"
                        style={{ animation: "pulse 3s ease-in-out infinite" }}
                        aria-hidden="true"
                      />
                      {service.badge}
                    </span>
                  )}
                </div>

                {/* Title + subtitle */}
                <Heading level="h3" className="mb-1">{service.title}</Heading>
                <p className="text-sm text-muted-foreground mb-5">{service.subtitle}</p>

                {/* Price */}
                <div className="mb-5">
                  <span className="text-4xl font-semibold tracking-tight text-foreground">
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
                Subscribe &amp; Save for <span className="font-medium text-foreground">${PRICING.REPEAT_RX_MONTHLY}/mo</span>. Your repeat script auto-renews with no forms to fill out. The option appears at checkout.
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

/** Data viz: prescription turnaround vs GP visit. Thin wrapper around the
 *  shared TimeComparisonViz primitive. */
function PrescriptionComparisonViz() {
  return (
    <TimeComparisonViz
      heading="Your medication. Without the appointment."
      ours={{ label: "InstantMed", value: "Online", unit: "" }}
      theirs={{ label: "GP visit", value: "3", valueSuffix: "+", unit: "hrs" }}
      ourSteps={["5 min form", "GP reviews your request", "eScript sent to your phone"]}
      theirSteps={["Call for appointment", "Travel to clinic", "Wait room + consult + pharmacy"]}
      primaryFillPercent={25}
    />
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function PrescriptionsLanding() {
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
          {/* 1. Hero — canonical <Hero> with prescription-specific CTAs and
              the eScript hero mockup. Bespoke PrescriptionsHeroSection retired
              in Pass 2; lifestyle photo relocated to EScriptExplainerSection. */}
          <Hero
            title="Your prescription, without the waiting room."
            primaryCta={{
              text: isDisabled
                ? "Contact us"
                : `Renew medication · $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
              href: isDisabled ? "/contact" : "/request?service=prescription",
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={{
              text: "New prescription",
              href: isDisabled ? "/contact" : "/request?service=consult",
            }}
            mockup={<EScriptHeroMockup />}
          >
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance">
              An AHPRA-registered GP reviews your request and sends an eScript to your phone. Any pharmacy in Australia.
            </p>
          </Hero>

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["scripts"]} />

          {/* Recent activity ticker */}
          <RecentActivityTicker
            entries={RECENT_ACTIVITY_ENTRIES}
            messageTemplate="{name} from {city} received their eScript {minutesAgo} min ago"
          />

          {/* Social proof stats */}
          <SocialProofStrip stats={SOCIAL_PROOF_STATS} />

          {/* 2. Service comparison — repeat vs new Rx, pricing up front */}
          <ServiceComparisonSection isDisabled={isDisabled} />

          {/* PBS callout strip — addresses pharmacy cost anxiety right after pricing */}
          <PBSCalloutStrip />

          {/* 3. How It Works */}
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref="/request?service=prescription"
            ctaText="Renew your medication"
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            heading="Three steps. No waiting room."
            subheading="From your couch to your pharmacy. Most scripts are sent after doctor approval."
          />

          {/* 3. eScript explainer — muted bg for rhythm.
              Lifestyle photo relocated here from the hero (was a 16:7 scroll-
              break). Renders as a framed banner below the mockup + facts split. */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <EScriptExplainerSection
              accentImage={{
                src: "/images/rx-1.webp",
                alt: "Picking up a prescription at a pharmacy counter",
              }}
            />
          </div>

          {/* 4. Supported medications */}
          <SupportedMedicationsSection />

          {/* Data viz: turnaround comparison */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <PrescriptionComparisonViz />
          </div>

          {/* Doctor profile */}
          <DoctorProfileSection />

          {/* Pre-qualify */}
          <PrescriptionLimitationsSection />

          {/* Regulatory Partners - Medicare excluded */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* FAQ — shared <FAQSection> primitive (was bespoke
              PrescriptionFAQSection, retired in Pass 2). */}
          <FAQSection
            pill="FAQ"
            title="Before you start"
            subtitle="Everything you need to know about renewing your medication."
            items={PRESCRIPTION_FAQ}
            initialCount={4}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          {/* Clinical references */}
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Electronic prescribing reduces dispensing errors by 48% compared to handwritten scripts (Westbrook et al., <em>PLoS Med</em>, 2012). Telehealth prescription management achieves equivalent clinical outcomes to face-to-face for stable chronic medications (Snoswell et al., <em>J Telemed Telecare</em>, 2023). All prescribers are AHPRA-registered and comply with TGA scheduling requirements.
            </p>
          </div>

          {/* Referral strip */}
          <ReferralStrip contextText="who needs their medication renewed" />

          {/* Final CTA — shared <CTABanner> with extended price + microcopy
              props (was bespoke ServiceFinalCTA, retired in Pass 2). */}
          <CTABanner
            title="Your regular medication, renewed from home."
            subtitle="Answer a few questions, a doctor reviews it, and your script is sent after doctor approval."
            ctaText="Renew your medication"
            ctaHref="/request?service=prescription"
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.REPEAT_SCRIPT}
            microcopy="Takes about 5 minutes."
          />
        </>
      )}
    </LandingPageShell>
  )
}
