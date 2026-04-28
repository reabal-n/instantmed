"use client"

import { ArrowRight, CheckCircle2, Lock } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
import { Hero } from "@/components/marketing/hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { EDHeroMockup } from "@/components/marketing/mockups/ed-hero-mockup"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import {
  type LandingPageConfig,
  LandingPageShell,
  ReferralStrip,
} from "@/components/marketing/shared"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { ED_FAQ } from "@/lib/data/ed-faq"
import { SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

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
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const EDGuideSection = dynamic(
  () => import("@/components/marketing/sections/ed-guide-section").then((m) => m.EDGuideSection),
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
    description: "Private assessment covering your health history. Takes about 2 minutes.",
    time: "~2 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor reviews your assessment, same standards as in-person.",
    time: "Within 1 hour",
  },
  {
    sticker: "sent" as const,
    step: 3,
    title: "eScript sent to your phone",
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
  "Full refund if we can’t help",
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "ed",
  analyticsId: "ed",
  sticky: {
    ctaText: `Start assessment · $${PRICING.MENS_HEALTH.toFixed(2)}`,
    ctaHref: "/request?service=consult&subtype=ed",
    mobileSummary: "2-min form · Doctor-reviewed · No call needed",
    desktopLabel: "ED Treatment · Discreet & doctor-reviewed",
    priceLabel: `From $${PRICING.MENS_HEALTH.toFixed(2)}`,
    desktopCtaText: "Start assessment",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
  },
}

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/** Time comparison — thin wrapper around the shared TimeComparisonViz primitive. */
function EDComparisonViz() {
  return (
    <div className="bg-muted/30 dark:bg-white/[0.02]">
      <TimeComparisonViz
        pill="Why go online?"
        heading="Doctor-reviewed in under an hour."
        ours={{ label: "InstantMed", value: "~1", unit: "hr" }}
        theirs={{ label: "GP clinic", value: "2", valueSuffix: "+", unit: "hrs" }}
        ourSteps={["2-min health form", "Doctor reviews privately", "eScript sent by SMS"]}
        theirSteps={["Book appointment", "Travel + wait in clinic", "Face-to-face consult"]}
        primaryFillPercent={30}
      />
    </div>
  )
}

function EDPricingSection({ isDisabled }: { isDisabled?: boolean }) {
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
                <StickerIcon name="stethoscope" size={56} />
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  One-time
                </span>
              </div>

              <Heading level="h3" className="mb-1">ED Assessment</Heading>
              <p className="text-sm text-muted-foreground mb-5">Private online consult + eScript if approved</p>

              <div className="mb-5">
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  ${PRICING.MENS_HEALTH.toFixed(2)}
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
                <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=ed"}>
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

export function ErectileDysfunctionLanding() {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="consult" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero — canonical <Hero> with ED-specific title, CTA, and the
              discreet ED hero mockup. Bespoke EDHeroSection retired in Pass 2. */}
          <Hero
            title="ED medication, without the GP visit."
            primaryCta={{
              text: `Start assessment · $${PRICING.MENS_HEALTH.toFixed(2)}`,
              href: "/request?service=consult&subtype=ed",
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={
              <p className="inline-flex items-start sm:items-center gap-2 text-[13px] text-foreground max-w-xl mx-auto lg:mx-0 leading-snug text-left sm:text-center lg:text-left">
                <Lock className="w-4 h-4 text-success shrink-0 mt-px sm:mt-0" aria-hidden="true" />
                <span>
                  Private and discreet.
                  <span className="text-muted-foreground"> Nothing about treatment appears on the outside of your package.</span>
                </span>
              </p>
            }
            mockup={<EDHeroMockup />}
          >
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance">
              Fill a short health form. A doctor reviews it privately and sends your prescription by SMS. No call, no waiting room.
            </p>
          </Hero>

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult-ed"]} />

          {/* Service claim — ED's superpower is discretion + clinical legitimacy.
              Mirrors EmployerCalloutStrip / PBSCalloutStrip elevation pattern. */}
          <ServiceClaimSection
            eyebrow="Private and clinical"
            headline={
              <>
                The same medication. <span className="text-primary">Without the awkward conversation.</span>
              </>
            }
            body="Doctor-reviewed online consult. eScript by SMS. Treatment from any Australian pharmacy in discreet packaging. The clinical pathway you'd get at a clinic, minus the in-person consult."
          />

          {/* 2. How It Works */}
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref="/request?service=consult&subtype=ed"
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            subheading="No call, no face-to-face appointment. Your assessment stays between you and the doctor."
          />

          {/* 3. Time comparison */}
          <EDComparisonViz />

          {/* 4. Doctor profile */}
          <DoctorProfileSection />

          {/* 5. Pricing */}
          <EDPricingSection isDisabled={isDisabled} />

          {/* Regulatory Partners */}
          <RegulatoryPartners className="py-12" />

          {/* 7. FAQ — shared <FAQSection> primitive (was bespoke EDFAQSection,
              retired in Pass 2). */}
          <FAQSection
            pill="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you need to know about ED treatment online."
            items={ED_FAQ}
            initialCount={4}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          {/* Guide - deep E-E-A-T content for organic search */}
          <EDGuideSection />

          {/* Referral strip */}
          <ReferralStrip contextText="dealing with ED" />

          {/* 8. Final CTA — shared <CTABanner> primitive (was bespoke
              ServiceFinalCTA, retired in Pass 2). */}
          <CTABanner
            title="Discreet ED treatment, reviewed by a real doctor."
            subtitle="Fill a short form. A doctor reviews it privately. Treatment in your hands the same day."
            ctaText="Start assessment"
            ctaHref="/request?service=consult&subtype=ed"
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.MENS_HEALTH}
            microcopy="Takes about 2 minutes."
          />
        </>
      )}
    </LandingPageShell>
  )
}
