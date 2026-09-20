"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  HeartPulse,
  Lock,
  Pill,
  ShieldCheck,
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
import { PRICING_DISPLAY } from "@/lib/constants"
import { ED_LANDING_FAQ } from "@/lib/data/ed-faq"
import { getActiveSpecialtyExperience } from "@/lib/growth/specialty-experiences"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { getService } from "@/lib/services/service-catalog"

const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((module) => module.FAQSection),
)

const ASSESSMENT_HREF = "/request?service=consult&subtype=ed"
const ED_LANDING_EXPERIENCE = getActiveSpecialtyExperience("ed")
const ED_SERVICE = getService("ed")
const DOCTOR_REGISTRATION_CLAIM = getApprovedClaim("doctor_registration")
const FORM_FIRST_CLAIM = getApprovedClaim("form_first_wedge")
const PRESCRIPTION_IF_APPROVED_CLAIM = getApprovedClaim("prescription_if_approved")
const REFUND_GUARANTEE_CLAIM = getApprovedClaim("refund_guarantee")

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "ed",
  analyticsId: "ed",
  growthExperience: {
    service: "ed",
    version: ED_LANDING_EXPERIENCE?.id ?? null,
  },
  sticky: {
    ctaText: `Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "ED assessment",
    responseTime: "Doctor-reviewed after submission",
  },
}

const HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: getApprovedClaim("prescribing_identity_required"),
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.MENS_HEALTH,
    body: `One-off private doctor assessment. ${REFUND_GUARANTEE_CLAIM}`,
  },
  {
    icon: Clock3,
    label: "Assessment",
    value: ED_SERVICE.effort,
    body: FORM_FIRST_CLAIM,
  },
  {
    icon: Stethoscope,
    label: "If approved",
    value: PRESCRIPTION_IF_APPROVED_CLAIM,
    body: "Fill it at an Australian pharmacy. Medicine cost is separate. Prescription is not guaranteed.",
  },
] as const

const ED_DECISION_SIGNALS = [
  {
    icon: Activity,
    title: "Erection pattern",
    body: "What has changed, how long it has been happening, and whether getting or keeping an erection is the main concern.",
  },
  {
    icon: HeartPulse,
    title: "Cardiovascular context",
    body: "Recent heart or stroke history, severe heart disease, and very low blood pressure.",
  },
  {
    icon: Pill,
    title: "Medicine safety",
    body: "Current medicines, allergies, and relevant conditions.",
  },
  {
    icon: AlertTriangle,
    title: "Red flags",
    body: "A prolonged or painful erection, injury, sudden severe genital pain, or symptoms that need urgent assessment.",
  },
] as const

const REVIEW_STEPS = [
  {
    number: "01",
    title: "Complete the private form",
    body: "Answer the erection-pattern, heart and stroke history, very low blood pressure, medicine, allergy, and medical-history questions.",
  },
  {
    number: "02",
    title: "Doctor review and clarification",
    body: "An AHPRA-registered Australian doctor reviews the request and can call or message if a safety detail needs clarification.",
  },
  {
    number: "03",
    title: "Receive a clinical outcome",
    body: `${PRESCRIPTION_IF_APPROVED_CLAIM} Otherwise, the doctor may ask for more information or decline with safer next steps and a refund.`,
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: erectile dysfunction",
    href: "https://www.healthdirect.gov.au/erectile-dysfunction",
  },
  {
    title: "Healthdirect: erectile dysfunction medicines",
    href: "https://www.healthdirect.gov.au/erectile-dysfunction-medicines",
  },
  {
    title: "Healthdirect: prolonged erection",
    href: "https://www.healthdirect.gov.au/prolonged-erection",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
  },
] as const

function EdHeroFacts() {
  return (
    <aside aria-label="ED assessment facts" className="w-[320px] max-w-[calc(100vw-2rem)] rounded-3xl border border-border/50 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:w-[360px] sm:p-6">
      <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 dark:bg-white/[0.04]">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Before you start</p>
          <Heading level="h2" as="h2" className="mt-2">The practical facts</Heading>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-border/50">
        {HERO_FACTS.map((fact) => (
          <div key={fact.label} className="py-3 first:pt-0 last:pb-0">
            <dt className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

function EdEligibilitySection() {
  return (
    <section id="eligibility" aria-label="ED assessment eligibility" className="py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Heading level="h2">Is this assessment right for you?</Heading>
        <p className="mt-3 text-base leading-7 text-muted-foreground">Your main concern should be ongoing difficulty getting or keeping an erection. Have your current medicines, allergies, conditions, and heart or stroke history ready. The doctor decides whether remote care is suitable and may contact you before a decision.</p>
      </div>
    </section>
  )
}

function EdSafetyDecisionMap() {
  return (
    <section id="decision-map" aria-labelledby="ed-decision-map-title" className="bg-muted/30 py-10 dark:bg-white/[0.02] sm:py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Safety decision map</SectionPill>
          <Heading id="ed-decision-map-title" level="h2" className="mt-4">The doctor reviews the whole picture</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            One answer does not decide the outcome. The pattern, cardiovascular context, medicine safety, and red flags are considered together.
          </p>
        </Reveal>

        <figure data-art-direction="ed-safety-decision-map" aria-labelledby="ed-decision-map-title" aria-describedby="ed-decision-map-warning" className="mt-6 rounded-2xl border border-border/50 bg-white p-5 dark:border-white/15 dark:bg-card sm:p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            {ED_DECISION_SIGNALS.map((signal) => (
              <div key={signal.title} className="min-w-0">
                <dt className="flex items-center gap-2 text-base font-semibold"><signal.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{signal.title}</dt>
                <dd className="mt-1 text-base leading-6 text-muted-foreground">{signal.body}</dd>
              </div>
            ))}
          </dl>
          <figcaption id="ed-decision-map-warning" className="mt-5 border-t border-border/50 pt-5 text-base leading-6 text-muted-foreground">
            {DOCTOR_REGISTRATION_CLAIM} The doctor may call or message for clarification, decline the online request, or recommend GP, sexual-health, or cardiovascular follow-up. The urgent-care boundary is set out next.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function EdScopeBoundarySection() {
  return (
    <section id="red-flags" className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Scope and red flags</SectionPill>
          <Heading level="h2" className="mt-4">Know where this assessment stops</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            This is a bounded ED review, not an emergency service, a full sexual-health clinic, or a guarantee of prescription medicine.
          </p>
        </Reveal>

        <Reveal instant className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950/20 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
            <div>
              <Heading level="h3" className="text-base">Do not wait for the online form</Heading>
              <p className="mt-2 text-base leading-7 text-muted-foreground">
                Call 000 for chest pain, severe breathlessness, collapse, or stroke symptoms. Seek urgent care for an erection lasting more than 4 hours, a painful erection, penile injury, or sudden severe genital pain. Chest-pain medicines, unstable heart symptoms, or uncertainty about current medicines need a safer clinical route before any ED prescribing decision.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function EdReviewCostOutcomeSection({
  isDisabled,
  onStart,
  requestCtaHref,
}: {
  isDisabled: boolean
  onStart: () => void
  requestCtaHref: string
}) {
  return (
    <section id="how-it-works" className="bg-muted/30 py-10 dark:bg-white/[0.02] sm:py-12 lg:pb-20 lg:pt-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Process, outcome, and cost</SectionPill>
          <Heading level="h2" className="mt-4">One review path, with the fee clear</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Complete the form, let the doctor review the safety picture, then get the next step the doctor decides on.
          </p>
        </Reveal>

        <ol className="mt-8 grid gap-4 lg:grid-cols-3">
          {REVIEW_STEPS.map((step) => (
            <li key={step.number} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
              <span className="text-sm font-semibold tracking-[0.12em] text-primary">{step.number}</span>
              <Heading level="h3" className="mt-3 text-base">{step.title}</Heading>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <Reveal instant className="mt-5 overflow-hidden rounded-2xl border border-primary/25 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
          <div className="p-5 text-center">
            <Button asChild size="lg" onClick={onStart}>
              <Link href={isDisabled ? "/contact" : requestCtaHref}>
                {isDisabled ? "Contact us" : "Start private assessment"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function EdSourcesSection() {
  return (
    <section className="bg-muted/30 py-10 dark:bg-white/[0.02] sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <Reveal instant>
            <SectionPill>References</SectionPill>
            <Heading level="h2" className="mt-4 text-balance">Australian safety sources</Heading>
            <p className="mt-3 text-base leading-7 text-muted-foreground">Reviewed against patient and telehealth guidance. Last reviewed June 2026.</p>
          </Reveal>
          <Reveal instant>
            <ul className="divide-y divide-border/50 rounded-2xl border border-border/50 bg-white px-5 dark:border-white/15 dark:bg-card">
              {SOURCES.map((source) => (
                <li key={source.href} className="py-3">
                  <a href={source.href} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                    {source.title}<ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function EdFinalCta({
  isDisabled,
  onStart,
  requestCtaHref,
}: {
  isDisabled: boolean
  onStart: () => void
  requestCtaHref: string
}) {
  return (
    <section className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
          <SectionPill>Start privately</SectionPill>
          <Heading level="h2" className="mt-4">Request an ED assessment</Heading>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Complete the secure form. An AHPRA-registered doctor reviews your answers and decides whether online care is appropriate.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto" onClick={onStart}>
              <Link href={isDisabled ? "/contact" : requestCtaHref}>
                {isDisabled ? "Contact us" : `Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#red-flags">Review the safety boundary</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function ErectileDysfunctionLanding() {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, requestCtaHref, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <Hero
            pill={isDisabled ? null : undefined}
            className="lg:pb-4"
            title="Private ED assessment, from home."
            titleClassName="max-[240px]:text-[1.75rem] max-[240px]:hyphens-none max-[240px]:[overflow-wrap:normal]"
            immediateSubheadline
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}`,
              href: isDisabled ? "/contact" : requestCtaHref,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={{ text: "See how it works", href: "#how-it-works" }}
            reassuranceRow={(
              <p className="text-center text-sm leading-6 text-muted-foreground lg:text-left">
                {REFUND_GUARANTEE_CLAIM}
              </p>
            )}
            mockup={<EdHeroFacts />}
          >
            <p data-speakable className="mx-auto mb-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg">
              A one-off private doctor assessment for {PRICING_DISPLAY.MENS_HEALTH}. Complete a secure form from home, then an Australian doctor reviews the full picture.
            </p>
          </Hero>
          <EdReviewCostOutcomeSection isDisabled={isDisabled} onStart={handleHowItWorksCTA} requestCtaHref={requestCtaHref} />
          <EdEligibilitySection />
          <EdSafetyDecisionMap />
          <EdScopeBoundarySection />
          <EdSourcesSection />
          <FAQSection
            pill="FAQ"
            title="Erectile dysfunction assessment FAQ"
            subtitle="The key clinical, cost, privacy and service questions before you start."
            items={ED_LANDING_FAQ}
            initialCount={6}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-background"
          />
          <EdFinalCta isDisabled={isDisabled} onStart={handleFinalCTA} requestCtaHref={requestCtaHref} />
        </div>
      )}
    </LandingPageShell>
  )
}
