"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Lock,
  type LucideIcon,
  MessageCircle,
  Pill,
  ShieldCheck,
  Stethoscope,
  WalletCards,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import type { RefObject } from "react"

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
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"

const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((module) => module.FAQSection),
  { loading: () => <div className="min-h-[300px]" /> },
)

const ASSESSMENT_HREF = "/request?service=consult&subtype=ed"
const DOCTOR_REGISTRATION_CLAIM = getApprovedClaim("doctor_registration")

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "ed",
  analyticsId: "ed",
  sticky: {
    ctaText: `Start ED assessment - ${PRICING_DISPLAY.MENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "ED assessment",
    responseTime: "Doctor review 24/7",
  },
}

const HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: "Medicare details required for consultation records and electronic prescribing.",
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.MENS_HEALTH,
    body: "One-off doctor review. Full refund if the doctor declines. Medicine cost is separate.",
  },
  {
    icon: Clock3,
    label: "Secure form",
    value: "About 3 minutes",
    body: "Describe the erection pattern, heart context, chest-pain medicines, and relevant history.",
  },
  {
    icon: Stethoscope,
    label: "Clinical decision",
    value: "Doctor decides",
    body: "The doctor may approve, call or message for clarification, decline, or redirect to in-person care.",
  },
] as const

const ELIGIBILITY_ITEMS = [
  "You are in Australia and aged 18 or over.",
  "You can provide Medicare details, current medicines, allergies, heart-health history, and blood pressure context.",
  "Your main concern is ongoing difficulty getting or keeping an erection, and you can describe the pattern clearly.",
  "You understand that a prescription is not guaranteed and doctor contact may be needed before a decision.",
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
    body: "Chest symptoms, exercise tolerance, recent heart or stroke events, and blood pressure context.",
  },
  {
    icon: Pill,
    title: "Medicine safety",
    body: "Chest-pain medicines, other current medicines, allergies, and relevant conditions.",
  },
  {
    icon: AlertTriangle,
    title: "Red flags",
    body: "A prolonged or painful erection, injury, sudden severe genital pain, or symptoms that need urgent assessment.",
  },
] as const

const ED_DECISION_OUTCOMES = [
  {
    icon: CheckCircle2,
    title: "Online care may be suitable",
    body: "The doctor decides whether the complete history supports remote care and whether prescribing is clinically appropriate.",
  },
  {
    icon: MessageCircle,
    title: "A detail needs clarification",
    body: "The doctor may call or message about symptoms, medicines, heart context, or previous treatment before deciding.",
  },
  {
    icon: Stethoscope,
    title: "In-person care is safer",
    body: "The doctor may decline or redirect when examination, urgent assessment, or broader investigation is needed.",
  },
] as const

const SCOPE_ITEMS = [
  {
    icon: CheckCircle2,
    title: "This pathway covers",
    body: "A structured doctor review for erectile dysfunction concerns when the history and safety screen are complete enough for remote assessment.",
  },
  {
    icon: MessageCircle,
    title: "The doctor may contact you",
    body: "Unclear medicines, cardiovascular risk, conflicting answers, or symptoms outside a straightforward ED pattern can require a call or message.",
  },
  {
    icon: AlertTriangle,
    title: "This pathway does not cover",
    body: "Emergencies, prolonged painful erection, injury, fertility or libido workups, testosterone investigation, or requests for a guaranteed medicine.",
  },
] as const

const REVIEW_STEPS = [
  {
    number: "01",
    title: "Complete the private form",
    body: "Answer the erection-pattern, heart-health, medicine, blood pressure, allergy, and medical-history questions.",
  },
  {
    number: "02",
    title: "Doctor review and clarification",
    body: "An AHPRA-registered Australian doctor reviews the request and may call or message if a safety detail needs clarification.",
  },
  {
    number: "03",
    title: "Receive a clinical outcome",
    body: "The outcome may be approval if clinically appropriate, a request for more information, or decline with safer next steps and a refund.",
  },
] as const

const ALTERNATIVES = [
  {
    title: "Repeat prescriptions",
    href: "/prescriptions",
    body: "For a stable medicine you already take, use the separate repeat-prescription pathway.",
  },
  {
    title: "Hair loss assessment",
    href: "/hair-loss",
    body: "A separate men's-health pathway with its own history and safety screen.",
  },
  {
    title: "Chest pain",
    href: "/symptoms/chest-pain",
    body: "Chest pain leaves the ED pathway. Read the urgent-care boundary before doing anything else.",
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

function EdHero({
  isDisabled,
  heroCTARef,
  onStart,
}: {
  isDisabled: boolean
  heroCTARef: RefObject<HTMLDivElement>
  onStart: () => void
}) {
  return (
    <section className="relative overflow-hidden bg-[color:var(--morning-ivory)]/60 pb-14 pt-10 dark:bg-background sm:pt-14 lg:pb-20 lg:pt-20">
      <div className="relative mx-auto grid min-w-0 grid-cols-1 max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8">
        <Reveal instant className="min-w-0 max-w-2xl">
          <SectionPill>Men&apos;s health</SectionPill>
          <Heading level="display" className="mt-5">
            Erectile dysfunction assessment online Australia
          </Heading>
          <p data-speakable className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Start with a private safety screen for ED concerns. An Australian doctor reviews your answers and decides whether online care is clinically appropriate.
          </p>

          <div ref={heroCTARef} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-auto min-h-12 w-full whitespace-normal py-3 text-center shadow-lg shadow-primary/20 sm:w-auto"
              disabled={isDisabled}
              onClick={onStart}
            >
              <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                {isDisabled ? "Contact us" : "Start ED assessment"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto min-h-12 w-full whitespace-normal py-3 text-center sm:w-auto">
              <Link href="#red-flags">Check the safety boundary</Link>
            </Button>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {GUARANTEE} Prescription is not guaranteed. The doctor may call or message before deciding.
          </p>
        </Reveal>

        <Reveal instant className="min-w-0">
          <div className="rounded-3xl border border-border/50 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-6">
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
                  <dd className="ml-12 mt-1 text-sm leading-5 text-muted-foreground">{fact.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function EdEligibilitySection() {
  return (
    <section id="eligibility" className="py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <Reveal instant>
            <SectionPill>Eligibility</SectionPill>
            <Heading level="h2" className="mt-4">A focused starting point for ED concerns</Heading>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {FORM_FIRST_WEDGE} The form gives the doctor the information needed to decide whether remote assessment is suitable.
            </p>
          </Reveal>
          <Reveal instant>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ELIGIBILITY_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-border/50 bg-white p-4 text-sm leading-6 text-muted-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function EdSafetyDecisionMap() {
  return (
    <section id="decision-map" aria-labelledby="ed-decision-map-title" className="bg-muted/30 py-14 dark:bg-white/[0.02] sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Safety decision map</SectionPill>
          <Heading id="ed-decision-map-title" level="h2" className="mt-4">The doctor reviews the whole picture</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            One answer does not decide the outcome. The pattern, cardiovascular context, medicine safety, and red flags are considered together.
          </p>
        </Reveal>

        <figure
          data-art-direction="ed-safety-decision-map"
          aria-labelledby="ed-decision-map-title"
          aria-describedby="ed-decision-map-warning"
          className="mt-9 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(13rem,0.62fr)_minmax(0,0.95fr)]">
            <div className="min-w-0 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
                <Heading level="h3">Your private safety screen</Heading>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-strong dark:text-primary">Four signals</span>
              </div>
              <ol className="divide-y divide-border/50">
                {ED_DECISION_SIGNALS.map((signal, index) => (
                  <li key={signal.title} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-primary dark:bg-white/[0.06]">
                      <signal.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground"><span className="mr-2 text-muted-foreground" aria-hidden="true">{index + 1}.</span>{signal.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{signal.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex min-w-0 flex-col items-center justify-center border-y border-border/50 bg-[color:var(--morning-ivory)]/70 p-5 text-center dark:border-white/10 dark:bg-white/[0.04] lg:border-x lg:border-y-0">
              <ArrowRight className="mb-3 h-5 w-5 rotate-90 text-primary lg:rotate-0" aria-hidden="true" />
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <Stethoscope className="h-6 w-6" aria-hidden="true" />
              </span>
              <Heading level="h3" className="mt-4">Doctor review</Heading>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                {DOCTOR_REGISTRATION_CLAIM} The doctor weighs the combined clinical picture before any prescribing decision.
              </p>
              <ArrowRight className="mt-3 h-5 w-5 rotate-90 text-primary lg:rotate-0" aria-hidden="true" />
            </div>

            <div className="min-w-0 p-5 sm:p-6">
              <Heading level="h3">Possible next steps</Heading>
              <ul className="mt-4 divide-y divide-border/50">
                {ED_DECISION_OUTCOMES.map((outcome) => (
                  <li key={outcome.title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <outcome.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{outcome.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{outcome.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figcaption id="ed-decision-map-warning" role="note" className="border-t border-border/50 bg-muted/30 px-5 py-4 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/[0.03] sm:px-6">
            <span className="font-semibold text-foreground">Safety answers can change the care route.</span>{" "}
            The doctor may ask for non-urgent clarification, decline the online request, or recommend GP, sexual-health, or cardiovascular follow-up. The urgent-care boundary is set out next.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function ScopeCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      <Heading level="h3" className="mt-3 text-base">{title}</Heading>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

function EdScopeBoundarySection() {
  return (
    <section id="red-flags" className="py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Scope and red flags</SectionPill>
          <Heading level="h2" className="mt-4">Know when this pathway stops</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            This is a bounded ED review, not an emergency service, a full sexual-health clinic, or a guarantee of prescription medicine.
          </p>
        </Reveal>

        <Reveal instant className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950/20 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
            <div>
              <Heading level="h3" className="text-base">Do not wait for the online form</Heading>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Call 000 for chest pain, severe breathlessness, collapse, or stroke symptoms. Seek urgent care for an erection lasting more than 4 hours, a painful erection, penile injury, or sudden severe genital pain. Chest-pain medicines, unstable heart symptoms, or uncertainty about current medicines need a safer clinical route before any ED prescribing decision.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {SCOPE_ITEMS.map((item) => <ScopeCard key={item.title} {...item} />)}
        </div>
      </div>
    </section>
  )
}

function EdReviewCostOutcomeSection({ isDisabled, onStart }: { isDisabled: boolean; onStart: () => void }) {
  return (
    <section id="how-it-works" className="bg-muted/30 py-14 dark:bg-white/[0.02] sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Process, outcome, and cost</SectionPill>
          <Heading level="h2" className="mt-4">One review path, with the fee clear</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Complete the form, let the doctor review the safety picture, then receive the clinically appropriate next step.
          </p>
        </Reveal>

        <ol className="mt-8 grid gap-4 lg:grid-cols-3">
          {REVIEW_STEPS.map((step) => (
            <li key={step.number} className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
              <span className="text-xs font-semibold tracking-[0.12em] text-primary">{step.number}</span>
              <Heading level="h3" className="mt-3 text-base">{step.title}</Heading>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <Reveal instant className="mt-5 overflow-hidden rounded-2xl border border-primary/25 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
          <dl className="grid divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Doctor review</dt>
              <dd className="mt-2 text-xl font-semibold text-foreground">{PRICING_DISPLAY.MENS_HEALTH}</dd>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">One-off fee, shown before checkout.</dd>
            </div>
            <div className="p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">If declined</dt>
              <dd className="mt-2 text-base font-semibold text-foreground">Full refund</dd>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">{GUARANTEE}</dd>
            </div>
            <div className="p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">If prescribed</dt>
              <dd className="mt-2 text-base font-semibold text-foreground">Medicine cost is separate</dd>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">Pharmacy price may vary with PBS status, brand, and pharmacy pricing.</dd>
            </div>
          </dl>
          <div className="border-t border-border/50 p-5 text-center">
            <Button asChild size="lg" disabled={isDisabled} onClick={onStart}>
              <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                {isDisabled ? "Contact us" : "Start the secure form"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function EdAlternativesSection() {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionPill>Other routes</SectionPill>
            <Heading level="h2" className="mt-4">If ED assessment is not the right fit</Heading>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">Choose the pathway that matches the problem you need help with today.</p>
        </Reveal>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {ALTERNATIVES.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-colors hover:border-primary/30 dark:border-white/15 dark:bg-card dark:shadow-none">
              <Heading level="h3" className="text-base">{item.title}</Heading>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Read more<ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
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
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Reviewed against patient and telehealth guidance. Last reviewed June 2026.</p>
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

function EdFinalCta({ isDisabled, onStart }: { isDisabled: boolean; onStart: () => void }) {
  return (
    <section className="py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
          <SectionPill>Start privately</SectionPill>
          <Heading level="h2" className="mt-4">Request an ED assessment</Heading>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Complete the secure form. An AHPRA-registered doctor reviews your answers and decides whether online care is appropriate.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={onStart}>
              <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                {isDisabled ? "Contact us" : `Request assessment - ${PRICING_DISPLAY.MENS_HEALTH}`}
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
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <EdHero isDisabled={isDisabled} heroCTARef={heroCTARef} onStart={handleHeroCTA} />
          <EdEligibilitySection />
          <EdSafetyDecisionMap />
          <EdScopeBoundarySection />
          <EdReviewCostOutcomeSection isDisabled={isDisabled} onStart={handleHowItWorksCTA} />
          <EdAlternativesSection />
          <EdSourcesSection />
          <FAQSection
            pill="FAQ"
            title="Erectile dysfunction assessment FAQ"
            subtitle="The key clinical, cost, privacy, and pathway questions before you start."
            items={ED_LANDING_FAQ}
            initialCount={6}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-background"
          />
          <EdFinalCta isDisabled={isDisabled} onStart={handleFinalCTA} />
        </div>
      )}
    </LandingPageShell>
  )
}
