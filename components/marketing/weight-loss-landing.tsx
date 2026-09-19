"use client"

/**
 * Weight-management landing. LIVE since 2026-08-10. Rebuilt 2026-09 on the
 * shared Hero + LandingPageShell after the 19 Sep audit (no price on the page,
 * off-system hero, no sticky bar). Copy rules: no prescription medicine names,
 * no outcome guarantees, BMI thresholds match lib/clinical/weight-loss-eligibility.
 */
import { CheckCircle2, Clock3, ShieldCheck, Stethoscope, WalletCards } from "lucide-react"
import dynamic from "next/dynamic"

import { Hero } from "@/components/marketing/hero"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { type LandingPageConfig, LandingPageShell } from "@/components/marketing/shared/landing-page-shell"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { WEIGHT_LOSS_LANDING_FAQ } from "@/lib/data/weight-loss-faq"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { getService } from "@/lib/services/service-catalog"

const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((module) => module.HowItWorksInline),
  { loading: () => <div className="min-h-[400px]" /> },
)
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((module) => module.FAQSection),
  { loading: () => <div className="min-h-[300px]" /> },
)
const CTABanner = dynamic(
  () => import("@/components/sections/cta-banner").then((module) => module.CTABanner),
  { loading: () => <div className="min-h-[300px]" /> },
)

const REQUEST_HREF = "/request?service=consult&subtype=weight_loss"
const WEIGHT_SERVICE = getService("weight-loss")
const FORM_FIRST_CLAIM = getApprovedClaim("form_first_wedge")
const REFUND_GUARANTEE_CLAIM = getApprovedClaim("refund_guarantee")
const IDENTITY_CLAIM = getApprovedClaim("prescribing_identity_required")

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "weight-loss",
  analyticsId: "weight-loss",
  sticky: {
    ctaText: `Start assessment · ${PRICING_DISPLAY.WEIGHT_LOSS}`,
    ctaHref: REQUEST_HREF,
    mobileSummary: "6-min form",
    responseTime: "Doctor-reviewed after submission",
  },
}

const HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: "BMI 30 or higher, or 27 or higher with a weight-related condition. " + IDENTITY_CLAIM,
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.WEIGHT_LOSS,
    body: `One-off doctor review. ${REFUND_GUARANTEE_CLAIM}`,
  },
  {
    icon: Clock3,
    label: "Assessment",
    value: WEIGHT_SERVICE.effort,
    body: FORM_FIRST_CLAIM,
  },
  {
    icon: Stethoscope,
    label: "If approved",
    value: "The doctor explains the next step.",
    body: "Any medicine cost is separate. Prescription is not guaranteed.",
  },
] as const

const ELIGIBLE = [
  "Adults 18+ with BMI of 30 or higher",
  "BMI 27+ with weight-related conditions (diabetes, high blood pressure)",
  "Have tried diet and exercise without adequate results",
  "No contraindications that make online care unsuitable",
] as const

const NOT_SUITABLE = [
  "Under 18 years of age",
  "Pregnant or breastfeeding",
  "History of eating disorders",
  "Certain heart conditions or uncontrolled blood pressure",
  "Some medication interactions",
] as const

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Complete the health form",
    description: "Your BMI, health history, current medicines, previous attempts and what support you want the doctor to consider.",
    time: "~6 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A doctor reviews it",
    description: "An AHPRA-registered Australian doctor reviews the full picture. Extra information or a call may be required for safety.",
    time: "Review operates 24/7",
  },
  {
    sticker: "scales" as const,
    step: 3,
    title: "Receive the next step",
    description: "The doctor explains the outcome: a suitable option, more information needed, or GP or in-person care.",
    time: "After review",
  },
]

function WeightHeroFacts() {
  return (
    <aside aria-label="Weight management assessment facts" className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/50 bg-white shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:w-[360px]">
      <div className="border-b border-border/50 bg-muted/35 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm font-medium text-primary">Before you start</p>
        <Heading level="h3" as="h2" className="mt-1">The practical facts</Heading>
      </div>
      <dl className="divide-y divide-border/50 px-5 dark:divide-white/10">
        {HERO_FACTS.map((fact) => (
          <div key={fact.label} className="py-3.5">
            <dt className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--service-weight)]/10 text-[color:var(--service-weight)]">
                <fact.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{fact.label}</span>
            </dt>
            <dd className="ml-12 mt-1 text-sm font-semibold text-foreground"><span>{fact.value}</span></dd>
            <dd className="ml-12 mt-1 text-sm leading-6 text-muted-foreground"><span>{fact.body}</span></dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

function WeightEligibilitySection() {
  return (
    <section id="eligibility" aria-labelledby="weight-eligibility-title" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant>
          <SectionPill>Eligibility</SectionPill>
          <Heading id="weight-eligibility-title" level="h2" className="mt-4">Who this assessment is for</Heading>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Reveal instant className="min-w-0 rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
            <h3 className="text-base font-semibold text-foreground">You may be eligible if</h3>
            <ul className="mt-3 space-y-2 text-base text-foreground">
              {ELIGIBLE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal instant className="min-w-0 rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
            <h3 className="text-base font-semibold text-foreground">May not be suitable if</h3>
            <ul className="mt-3 space-y-2 text-base text-muted-foreground">
              {NOT_SUITABLE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 text-muted-foreground/60">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function WeightLossLanding() {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, requestCtaHref, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          <Hero
            className="lg:pb-4"
            title="Weight management, reviewed by a doctor."
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.WEIGHT_LOSS}`,
              href: isDisabled ? "/contact" : requestCtaHref,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={{ text: "See how it works", href: "#how-it-works" }}
            mockup={<WeightHeroFacts />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg">
              A one-off doctor assessment for {PRICING_DISPLAY.WEIGHT_LOSS}. {FORM_FIRST_CLAIM} Extra information or a call may be required for safety.
            </p>
          </Hero>

          <ServiceClaimSection
            className="lg:pt-6"
            eyebrow="Clinical, not cosmetic"
            headline={<><span className="text-primary">Doctor-supervised</span> weight management.</>}
            body="Not a meal-plan subscription. Not a wellness program. A structured doctor review for adults with BMI 30+ (or 27+ with related conditions). Your doctor checks suitability, safety, and whether online care is appropriate."
          />

          <WeightEligibilitySection />

          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref={requestCtaHref}
            ctaText={`Start assessment · ${PRICING_DISPLAY.WEIGHT_LOSS}`}
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            heading="How it works"
            subheading="A health form first, then an Australian doctor reviews the complete picture and decides the safest next step."
            revealInstant
          />

          <FAQSection
            pill="FAQ"
            title="Weight management questions"
            subtitle="Eligibility, cost, follow-up and suitability before you start."
            items={WEIGHT_LOSS_LANDING_FAQ}
            initialCount={5}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-background"
          />

          <CTABanner
            title="Start a weight management assessment."
            subtitle="A doctor reviews your health form and explains what is suitable for you."
            ctaText="Start assessment"
            ctaHref={requestCtaHref}
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.WEIGHT_LOSS}
            microcopy="Takes about 6 minutes."
            revealInstant
          />
        </>
      )}
    </LandingPageShell>
  )
}
