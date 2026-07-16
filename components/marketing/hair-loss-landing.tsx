"use client"

import {
  ArrowDown,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
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
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"

const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((module) => module.HowItWorksInline),
  { loading: () => <div className="min-h-[400px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((module) => module.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/regulatory-partners").then((module) => module.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
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
    description: "The doctor may approve if clinically appropriate, ask for more detail, or recommend in-person care.",
    time: "After review",
  },
]

const HAIR_HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: "Medicare details required for the consultation and prescribing record.",
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.HAIR_LOSS,
    body: "One-off doctor review. Full refund if the doctor declines.",
  },
  {
    icon: ScanSearch,
    label: "Assessment",
    value: "3-min form",
    body: "Pattern, timing, scalp symptoms, medicines, and health context are reviewed together.",
  },
  {
    icon: Stethoscope,
    label: "Boundary",
    value: "Doctor decides",
    body: "Pattern alone is not a diagnosis, and a prescription is never guaranteed.",
  },
] as const

const HAIR_ASSESSMENT_SIGNALS = [
  {
    id: "pattern",
    icon: ScanSearch,
    label: "Pattern",
    prompt: "Where is it changing?",
    detail: "Hairline, crown, or more general thinning, described through the pattern and history answers you provide.",
  },
  {
    id: "tempo",
    icon: CalendarRange,
    label: "Tempo",
    prompt: "When did it start?",
    detail: "Recent, six to twelve months, or longer-running change helps the doctor understand the timeline.",
  },
  {
    id: "scalp",
    icon: Sparkles,
    label: "Scalp symptoms",
    prompt: "What else is happening?",
    detail: "Dandruff, psoriasis, persistent irritation, or infected follicles can change whether an examination is needed.",
  },
  {
    id: "safety",
    icon: HeartPulse,
    label: "Health context",
    prompt: "Is remote care suitable?",
    detail: "Current medicines, allergies, conditions, blood pressure, heart history, and reproductive context complete the safety picture.",
  },
] as const

const HAIR_SUITABILITY_OUTCOMES = [
  {
    icon: CheckCircle2,
    title: "Online review may continue",
    body: "The history and pattern give the doctor enough information to assess the request remotely.",
  },
  {
    icon: MessageCircle,
    title: "More detail may be needed",
    body: "The doctor may call or message to clarify the pattern, scalp symptoms, medicines, or health history.",
  },
  {
    icon: Stethoscope,
    title: "In-person review may be safer",
    body: "A GP or skin examination may be more appropriate when the pattern or symptoms cannot be assessed safely online.",
  },
] as const

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "hair-loss",
  analyticsId: "hair-loss",
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
        <p className="text-xs font-medium text-primary">Before you start</p>
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
            <dd className="ml-12 mt-1 text-xs leading-5 text-muted-foreground">{fact.body}</dd>
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
      className="bg-muted/30 py-14 dark:bg-white/[0.02] sm:py-16 lg:py-20"
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

        <figure
          data-art-direction="hair-pattern-tempo-assessment"
          className="mt-9 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
            <dl className="min-w-0 divide-y divide-border/50 p-5 sm:p-6">
              {HAIR_ASSESSMENT_SIGNALS.map((signal) => (
                <div
                  key={signal.id}
                  className="min-w-0 py-4 first:pt-0 last:pb-0"
                >
                  <dt className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--service-hair)]/10 text-[color:var(--service-hair)]">
                      <signal.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>{signal.label}</span>
                  </dt>
                  <dd className="ml-[3.25rem] mt-2 text-sm font-medium text-foreground">{signal.prompt}</dd>
                  <dd className="ml-[3.25rem] mt-1 text-sm leading-6 text-muted-foreground">
                    {signal.detail}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex min-w-0 flex-col justify-center border-t border-border/50 bg-[color:var(--morning-ivory)]/70 p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-6 lg:border-l lg:border-t-0">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--service-hair)] text-[color:var(--warning-foreground)] shadow-sm shadow-primary/[0.04]">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <Heading level="h3" className="mt-4">The combination matters</Heading>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Pattern does not decide suitability on its own. The doctor reviews all four signals before recommending the next step.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-foreground">
                <span className="rounded-full border border-border/50 bg-white px-3 py-1.5 dark:border-white/15 dark:bg-card">Pattern</span>
                <span aria-hidden="true">+</span>
                <span className="rounded-full border border-border/50 bg-white px-3 py-1.5 dark:border-white/15 dark:bg-card">Tempo</span>
                <span aria-hidden="true">+</span>
                <span className="rounded-full border border-border/50 bg-white px-3 py-1.5 dark:border-white/15 dark:bg-card">Scalp</span>
                <span aria-hidden="true">+</span>
                <span className="rounded-full border border-border/50 bg-white px-3 py-1.5 dark:border-white/15 dark:bg-card">Health</span>
              </div>
              <ArrowDown className="mt-5 h-5 w-5 text-[color:var(--service-hair)]" aria-hidden="true" />
            </div>
          </div>

          <div className="border-t border-border/50 p-5 dark:border-white/10 sm:p-6">
            <Heading level="h3">What the review can lead to</Heading>
            <ul className="mt-4 grid min-w-0 divide-y divide-border/50 md:grid-cols-3 md:divide-x md:divide-y-0">
              {HAIR_SUITABILITY_OUTCOMES.map((outcome) => (
                <li key={outcome.title} className="min-w-0 py-4 first:pt-0 last:pb-0 md:px-5 md:py-0 md:first:pl-0 md:last:pr-0">
                  <outcome.icon className="h-5 w-5 text-[color:var(--service-hair)]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{outcome.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{outcome.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <figcaption className="border-t border-border/50 bg-muted/30 px-5 py-3 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/[0.03] sm:px-6">
            This model explains the information reviewed. It does not diagnose the cause of hair loss or guarantee a prescription.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function HairLossPricingSection({ isDisabled }: { isDisabled: boolean }) {
  return (
    <section id="pricing" aria-label="Hair loss assessment pricing" className="py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-2xl text-center">
          <SectionPill>Fee and dispensing</SectionPill>
          <Heading level="h2" className="mt-4">One review fee. Clear pharmacy boundary.</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Doctor review comes first. A prescription is issued only when clinically appropriate.
          </p>
        </Reveal>

        <Reveal instant className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border border-primary/30 bg-white shadow-xl shadow-primary/[0.1] dark:border-white/15 dark:bg-card dark:shadow-none">
          <div className="grid divide-y divide-border/50 sm:grid-cols-[0.72fr_1.28fr] sm:divide-x sm:divide-y-0">
            <div className="p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Doctor review</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary-strong border border-primary/20">One-time</span>
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{PRICING_DISPLAY.HAIR_LOSS}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">No subscription or ongoing InstantMed fee.</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />AHPRA-registered Australian doctor review</li>
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{GUARANTEE}</li>
                <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />Medicine cost is separate and paid to the pharmacy if a prescription is approved.</li>
              </ul>
              <Button asChild size="lg" className="mt-6 w-full" disabled={isDisabled}>
                <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                  {isDisabled ? "Contact us" : "Start assessment"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>

        <RegulatoryPartners className="mt-8 border-t border-border/50 pb-0 pt-7 dark:border-white/10" />
      </div>
    </section>
  )
}

function HairLossLimitationsSection() {
  return (
    <section aria-labelledby="hair-loss-limits-title" className="bg-muted/30 py-12 dark:bg-white/[0.02] sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <div>
              <Heading id="hair-loss-limits-title" level="h2" className="text-lg">What this online review cannot settle on its own</Heading>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A hair pattern does not diagnose the cause of hair loss. Sudden or patchy loss, painful or infected scalp symptoms, wider body-hair changes, an unclear history, or other signs that need examination may be safer to assess in person. The doctor may ask for more detail, recommend tests or GP review, or decline online care. A prescription is never guaranteed.
              </p>
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
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          <Hero
            title="Hair loss assessment, reviewed from home."
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.HAIR_LOSS}`,
              href: isDisabled ? "/contact" : ASSESSMENT_HREF,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={
              <p className="mx-auto inline-flex max-w-xl items-start gap-2 text-left text-[13px] leading-snug text-foreground lg:mx-0">
                <Sparkles className="mt-px h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>Clinical assessment.<span className="text-muted-foreground"> Your doctor decides what is clinically appropriate.</span></span>
              </p>
            }
            mockup={<HairHeroFacts />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0 lg:text-lg">
              {FORM_FIRST_WEDGE} Pattern, timing, scalp symptoms, and health context are reviewed together. {GUARANTEE}
            </p>
          </Hero>

          <HairAssessmentModel />

          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref={ASSESSMENT_HREF}
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            subheading="A private form first, then an Australian doctor reviews the complete picture and decides the safest next step."
            revealInstant
          />

          <DoctorProfileSection instant />
          <HairLossPricingSection isDisabled={isDisabled} />
          <HairLossLimitationsSection />

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
            subtitle="A doctor reviews your assessment and prescribes only when it is clinically appropriate."
            ctaText="Start assessment"
            ctaHref={ASSESSMENT_HREF}
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
