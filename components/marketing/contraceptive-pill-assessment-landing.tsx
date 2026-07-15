"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  type LucideIcon,
  ShieldCheck,
  Stethoscope,
  WalletCards,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { ArticleVisuals } from "@/components/blog/article-visuals"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { FAQSection } from "@/components/sections/faq-section"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import type { RenderableArticleVisual } from "@/lib/blog/visuals"
import { PRICING_DISPLAY } from "@/lib/constants"
import { PILL_LANDING_FAQ } from "@/lib/data/womens-health-faq"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health"
const WOMENS_HEALTH_HREF = "/womens-health"
const REPEAT_PRESCRIPTION_HREF = "/prescriptions"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "womens-health",
  analyticsId: "contraceptive-pill-assessment",
  sticky: {
    ctaText: `Start · choose pill next · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "Start or switch pill",
    responseTime: "Doctor review 24/7",
  },
}

const HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · 18+",
    body: "Medicare required for this prescription pathway.",
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.WOMENS_HEALTH,
    body: "One-off doctor review. Pharmacy costs are separate if a prescription is approved.",
  },
  {
    icon: HeartPulse,
    label: "Safety gate",
    value: "Before payment",
    body: "Possible pregnancy and specified pill-safety risks stop this paid pathway before checkout.",
  },
] as const

const SAFETY_CHECKS = [
  {
    title: "Pregnant or possibly pregnant",
    body: "A yes or not-sure answer stops the paid pathway so pregnancy can be ruled out or assessed through appropriate care.",
  },
  {
    title: "Migraine with aura",
    body: "A reported history stops this paid pathway and directs you to a GP or sexual health clinic.",
  },
  {
    title: "Blood clot history",
    body: "A personal or close-family clot history stops this paid pathway because it changes contraceptive safety.",
  },
  {
    title: "Smoking",
    body: "A yes answer stops this paid pathway. Smoking changes which pills may be safe, especially from age 35.",
  },
] as const

const ELIGIBILITY_ITEMS = [
  "You are in Australia, aged 18 or over, and have Medicare.",
  "You want to start an oral contraceptive pill or switch from another method.",
  "Your pre-checkout answers allow this online pathway to continue.",
  "You can provide current contraception, blood-pressure context, medical history, and medicine details clearly.",
] as const

const OUTSIDE_SCOPE_ITEMS = [
  "Continuing the exact same established pill and dose. Use repeat prescriptions instead.",
  "Emergency contraception, implants, IUDs, injections, ring fitting, cervical screening, or STI testing.",
  "Pregnancy or possible pregnancy, migraine with aura, blood clot history, or an unsafe smoking context: the form stops before checkout.",
  "Severe pelvic pain, heavy unexplained bleeding, sexual assault, chest pain, sudden shortness of breath, collapse, or other urgent symptoms.",
] as const

const REVIEW_COST_OUTCOMES = [
  {
    icon: ShieldCheck,
    title: "1 · Choose and pass the safety gate",
    body: "The link opens the shared women's-health form. Choose start or switch pill next. Terminal safety answers stop the pathway before payment and explain another care route.",
  },
  {
    icon: Stethoscope,
    title: "2 · Doctor review",
    body: "Only a request that passes the terminal screen proceeds to paid review by an AHPRA-registered doctor. A non-terminal detail such as an incomplete blood-pressure history may still need clarification.",
  },
  {
    icon: WalletCards,
    title: `3 · ${PRICING_DISPLAY.WOMENS_HEALTH}, outcome, or refund`,
    body: `Medicare is required and pharmacy costs are separate. If clinically appropriate, the outcome is sent digitally. Prescription is not guaranteed. ${GUARANTEE}`,
  },
] as const

const ALTERNATIVES = [
  {
    title: "Repeat prescription",
    href: REPEAT_PRESCRIPTION_HREF,
    body: "For an unchanged pill and dose you are already established on.",
  },
  {
    title: "Women's health hub",
    href: WOMENS_HEALTH_HREF,
    body: "Compare the start-or-switch pill and UTI symptom pathways.",
  },
  {
    title: "High blood pressure guide",
    href: "/conditions/hypertension",
    body: "Understand why blood pressure can change contraceptive suitability.",
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: combined oral contraceptive pill",
    href: "https://www.healthdirect.gov.au/the-pill-combined-oral-contraceptive-pill",
    body: "Australian patient information on the combined pill, safety, and doctor advice.",
  },
  {
    title: "Healthdirect: progestogen-only pill",
    href: "https://www.healthdirect.gov.au/mini-pill-progestogen-only-pill",
    body: "Patient information on the progestogen-only pill and related contraception choices.",
  },
  {
    title: "Healthdirect: contraception options",
    href: "https://www.healthdirect.gov.au/contraception-options",
    body: "A plain-English overview of contraception options available in Australia.",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "The clinical standard expected when doctors provide care by telehealth.",
  },
] as const

function InfoCard({
  title,
  body,
  icon: Icon,
  className,
}: {
  title: string
  body: string
  icon: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-full rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <Heading level="h3" className="text-base">
            {title}
          </Heading>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}

function Checklist({
  title,
  items,
  caution = false,
}: {
  title: string
  items: readonly string[]
  caution?: boolean
}) {
  const Icon = caution ? AlertTriangle : CheckCircle2

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-6 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none",
        caution
          ? "border-amber-200 dark:border-amber-800"
          : "border-emerald-200 dark:border-emerald-800",
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn("h-5 w-5", caution ? "text-amber-600" : "text-emerald-600")}
          aria-hidden="true"
        />
        <Heading level="h3">{title}</Heading>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                caution ? "text-amber-600" : "text-emerald-600",
              )}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionShell({
  id,
  pill,
  title,
  intro,
  children,
  muted = false,
}: {
  id: string
  pill: string
  title: string
  intro?: string
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section
      id={id}
      className={cn("bg-background py-14 sm:py-16 lg:py-20", muted && "bg-muted/30 dark:bg-white/[0.02]")}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="mx-auto max-w-3xl text-center">
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-4">
            {title}
          </Heading>
          {intro ? <p className="mt-3 text-base leading-7 text-muted-foreground">{intro}</p> : null}
        </Reveal>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  )
}

function VisualTextIndex({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {visuals.map((visual) => (
        <div
          key={visual.id}
          className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          <p className="text-xs font-semibold uppercase text-primary">{visual.eyebrow}</p>
          <Heading level="h3" className="mt-2 text-base">
            {visual.title}
          </Heading>
          <ul className="mt-4 space-y-3">
            {visual.items.map((item) => (
              <li key={`${visual.id}-${item.label}`} className="text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">{item.label}:</span> {item.detail}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ContraceptivePillAssessmentLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  const safetyVisuals = visuals.map((visual) => {
    if (visual.id === "pill-suitability-map") {
      return {
        ...visual,
        summary: "The pre-checkout form checks terminal pill-safety risks before any paid doctor review. Blood pressure and other non-terminal details inform review only if the pathway continues.",
        items: visual.items.map((item) => {
          if (item.label === "Pregnancy context") {
            return { ...item, detail: "Pregnant or not sure stops the paid pathway" }
          }
          if (item.label === "Migraine history") {
            return { ...item, detail: "Reported migraine with aura stops the paid pathway" }
          }
          if (item.label === "Clot and heart risk") {
            return { ...item, detail: "Reported blood clot history stops the paid pathway" }
          }
          return item
        }),
      }
    }

    if (visual.id === "pill-red-flag-boundary") {
      return {
        ...visual,
        items: visual.items.map((item) =>
          item.label === "Doctor review"
            ? {
                ...item,
                label: "Safety exit",
                detail: "Possible pregnancy, migraine aura, clot history, or smoking stops before checkout",
              }
            : item,
        ),
      }
    }

    return visual
  })

  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden bg-background pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_20%,rgba(186,212,245,0.32),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,198,160,0.24),transparent_30%)]"
            />
            <div className="relative mx-auto grid min-w-0 grid-cols-1 max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
              <Reveal instant className="min-w-0 max-w-2xl">
                <SectionPill>Women's health</SectionPill>
                <Heading level="display" className="mt-5">
                  Contraceptive pill assessment online
                </Heading>
                <p data-speakable className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Complete a secure start-or-switch safety screen. An AHPRA-registered doctor reviews a request only after it passes the pre-checkout terminal checks, then decides whether online prescribing is appropriate.
                </p>

                <div ref={heroCTARef} className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-auto min-h-12 w-full whitespace-normal py-3 text-center shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
                    disabled={isDisabled}
                    onClick={handleHeroCTA}
                  >
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : "Start · choose pill next"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-auto min-h-12 w-full whitespace-normal py-3 text-center sm:w-auto">
                    <Link href="#safety">Check safety exits first</Link>
                  </Button>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  On the next screen, choose start or switch pill. {GUARANTEE} Prescription is not guaranteed.
                </p>
              </Reveal>

              <Reveal instant className="min-w-0">
                <div className="rounded-3xl border border-border/50 bg-white p-6 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <p className="text-xs font-semibold uppercase text-primary">Before you start</p>
                  <Heading level="h2" className="mt-3">
                    The service in one glance
                  </Heading>
                  <div className="mt-5 divide-y divide-border/50">
                    {HERO_FACTS.map((fact) => (
                      <div key={fact.label} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <fact.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">{fact.label}</p>
                          <p className="mt-1 text-base font-semibold text-foreground">{fact.value}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <SectionShell
            id="safety"
            pill="Safety first"
            title="Four answers can stop this paid pathway before checkout"
            intro="Possible pregnancy, migraine with aura, blood clot history, and smoking change contraceptive safety. They are terminal intake checks here, not paid requests waiting for a doctor call."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {SAFETY_CHECKS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-amber-200 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-amber-800 dark:bg-card dark:shadow-none"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <div>
                      <Heading level="h3" className="text-base">
                        {item.title}
                      </Heading>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <Heading level="h3" className="text-base">
                    Urgent symptoms need urgent care
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Seek urgent care for chest pain, sudden shortness of breath, one-sided weakness, collapse, severe headache with vision or speech symptoms, calf swelling with pain, heavy unexplained bleeding, severe pelvic pain, or possible pregnancy with pain or bleeding. Call 000 for emergencies.
                  </p>
                </div>
              </div>
            </div>

            <ArticleVisuals visuals={safetyVisuals} />
            <VisualTextIndex visuals={safetyVisuals} />
          </SectionShell>

          <SectionShell
            id="eligibility-and-scope"
            pill="Eligibility and scope"
            title="For starting or switching the oral contraceptive pill"
            intro="This pathway does not replace a sexual health clinic, physical examination, emergency contraception service, procedure, or repeat-prescription pathway."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Checklist title="Usually a reasonable starting point" items={ELIGIBILITY_ITEMS} />
              <Checklist title="Use another pathway or in-person care" items={OUTSIDE_SCOPE_ITEMS} caution />
            </div>
          </SectionShell>

          <SectionShell
            id="review-cost-and-outcomes"
            pill="Process, cost, and outcome"
            title="Safety gate first, then doctor review"
            intro="The doctor decides whether any prescription is clinically appropriate. The public page does not offer a pill or brand menu."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {REVIEW_COST_OUTCOMES.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="alternatives"
            pill="Other routes"
            title="If this is not the right pathway"
            intro="Choose the route that matches whether you need an unchanged repeat, a different women's-health assessment, or in-person care."
            muted
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {ALTERNATIVES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <Heading level="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Read more
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="sources"
            pill="References"
            title="Australian sources"
            intro="Reviewed against Australian patient information and telehealth guidance. Last reviewed: 2026-06."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <p className="text-sm font-semibold text-foreground">{source.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.body}</p>
                </a>
              ))}
            </div>
          </SectionShell>

          <FAQSection
            pill="FAQ"
            title="Contraceptive pill assessment FAQ"
            subtitle="The essential safety, cost, and pathway questions before you start."
            items={PILL_LANDING_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <section className="bg-background py-14 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
                <SectionPill>Start safely</SectionPill>
                <Heading level="h2" className="mt-4">
                  Request a contraceptive pill assessment
                </Heading>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  The link opens the shared women's-health form. Choose start or switch pill on the next screen; the terminal safety check happens before checkout.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : `Start · choose pill next · ${PRICING_DISPLAY.WOMENS_HEALTH}`}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href={WOMENS_HEALTH_HREF}>Compare women's health options</Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      )}
    </LandingPageShell>
  )
}
