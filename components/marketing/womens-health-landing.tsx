"use client"

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Droplets,
  HeartPulse,
  Lock,
  RefreshCw,
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
import { WomensHealthDecisionFork } from "@/components/marketing/womens-health-decision-fork"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { WOMENS_HEALTH_HUB_FAQ } from "@/lib/data/womens-health-faq"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"

const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((module) => module.FAQSection),
  { loading: () => <div className="min-h-[300px]" /> },
)

const DOCTOR_REGISTRATION_CLAIM = getApprovedClaim("doctor_registration")
const REQUEST_HREF = "/request?service=consult&subtype=womens_health"
const UTI_REQUEST_HREF = "/request?service=consult&subtype=womens_health&intent=uti"
const PILL_REQUEST_HREF = "/request?service=consult&subtype=womens_health&intent=ocp_new"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "consult",
  analyticsId: "womens-health",
  sticky: {
    ctaText: `Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: REQUEST_HREF,
    mobileSummary: "UTI or the pill",
    responseTime: "Doctor-reviewed after submission",
  },
}

const COMMON_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: "Both assessments are for adults in Australia.",
  },
  {
    icon: BadgeCheck,
    label: "Clinical record",
    value: "Medicare or IHI",
    body: getApprovedClaim("prescribing_identity_required"),
  },
  {
    icon: WalletCards,
    label: "Doctor review",
    value: PRICING_DISPLAY.WOMENS_HEALTH,
    body: "One-off fee. Pharmacy cost is separate if a prescription is approved.",
  },
  {
    icon: CheckCircle2,
    label: "If declined",
    value: "Full refund",
    body: "Full refund if the doctor declines the request.",
  },
] as const

function WomensHealthCommonFacts() {
  return (
    <section aria-label="Women's health assessment facts" className="border-y border-border/50 bg-muted/25 py-8 dark:border-white/10 dark:bg-white/[0.02]">
      <dl className="mx-auto grid max-w-6xl divide-y divide-border/50 px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4 lg:px-8">
        {COMMON_FACTS.map((fact) => (
          <div key={fact.label} className="px-4 py-4 first:pl-0 last:pr-0 sm:first:pl-4 sm:last:pr-4">
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
    </section>
  )
}

function WomensHealthBoundarySection() {
  return (
    <section aria-labelledby="womens-health-boundary-title" className="bg-muted/30 py-10 dark:bg-white/[0.02] sm:py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Safety boundary</SectionPill>
          <Heading id="womens-health-boundary-title" level="h2" className="mt-4">Check what takes you out of online care</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            The forms screen these issues before payment where possible. Do not start online when the safer route is already clear.
          </p>
        </Reveal>

        <Reveal instant className="mt-8 overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-md shadow-primary/[0.05] dark:border-rose-900 dark:bg-card dark:shadow-none">
          <div className="grid divide-y divide-border/50 md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-sky-700 dark:text-sky-300" aria-hidden="true" />
                <Heading level="h3">UTI symptoms</Heading>
              </div>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Fever or chills, pain in your back or side, vomiting, blood in your urine, pregnancy or possible pregnancy, recurrent infections, pelvic pain, STI concerns, or symptoms that do not fit a simple lower-urinary pattern need in-person assessment. Call 000 for an emergency.
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <HeartPulse className="h-5 w-5 text-pink-700 dark:text-pink-300" aria-hidden="true" />
                <Heading level="h3">Starting or switching the pill</Heading>
              </div>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Possible pregnancy, migraine with aura, clot history, or smoking stop this online start-or-switch assessment before payment. Missing blood pressure context, pelvic pain, heavy bleeding, STI concerns, or other safety uncertainty may also require in-person review or a different assessment.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-950 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-100 sm:px-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p><span className="font-semibold">Prescription is never guaranteed.</span> The reviewing doctor decides whether online care is suitable after the complete safety screen.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function WomensHealthReviewAndPriceSection() {
  return (
    <section id="review-and-price" aria-labelledby="womens-health-review-title" className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>Doctor review and fee</SectionPill>
          <Heading id="womens-health-review-title" level="h2" className="mt-4">One fee for either assessment</Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            The UTI and pill forms use different safety screens, but the review, refund and pharmacy-cost boundaries are the same.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal instant className="rounded-2xl border border-primary/30 bg-white p-6 shadow-xl shadow-primary/[0.1] dark:border-white/15 dark:bg-card dark:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Doctor review</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary-strong border border-primary/20">One-time</span>
            </div>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{PRICING_DISPLAY.WOMENS_HEALTH}</p>
            <ul className="mt-5 space-y-3">
              <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{GUARANTEE}</li>
              <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />Pharmacy and medicine costs are separate if a prescription is approved.</li>
              <li className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />No subscription or recurring InstantMed fee.</li>
            </ul>
          </Reveal>

          <Reveal instant className="rounded-2xl border border-border/50 bg-muted/25 p-6 dark:border-white/15 dark:bg-white/[0.03]">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-6 w-6" aria-hidden="true" />
            </span>
            <Heading level="h3" className="mt-4">AHPRA-registered doctor review</Heading>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              {DOCTOR_REGISTRATION_CLAIM} The doctor may call or message if a safety detail needs clarification, approve when clinically appropriate, decline, or recommend a safer in-person route.
            </p>
            <a
              href="https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Check the AHPRA public register
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function WomensHealthFinalChoice({ isDisabled, onChoose }: { isDisabled: boolean; onChoose: () => void }) {
  const utiHref = isDisabled ? "/contact" : UTI_REQUEST_HREF
  const pillHref = isDisabled ? "/contact" : PILL_REQUEST_HREF

  return (
    <section id="choose-care" className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="rounded-3xl border border-border/50 bg-[color:var(--morning-ivory)]/65 p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
          <SectionPill>Choose your assessment</SectionPill>
          <Heading level="h2" className="mt-4">What do you need reviewed?</Heading>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Choose an assessment to begin its safety screen. You can read the detailed pages above first if you prefer.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg" className="h-auto min-h-12 whitespace-normal py-3" disabled={isDisabled} onClick={onChoose}>
              <Link href={utiHref}>
                {isDisabled ? "Contact us" : "UTI symptom assessment"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto min-h-12 whitespace-normal py-3" disabled={isDisabled} onClick={onChoose}>
              <Link href={pillHref}>
                {isDisabled ? "Contact us" : "Start or switch the pill"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Want the detail first? Read the <Link href="/uti-assessment-online" className="font-medium text-primary underline-offset-4 hover:underline">UTI assessment page</Link> or the <Link href="/contraceptive-pill-assessment-online" className="font-medium text-primary underline-offset-4 hover:underline">contraceptive pill page</Link>.
          </p>
          <Link href="/prescriptions" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Continuing the same pill? Use repeat prescriptions.
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

export function WomensHealthLanding() {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="womens-health" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          <Hero
            title="UTI or the pill. Reviewed by a doctor, from home."
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
              href: isDisabled ? "/contact" : REQUEST_HREF,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={
              <p className="mx-auto inline-flex max-w-xl items-start gap-2 text-left text-sm leading-snug text-foreground lg:mx-0">
                <Lock className="mt-px h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>Private and secure.<span className="text-muted-foreground"> Each focused form is reviewed by an Australian doctor.</span></span>
              </p>
            }
            mockup={<WomensHealthDecisionFork />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0 lg:text-lg">
              {FORM_FIRST_WEDGE} Choose UTI symptoms, or starting or switching the pill. Each form has its own safety screen before payment.
            </p>
          </Hero>

          <WomensHealthCommonFacts />
          <WomensHealthBoundarySection />
          <WomensHealthReviewAndPriceSection />

          <FAQSection
            pill="FAQ"
            title="Women's health assessment questions"
            subtitle="The essentials before choosing the UTI or pill assessment."
            items={WOMENS_HEALTH_HUB_FAQ}
            initialCount={6}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <WomensHealthFinalChoice isDisabled={isDisabled} onChoose={handleFinalCTA} />
        </>
      )}
    </LandingPageShell>
  )
}
