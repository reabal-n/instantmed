"use client"

import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
import { Hero } from "@/components/marketing/hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { EScriptHeroMockup } from "@/components/marketing/mockups/escript-hero-mockup"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { ReferralStrip } from "@/components/marketing/shared/referral-strip"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { WOMENS_HEALTH_FAQ } from "@/lib/data/womens-health-faq"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"

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
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((m) => ({ default: m.FAQSection })),
  { loading: () => <div className="min-h-[400px]" /> },
)
const CTABanner = dynamic(
  () => import("@/components/sections/cta-banner").then((m) => ({ default: m.CTABanner })),
  { loading: () => <div className="min-h-[300px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const WOMENS_HEALTH_HREF = "/request?service=consult&subtype=womens_health"

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Fill a short health form",
    description: "Private assessment covering your symptoms and health history. Takes about 2 minutes.",
    time: "~2 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real doctor reviews it",
    description: "An AHPRA-registered doctor reviews your assessment and decides the next step.",
    time: "Reviewed when available",
  },
  {
    sticker: "sent" as const,
    step: 3,
    title: "Outcome sent to your phone",
    description: "Once approved, your outcome is sent to your phone and can be actioned at an Australian pharmacy.",
    time: "After review",
  },
]

const PRICING_BULLETS = [
  "AHPRA-registered Australian doctor reviews your form",
  "Outcome sent to your phone once approved",
  "Collect from any Australian pharmacy if relevant",
  "A doctor may call you briefly before deciding",
  "Full refund if the doctor declines",
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "consult",
  analyticsId: "womens-health",
  sticky: {
    ctaText: `Start assessment · $${PRICING.WOMENS_HEALTH.toFixed(2)}`,
    ctaHref: WOMENS_HEALTH_HREF,
    mobileSummary: "2-min form · Doctor-reviewed · No waiting room",
    responseTime: "Doctor-reviewed after submission",
  },
}

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/** Time comparison — thin wrapper around the shared TimeComparisonViz primitive. */
function WomensHealthComparisonViz() {
  return (
    <div className="bg-muted/30 dark:bg-white/[0.02]">
      <TimeComparisonViz
        pill="Why go online?"
        heading="Doctor-reviewed without the waiting room."
        ours={{ label: "InstantMed", value: "Form", unit: "first" }}
        theirs={{ label: "GP clinic", value: "2", valueSuffix: "+", unit: "hrs" }}
        ourSteps={["2-min health form", "Doctor reviews privately", "Outcome sent to your phone"]}
        theirSteps={["Book appointment", "Travel + wait in clinic", "Face-to-face consult"]}
        primaryFillPercent={30}
      />
    </div>
  )
}

/** Contraceptive pill — strong secondary section beneath the UTI-led primary content. */
function ContraceptivePillSection({ isDisabled }: { isDisabled?: boolean }) {
  return (
    <section id="contraceptive-pill" aria-label="Contraceptive pill assessment" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-8">
          <SectionPill>Also available</SectionPill>
          <Heading level="h2" className="mt-4 mb-2">
            Starting or switching the contraceptive pill
          </Heading>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto text-balance">
            Request an assessment to start a new pill or switch from your current one. The doctor reviews your history and decides what is clinically appropriate.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              sticker: "medical-history" as const,
              title: "Routine safety screen",
              body: "Standard health-history questions a doctor would normally cover. Nothing complicated, just the basics of safe prescribing.",
            },
            {
              sticker: "stethoscope" as const,
              title: "Doctor decides suitability",
              body: "An AHPRA-registered doctor reviews your answers and decides what, if anything, is appropriate for you.",
            },
            {
              sticker: "synchronize" as const,
              title: "Already on the pill?",
              body: "If your medication and dose are unchanged, a repeat prescription is the faster path. Start there instead.",
            },
          ].map((card, i) => (
            <Reveal
              key={card.title}
              delay={i * 0.1}
              className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-5"
            >
              <StickerIcon name={card.sticker} size={40} className="mb-3" />
              <Heading level="h3" className="mb-1.5 text-base">{card.title}</Heading>
              <p className="text-sm text-muted-foreground">{card.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 text-center">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 font-semibold"
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : WOMENS_HEALTH_HREF}>
              {isDisabled ? "Contact us" : "Start a pill assessment"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}

function WomensHealthPricingSection({ isDisabled }: { isDisabled?: boolean }) {
  return (
    <section id="pricing" aria-label="Pricing" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <SectionPill>Pricing</SectionPill>
          <Heading level="h2" className="mt-4 mb-3">
            One flat fee. No hidden costs.
          </Heading>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            Doctor review first. Full refund if declined.
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

              <Heading level="h3" className="mb-1">Women&apos;s Health Assessment</Heading>
              <p className="text-sm text-muted-foreground mb-5">Private online review for UTI and contraceptive pill concerns</p>

              <div className="mb-5">
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  ${PRICING.WOMENS_HEALTH.toFixed(2)}
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
                <Link href={isDisabled ? "/contact" : WOMENS_HEALTH_HREF}>
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

export function WomensHealthLanding() {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="consult" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero — UTI-led headline + CTA, with the generic eScript hero
              mockup standing in for the prescribing outcome. */}
          <Hero
            title="UTI assessment online, without the waiting room."
            primaryCta={{
              text: `Start assessment · $${PRICING.WOMENS_HEALTH.toFixed(2)}`,
              href: WOMENS_HEALTH_HREF,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={
              <p className="inline-flex items-start sm:items-center gap-2 text-[13px] text-foreground max-w-xl mx-auto lg:mx-0 leading-snug text-left sm:text-center lg:text-left">
                <Lock className="w-4 h-4 text-success shrink-0 mt-px sm:mt-0" aria-hidden="true" />
                <span>
                  Private and discreet.
                  <span className="text-muted-foreground"> Your request is reviewed securely by an Australian doctor.</span>
                </span>
              </p>
            }
            mockup={<EScriptHeroMockup />}
          >
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance">
              {FORM_FIRST_WEDGE} A doctor reviews your symptoms and history and decides what is clinically appropriate. {GUARANTEE}
            </p>
          </Hero>

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult"]} />

          {/* Service claim — UTI-led clinical legitimacy without drug-led copy. */}
          <ServiceClaimSection
            eyebrow="Private and clinical"
            headline={
              <>
                UTI assessment, reviewed by a doctor. <span className="text-primary">Without the waiting room.</span>
              </>
            }
            body="A structured doctor review for urinary symptoms. If online care is appropriate, your outcome is sent to your phone and can be actioned at any Australian pharmacy."
          />

          {/* Red-flag honesty strip — when online care is not suitable. */}
          <section aria-label="When to be seen in person" className="py-8 sm:py-12">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <Heading level="h3" className="mb-1.5 text-base">When you should be seen in person</Heading>
                    <p className="text-sm text-muted-foreground">
                      A fever, pain in your back or side, blood in your urine, symptoms during pregnancy, or a UTI that keeps returning are signs you need an in-person review. If your answers raise any of these, the doctor will recommend a face-to-face visit and may decline online care.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 2. How It Works */}
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref={WOMENS_HEALTH_HREF}
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            subheading="No booked appointment or waiting room. A doctor reviews your assessment and may call you briefly before deciding."
          />

          {/* 3. Time comparison */}
          <WomensHealthComparisonViz />

          {/* 4. Contraceptive pill — strong secondary section. */}
          <ContraceptivePillSection isDisabled={isDisabled} />

          {/* 5. Doctor profile */}
          <DoctorProfileSection />

          {/* 6. Pricing */}
          <WomensHealthPricingSection isDisabled={isDisabled} />

          {/* Regulatory Partners */}
          <RegulatoryPartners className="py-12" />

          {/* 7. FAQ — shared <FAQSection> primitive. */}
          <FAQSection
            pill="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you need to know before starting a women's health assessment online."
            items={WOMENS_HEALTH_FAQ}
            initialCount={4}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          {/* Referral strip */}
          <ReferralStrip contextText="dealing with a UTI" />

          {/* 8. Final CTA — shared <CTABanner> primitive. */}
          <CTABanner
            title="UTI assessment, reviewed by a real doctor."
            subtitle="Fill a short form. A doctor reviews it privately and decides what is clinically appropriate."
            ctaText="Start assessment"
            ctaHref={WOMENS_HEALTH_HREF}
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.WOMENS_HEALTH}
            microcopy="Takes about 2 minutes."
          />
        </>
      )}
    </LandingPageShell>
  )
}
