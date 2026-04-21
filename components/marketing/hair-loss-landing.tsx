"use client"

import { ArrowRight, CheckCircle2, Pill } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
// Hero is above-fold - not lazy loaded
import { HairLossHeroSection } from "@/components/marketing/heroes/hair-loss-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { ServiceFinalCTA } from "@/components/marketing/sections/service-final-cta"
import {
  type LandingPageConfig,
  LandingPageShell,
  ReferralStrip,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { ContentHubLinks } from "@/components/seo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FAQList } from "@/components/ui/faq-list"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { HAIR_LOSS_FAQ } from "@/lib/data/hair-loss-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// Below-fold lazy loads
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const HairLossGuideSection = dynamic(
  () => import("@/components/marketing/sections/hair-loss-guide-section").then((m) => m.HairLossGuideSection),
  { loading: () => <div className="min-h-[400px]" /> },
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
    time: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
  },
  {
    sticker: "pill-bottle" as const,
    step: 3,
    title: "Treatment plan delivered",
    description: "Your prescription is sent via SMS. Collect treatment from any Australian pharmacy.",
    time: "Same day",
  },
]

const PRICING_BULLETS = [
  "Includes a 30-day follow-up check-in with your doctor",
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Discreet packaging, nothing on the outside",
  "Full refund if we can\u2019t help",
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
    ctaText: `Start assessment - $${PRICING.HAIR_LOSS.toFixed(2)}`,
    ctaHref: "/request?service=consult&subtype=hair_loss",
    mobileSummary: "2-min form \u00b7 Doctor-reviewed \u00b7 No call needed",
    desktopLabel: "Hair loss treatment \u00b7 Doctor-reviewed",
    priceLabel: `From $${PRICING.HAIR_LOSS.toFixed(2)}`,
    desktopCtaText: "Start assessment",
    responseTime: `Avg response: ${SOCIAL_PROOF.averageResponseMinutes} min`,
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
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mt-4 mb-2">
            Clinically-proven approaches
          </h2>
          <p className="text-sm text-muted-foreground">
            Your doctor recommends the best TGA-approved option for your assessment.
          </p>
        </Reveal>

        <div className="space-y-4">
          {TREATMENT_OPTIONS.map((treatment, i) => (
            <Reveal
              key={treatment.id}
              delay={i * 0.1}
              className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{treatment.name}</h3>
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

function HairLossPricingSection({ isDisabled }: { isDisabled?: boolean }) {
  return (
    <section id="pricing" aria-label="Pricing" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <SectionPill>Pricing</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-4 mb-3">
            One flat fee. No hidden costs.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            You only pay if the doctor approves treatment.
          </p>
        </Reveal>

        <Reveal className="max-w-sm mx-auto">
          <div className="relative rounded-2xl border flex flex-col overflow-hidden bg-white dark:bg-card border-primary/30 shadow-xl shadow-primary/[0.12]">
            {/* Accent strip */}
            <div className="h-1 w-full bg-linear-to-r from-primary/60 via-primary to-primary/60" />

            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4">
                <StickerIcon name="pill-bottle" size={56} />
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  One-time
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">Hair Loss Assessment</h3>
              <p className="text-sm text-muted-foreground mb-5">Private online consult + eScript if approved</p>

              <div className="mb-5">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  ${PRICING.HAIR_LOSS.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">consult + 30-day follow-up</span>
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

function HairLossFAQSection({ onFAQOpen }: { onFAQOpen?: (question: string, index: number) => void }) {
  return (
    <section aria-label="Frequently asked questions" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-balance">
            Everything you need to know about hair loss treatment online
          </p>
        </Reveal>
        <FAQList
          items={HAIR_LOSS_FAQ}
          type="single"
          onValueChange={(value: string) => {
            if (onFAQOpen && value) {
              const idx = HAIR_LOSS_FAQ.findIndex((f) => f.question === value)
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

export function HairLossLanding() {
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

          {/* 2. How It Works */}
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref="/request?service=consult&subtype=hair_loss"
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
          />

          {/* 3. Time comparison */}
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

          {/* 4. Treatment options - unique to hair loss */}
          <TreatmentOptions />

          {/* 5. Doctor profile */}
          <DoctorProfileSection />

          {/* 6. Pricing */}
          <HairLossPricingSection isDisabled={isDisabled} />

          {/* 7. Testimonials */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <TestimonialsSection
              testimonials={testimonialsForColumns}
              title="What patients say"
              subtitle="Real reviews from Australians who've used our service"
            />
          </div>

          {/* Regulatory Partners */}
          <RegulatoryPartners className="py-12" />

          {/* 8. FAQ */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <HairLossFAQSection onFAQOpen={handleFAQOpen} />
          </div>

          {/* Guide - deep E-E-A-T content for organic search */}
          <HairLossGuideSection />

          {/* Referral strip */}
          <ReferralStrip contextText="dealing with hair loss" />

          {/* 9. Final CTA */}
          <ServiceFinalCTA
            title="Start treating hair loss today."
            ctaHref="/request?service=consult&subtype=hair_loss"
            price={PRICING.HAIR_LOSS}
            onCTAClick={handleFinalCTA}
            isDisabled={isDisabled}
          />
        </>
      )}
    </LandingPageShell>
  )
}
