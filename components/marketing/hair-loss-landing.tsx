"use client"

import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  HeartPulse,
  Lock,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  WalletCards,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { Hero } from "@/components/marketing/hero"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { HAIR_LOSS_LANDING_FAQ } from "@/lib/data/hair-loss-faq"
import { getActiveSpecialtyExperience } from "@/lib/growth/specialty-experiences"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

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
const ContentHubLinks = dynamic(
  () => import("@/components/seo/content-hub-links").then((module) => module.ContentHubLinks),
  { loading: () => <div className="min-h-[320px]" /> },
)

const ASSESSMENT_HREF = "/request?service=consult&subtype=hair_loss"
const HAIR_LOSS_LANDING_EXPERIENCE = getActiveSpecialtyExperience("hair_loss")
const FORM_FIRST_CLAIM = getApprovedClaim("form_first_wedge")
const PRESCRIPTION_IF_APPROVED_CLAIM = getApprovedClaim("prescription_if_approved")
const REFUND_GUARANTEE_CLAIM = getApprovedClaim("refund_guarantee")

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Complete the private form",
    description: "Describe the hair-loss pattern, timing, scalp symptoms, medicines, and relevant health history.",
    time: "~3 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A doctor reviews it",
    description: "An AHPRA-registered Australian doctor reviews the full assessment and may contact you for clarification.",
    time: "Review operates 24/7",
  },
  {
    sticker: "sent" as const,
    step: 3,
    title: "Receive the next step",
    description: "The doctor may approve, ask for more detail, or recommend in-person care.",
    time: "After review",
  },
]

const HAIR_HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: getApprovedClaim("prescribing_identity_required"),
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.HAIR_LOSS,
    body: `One-off private doctor assessment. ${REFUND_GUARANTEE_CLAIM}`,
  },
  {
    icon: ScanSearch,
    label: "Assessment",
    value: "3-min form",
    body: FORM_FIRST_CLAIM,
  },
  {
    icon: Stethoscope,
    label: "If approved",
    value: PRESCRIPTION_IF_APPROVED_CLAIM,
    body: "Fill it at an Australian pharmacy. Medicine cost is separate.",
  },
] as const

const HAIR_ASSESSMENT_SIGNALS = [
  {
    id: "pattern",
    icon: ScanSearch,
    label: "Pattern",
    detail: "Hairline, crown, or more general thinning, described through the pattern and history answers you provide.",
  },
  {
    id: "tempo",
    icon: CalendarRange,
    label: "Tempo",
    detail: "Recent, six to twelve months, or longer-running change helps the doctor understand the timeline.",
  },
  {
    id: "scalp",
    icon: Sparkles,
    label: "Scalp symptoms",
    detail: "Dandruff, psoriasis, persistent irritation, or infected follicles can change whether an examination is needed.",
  },
  {
    id: "safety",
    icon: HeartPulse,
    label: "Health context",
    detail: "Current medicines, allergies, conditions, blood pressure, heart history, and reproductive context complete the safety picture.",
  },
] as const

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "hair-loss",
  analyticsId: "hair-loss",
  growthExperience: {
    service: "hair_loss",
    version: HAIR_LOSS_LANDING_EXPERIENCE?.id ?? null,
  },
  sticky: {
    ctaText: `Start assessment · ${PRICING_DISPLAY.HAIR_LOSS}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "3-min form",
    responseTime: "Doctor-reviewed after submission",
  },
}

function HairHeroFacts() {
  return (
    <aside aria-label="Hair loss assessment facts" className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/50 bg-white shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:w-[360px]">
      <div className="border-b border-border/50 bg-muted/35 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm font-medium text-primary">Before you start</p>
        <Heading level="h3" as="h2" className="mt-1">The practical facts</Heading>
      </div>
      <dl className="divide-y divide-border/50 px-5 dark:divide-white/10">
        {HAIR_HERO_FACTS.map((fact) => (
          <div key={fact.label} className="py-3.5">
            <dt className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--service-hair)]/10 text-[color:var(--service-hair)]">
                <fact.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{fact.label}</span>
            </dt>
            <dd className="ml-12 mt-1 text-sm font-semibold text-foreground">{fact.value}</dd>
            <dd className="ml-12 mt-1 text-sm leading-6 text-muted-foreground">{fact.body}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

function HairAssessmentModel() {
  return (
    <section
      id="assessment-model"
      aria-labelledby="hair-assessment-model-title"
      className="bg-muted/30 py-6 dark:bg-white/[0.02] sm:py-12 lg:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Assessment model</SectionPill>
          <Heading id="hair-assessment-model-title" level="h2" className="mt-4">
            Pattern is only one part of the picture
          </Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            The doctor combines where hair is changing, how quickly it changed, scalp symptoms, and your health context. It is not a pattern-only assessment or a medicine menu.
          </p>
        </Reveal>

        <figure data-art-direction="hair-pattern-tempo-assessment" className="mt-6 rounded-2xl border border-border/50 bg-white p-5 dark:border-white/15 dark:bg-card sm:p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            {HAIR_ASSESSMENT_SIGNALS.map((signal) => (
              <div key={signal.id} className="min-w-0">
                <dt className="flex items-center gap-2 text-base font-semibold"><signal.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{signal.label}</dt>
                <dd className="mt-1 text-base leading-6 text-muted-foreground">{signal.detail}</dd>
              </div>
            ))}
          </dl>
          <figcaption className="mt-5 border-t border-border/50 pt-5 text-base leading-6 text-muted-foreground">
            This model explains the information reviewed. It does not diagnose the cause of hair loss or guarantee a prescription. Sudden or patchy loss, painful or infected scalp symptoms, wider body-hair changes, an unclear history, or other signs that need examination may be safer to assess in person. The doctor may ask for more detail, recommend tests or GP review, or decline online care. The doctor decides whether to prescribe.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function HairLossPricingSection({
  isDisabled,
  onStart,
  requestCtaHref,
}: {
  isDisabled: boolean
  onStart: () => void
  requestCtaHref: string
}) {
  return (
    <section id="pricing" aria-label="Hair loss assessment pricing" className="py-4 sm:py-12 lg:pt-6 lg:pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-primary/30 bg-white shadow-xl shadow-primary/[0.1] dark:border-white/15 dark:bg-card dark:shadow-none">
          <div className="grid divide-y divide-border/50 sm:grid-cols-[0.72fr_1.28fr] sm:divide-x sm:divide-y-0">
            <div className="p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Doctor review</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary-strong border border-primary/20">One-time</span>
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{PRICING_DISPLAY.HAIR_LOSS}</p>
              <p className="mt-2 text-base leading-7 text-muted-foreground">No subscription or ongoing InstantMed fee.</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />AHPRA-registered Australian doctor review</li>
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{PRESCRIPTION_IF_APPROVED_CLAIM} Fill it at an Australian pharmacy.</li>
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />Medicine cost is separate and paid to the pharmacy. Prescription is not guaranteed.</li>
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{REFUND_GUARANTEE_CLAIM}</li>
              </ul>
              <Button asChild size="lg" className="mt-6 w-full" onClick={onStart}>
                <Link href={isDisabled ? "/contact" : requestCtaHref}>
                  {isDisabled ? "Contact us" : "Start assessment"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function HairLossLanding() {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="hair-loss" />}
    >
      {({ isDisabled, heroCTARef, requestCtaHref, handleHeroCTA, handleHowItWorksCTA, handlePricingCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          <Hero
            pill={isDisabled ? null : undefined}
            title="Private hair loss assessment, from home."
            titleClassName="max-[240px]:text-[1.75rem] max-[240px]:hyphens-none max-[240px]:[overflow-wrap:normal]"
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.HAIR_LOSS}`,
              href: isDisabled ? "/contact" : requestCtaHref,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={
              <p className="mx-auto inline-flex max-w-xl items-start gap-2 text-left text-sm leading-snug text-foreground lg:mx-0">
                <Lock className="mt-px h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>Private and secure.<span className="text-muted-foreground"> Reviewed by an Australian doctor.</span></span>
              </p>
            }
            mockup={<HairHeroFacts />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0 lg:text-lg">
              A one-off private doctor assessment for {PRICING_DISPLAY.HAIR_LOSS}. {FORM_FIRST_CLAIM}
            </p>
          </Hero>

          <HairLossPricingSection
            isDisabled={isDisabled}
            onStart={handlePricingCTA}
            requestCtaHref={requestCtaHref}
          />

          <HairAssessmentModel />

          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref={requestCtaHref}
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            subheading="A private form first, then an Australian doctor reviews the complete picture and decides the safest next step."
            revealInstant
            compact
          />

          <FAQSection
            pill="FAQ"
            title="Hair loss assessment questions"
            subtitle="The key assessment, cost, privacy, and suitability answers before you start."
            items={HAIR_LOSS_LANDING_FAQ}
            initialCount={5}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-background"
          />

          <CTABanner
            title="Start a hair loss assessment."
            subtitle="A doctor reviews your assessment before deciding whether to prescribe."
            ctaText="Start assessment"
            ctaHref={requestCtaHref}
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.HAIR_LOSS}
            microcopy="Takes about 3 minutes."
            revealInstant
          />
        </>
      )}
    </LandingPageShell>
  )
}
