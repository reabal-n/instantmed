"use client"

import { ArrowRight, CheckCircle2, Pill, Sparkles } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
import { Hero } from "@/components/marketing/hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { HairLossHeroMockup } from "@/components/marketing/mockups/hair-loss-hero-mockup"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import {
  type LandingPageConfig,
  LandingPageShell,
  ReferralStrip,
} from "@/components/marketing/shared"
import { ContentHubLinks } from "@/components/seo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { HAIR_LOSS_FAQ } from "@/lib/data/hair-loss-faq"

// Below-fold lazy loads
const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((m) => m.HowItWorksInline),
  { loading: () => <div className="min-h-[400px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/regulatory-partners").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const HairLossGuideSection = dynamic(
  () => import("@/components/marketing/sections/hair-loss-guide-section").then((m) => m.HairLossGuideSection),
  { loading: () => <div className="min-h-[400px]" /> },
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

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Fill a short health form",
    description: "Quick assessment covering your hair loss pattern and health history. Takes about 2 minutes.",
    time: "~2 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor reviews your assessment and recommends the right treatment approach.",
    time: "Doctor review",
  },
  {
    sticker: "pill-bottle" as const,
    step: 3,
    title: "Treatment plan delivered",
    description: "Your prescription is sent via SMS. Collect treatment from any Australian pharmacy.",
    time: "Doctor review",
  },
]

const PRICING_BULLETS = [
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Doctor contacts you if more information is needed",
  "Full refund if we can't help",
]

const TREATMENT_OPTIONS = [
  {
    id: "oral",
    name: "Daily oral tablet",
    brand: "Prescription treatment",
    description:
      "Doctor-prescribed oral treatment taken once daily. Addresses the hormonal factors that drive hair follicle miniaturisation at the source.",
    type: "Oral tablet",
    frequency: "Once daily",
    results: "Visible results typically 3-6 months",
    bestFor: "Hair loss at the crown and mid-scalp",
    popular: true,
  },
  {
    id: "combination",
    name: "Combination approach",
    brand: "Prescription + over-the-counter",
    description:
      "Your doctor prescribes oral treatment and recommends a complementary over-the-counter scalp treatment available from any pharmacy. Two mechanisms working together for maximum results.",
    type: "Oral Rx + OTC scalp treatment",
    frequency: "As directed by your doctor",
    results: "Often more effective than either alone",
    bestFor: "Moderate to advanced hair loss",
    popular: true,
  },
  {
    id: "doctor_decides",
    name: "Let the doctor decide",
    brand: "Expert recommendation",
    description:
      "Your doctor reviews your assessment and recommends the best approach based on your pattern, severity, and medical history.",
    type: "Personalised plan",
    frequency: "As prescribed",
    results: "Tailored to your situation",
    bestFor: "Not sure where to start",
    popular: false,
  },
] as const

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "hair-loss",
  analyticsId: "hair-loss",
  sticky: {
    ctaText: `Start assessment · $${PRICING.HAIR_LOSS.toFixed(2)}`,
    ctaHref: "/request?service=consult&subtype=hair_loss",
    mobileSummary: "2-min form · Doctor-reviewed · No waiting room",
    desktopLabel: "Hair loss treatment · Doctor-reviewed",
    priceLabel: `From $${PRICING.HAIR_LOSS.toFixed(2)}`,
    desktopCtaText: "Start assessment",
    responseTime: "Doctor-reviewed request",
  },
}

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

function TreatmentOptions() {
  return (
    <section id="treatments" aria-label="Hair loss treatment options" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-8">
          <SectionPill>Treatment options</SectionPill>
          <Heading level="h2" className="mt-4 mb-2">
            Doctor-assessed options
          </Heading>
          <p className="text-sm text-muted-foreground">
            Your doctor reviews your assessment and decides what is clinically appropriate.
          </p>
        </Reveal>

        <div className="space-y-4">
          {TREATMENT_OPTIONS.map((treatment, i) => (
            <Reveal
              key={treatment.id}
              delay={i * 0.1}
              className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-[transform,box-shadow] duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Heading level="h3">{treatment.name}</Heading>
                    {treatment.popular && (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs border-0">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{treatment.brand}</p>
                </div>
                <Pill className="h-5 w-5 text-primary/60 shrink-0" aria-hidden="true" />
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
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Time comparison — thin wrapper around the shared TimeComparisonViz primitive. */
function HairLossComparisonViz() {
  return (
    <div className="bg-muted/30 dark:bg-white/[0.02]">
      <TimeComparisonViz
        pill="Why go online?"
        heading="Start treatment online."
        ours={{ label: "InstantMed", value: "~1", unit: "hr" }}
        theirs={{ label: "GP clinic", value: "2", valueSuffix: "+", unit: "hrs" }}
        ourSteps={["2-min health form", "Doctor reviews after you submit", "Treatment plan by SMS"]}
        theirSteps={["Book appointment", "Travel + wait in clinic", "Face-to-face consult"]}
        primaryFillPercent={30}
      />
    </div>
  )
}

function HairLossPricingSection({ isDisabled }: { isDisabled?: boolean }) {
  return (
    <section id="pricing" aria-label="Pricing" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <SectionPill>Pricing</SectionPill>
          <Heading level="h2" className="mt-4 mb-3">
            One flat fee. No hidden costs.
          </Heading>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            You only pay if the doctor approves treatment.
          </p>
        </Reveal>

        <Reveal className="max-w-sm mx-auto">
          <div className="relative rounded-2xl border flex flex-col overflow-hidden bg-white dark:bg-card border-primary/30 shadow-xl shadow-primary/[0.12]">
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4">
                <StickerIcon name="pill-bottle" size={56} />
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  One-time
                </span>
              </div>

              <Heading level="h3" className="mb-1">Hair Loss Assessment</Heading>
              <p className="text-sm text-muted-foreground mb-5">Private online consult + eScript if approved</p>

              <div className="mb-5">
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  ${PRICING.HAIR_LOSS.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">one-off doctor review</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {PRICING_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                className="w-full h-11 font-semibold shadow-md shadow-primary/20"
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=hair_loss"}>
                  {isDisabled ? "Contact us" : "Start assessment"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function HairLossLanding() {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="consult" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero — canonical <Hero> with hair-loss-specific title, CTA,
              evidence-based reassurance line, and the hair-loss product mockup.
              Bespoke HairLossHeroSection retired in Pass 2. */}
          <Hero
            title="Hair loss treatment, doctor-reviewed."
            primaryCta={{
              text: `Start assessment · $${PRICING.HAIR_LOSS.toFixed(2)}`,
              href: "/request?service=consult&subtype=hair_loss",
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={
              <p className="inline-flex items-start sm:items-center gap-2 text-[13px] text-foreground max-w-xl mx-auto lg:mx-0 leading-snug text-left sm:text-center lg:text-left">
                <Sparkles className="w-4 h-4 text-success shrink-0 mt-px sm:mt-0" aria-hidden="true" />
                <span>
                  Evidence-based assessment.
                  <span className="text-muted-foreground"> Your doctor decides what is clinically appropriate.</span>
                </span>
              </p>
            }
            mockup={<HairLossHeroMockup />}
          >
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance">
              Fill a short health form. A doctor reviews it privately and contacts you only if more information is clinically needed.
            </p>
          </Hero>

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult-hair-loss"]} />

          {/* Service claim — hair-loss superpower is clinical legitimacy
              (TGA-approved, same as a GP would prescribe). Mirrors ED page's
              discretion claim and other service-page elevation patterns. */}
          <ServiceClaimSection
            eyebrow="Clinical, not cosmetic"
            headline={
              <>
                Clinical hair loss assessment. <span className="text-primary">Reviewed by a doctor.</span>
              </>
            }
            body="A structured doctor review for hair loss concerns. If prescription treatment is clinically appropriate, your eScript is sent by SMS and can be used at any Australian pharmacy."
          />

          {/* 2. How It Works */}
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref="/request?service=consult&subtype=hair_loss"
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
          />

          {/* 3. Time comparison */}
          <HairLossComparisonViz />

          {/* 4. Treatment options - unique to hair loss */}
          <TreatmentOptions />

          {/* 5. Doctor profile */}
          <DoctorProfileSection />

          {/* 6. Pricing */}
          <HairLossPricingSection isDisabled={isDisabled} />

          {/* Regulatory Partners */}
          <RegulatoryPartners className="py-12" />

          {/* 7. FAQ — shared <FAQSection> primitive (was bespoke
              HairLossFAQSection, retired in Pass 2). */}
          <FAQSection
            pill="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you need to know about hair loss treatment online."
            items={HAIR_LOSS_FAQ}
            initialCount={4}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          {/* Guide - deep E-E-A-T content for organic search */}
          <HairLossGuideSection />

          {/* Referral strip */}
          <ReferralStrip contextText="dealing with hair loss" />

          {/* 8. Final CTA — shared <CTABanner> primitive (was bespoke
              ServiceFinalCTA, retired in Pass 2). With hair-loss being the
              last consumer of ServiceFinalCTA, the bespoke component can
              now be deleted. */}
          <CTABanner
            title="Start a hair loss assessment."
            subtitle="A doctor reviews your assessment and prescribes only if clinically appropriate."
            ctaText="Start assessment"
            ctaHref="/request?service=consult&subtype=hair_loss"
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.HAIR_LOSS}
            microcopy="Takes about 2 minutes."
          />
        </>
      )}
    </LandingPageShell>
  )
}
