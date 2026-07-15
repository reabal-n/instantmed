"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Droplets,
  FlaskConical,
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
import { UTI_LANDING_FAQ } from "@/lib/data/womens-health-faq"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health"
const WOMENS_HEALTH_HREF = "/womens-health"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "womens-health",
  analyticsId: "uti-assessment",
  sticky: {
    ctaText: `Start · choose UTI next · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "UTI symptom assessment",
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
    icon: Stethoscope,
    label: "Scope",
    value: "Possible uncomplicated UTI",
    body: "Red flags, pregnancy risk, recurrent symptoms, or an unclear pattern need another care route.",
  },
] as const

const SYMPTOM_FIT = [
  {
    icon: Droplets,
    title: "A lower-tract pattern",
    body: "Burning when passing urine, frequency, urgency, cloudy urine, incomplete emptying, or mild lower abdominal discomfort can fit a simple lower UTI pattern.",
  },
  {
    icon: AlertTriangle,
    title: "Red flags change the route",
    body: "Fever, chills, vomiting, one-sided back or flank pain, severe pain, pregnancy risk, visible blood, or feeling very unwell need prompt in-person assessment.",
  },
  {
    icon: FlaskConical,
    title: "It may be something else",
    body: "Vaginal discharge, genital sores, STI exposure, pelvic pain, stones, persistent blood, or recurrent symptoms can need examination or testing before treatment.",
  },
] as const

const SAFETY_CHECKS = [
  "symptom timing, burning, frequency, urgency, cloudy urine, and blood",
  "fever, chills, vomiting, flank pain, severe pain, or feeling very unwell",
  "pregnancy or possible pregnancy, breastfeeding context, and recent birth",
  "recurrence, recent treatment, kidney disease, diabetes, immune risk, or catheter use",
  "medicine allergies, current medicines, vaginal symptoms, STI concern, and pelvic pain",
] as const

const SUITABLE_ITEMS = [
  "You are in Australia, aged 18 or over, and have Medicare.",
  "Your answers fit a possible uncomplicated lower UTI pattern.",
  "You are not pregnant or unsure about pregnancy.",
  "You can complete the safety screen, medicine history, and allergy questions clearly.",
] as const

const OUTSIDE_SCOPE_ITEMS = [
  "Pregnancy or possible pregnancy; men; children; or catheter-related symptoms.",
  "Fever, vomiting, flank pain, severe pelvic or abdominal pain, or feeling very unwell.",
  "Recurrent or recently treated symptoms, visible blood, kidney or immune-risk history, or symptoms that are not improving.",
  "Vaginal symptoms, STI concern, sexual assault, or a presentation that needs examination or testing.",
] as const

const REVIEW_COST_OUTCOMES = [
  {
    icon: Droplets,
    title: "1 · Choose UTI symptoms",
    body: "The link opens the shared women's-health form. Choose UTI symptoms on the next screen, then complete the symptom and safety questions.",
  },
  {
    icon: Stethoscope,
    title: `2 · Doctor review · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    body: "An AHPRA-registered doctor reviews a suitable request. They may call or message if a non-urgent detail needs clarification. Medicare is required; pharmacy costs are separate.",
  },
  {
    icon: CheckCircle2,
    title: "3 · Digital outcome or refund",
    body: `If clinically appropriate, the outcome is sent digitally. Treatment is not guaranteed. ${GUARANTEE}`,
  },
] as const

const ALTERNATIVES = [
  {
    title: "Women's health hub",
    href: WOMENS_HEALTH_HREF,
    body: "Compare UTI symptoms with the start-or-switch pill pathway.",
  },
  {
    title: "UTI condition guide",
    href: "/conditions/uti",
    body: "Read about urinary infection symptoms and when care is urgent.",
  },
  {
    title: "Burning urination",
    href: "/symptoms/burning-when-urinating",
    body: "Review other causes when burning does not fit a simple UTI pattern.",
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: urinary tract infection",
    href: "https://www.healthdirect.gov.au/urinary-tract-infection-uti",
    body: "Australian patient information on symptoms, kidney-infection warnings, and when to see a doctor.",
  },
  {
    title: "Healthdirect: kidney infection",
    href: "https://www.healthdirect.gov.au/kidney-infection",
    body: "Patient information on serious upper urinary tract infection and prompt medical care.",
  },
  {
    title: "Pregnancy Birth and Baby: UTIs during pregnancy",
    href: "https://www.pregnancybirthbaby.org.au/urinary-tract-infections-utis-during-pregnancy",
    body: "Australian guidance explaining why UTI symptoms in pregnancy need clinician assessment.",
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

export function UtiAssessmentLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden bg-background pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_20%,rgba(186,212,245,0.30),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,198,160,0.22),transparent_30%)]"
            />
            <div className="relative mx-auto grid min-w-0 grid-cols-1 max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
              <Reveal instant className="min-w-0 max-w-2xl">
                <SectionPill>Women's health</SectionPill>
                <Heading level="display" className="mt-5">
                  UTI assessment online Australia
                </Heading>
                <p data-speakable className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Complete a secure symptom and safety screen for a possible uncomplicated UTI. An AHPRA-registered doctor reviews a suitable request and decides whether online care is appropriate.
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
                      {isDisabled ? "Contact us" : "Start · choose UTI next"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-auto min-h-12 w-full whitespace-normal py-3 text-center sm:w-auto">
                    <Link href="#symptoms-and-red-flags">Check symptoms and red flags</Link>
                  </Button>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  On the next screen, choose UTI symptoms. {GUARANTEE} Treatment is not guaranteed.
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
            id="symptoms-and-red-flags"
            pill="Symptoms and safety"
            title="The pattern matters more than any single symptom"
            intro="The assessment checks whether the story fits a lower-risk urinary infection or whether testing, examination, or urgent care is safer."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {SYMPTOM_FIT.map((item) => (
                <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <Heading level="h3" className="text-base">
                    Do not wait for the online form
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Seek prompt in-person care for fever, chills, vomiting, one-sided back or flank pain, severe pelvic or abdominal pain, pregnancy or possible pregnancy, visible blood, inability to pass urine, confusion, dehydration, catheter symptoms, sexual assault, or feeling very unwell. Call 000 for emergencies.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/50 bg-white p-6 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
              <Heading level="h3">What the safety screen asks</Heading>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SAFETY_CHECKS.map((item) => (
                  <div key={item} className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground dark:bg-white/[0.05]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <ArticleVisuals visuals={visuals} />
            <VisualTextIndex visuals={visuals} />
          </SectionShell>

          <SectionShell
            id="eligibility-and-scope"
            pill="Eligibility and scope"
            title="A narrow pathway for possible uncomplicated UTI symptoms"
            intro="Online review cannot replace urine testing, sexual health testing, pregnancy care, physical examination, or urgent care."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Checklist title="Usually a reasonable starting point" items={SUITABLE_ITEMS} />
              <Checklist title="Use another care route" items={OUTSIDE_SCOPE_ITEMS} caution />
            </div>
          </SectionShell>

          <SectionShell
            id="review-cost-and-outcomes"
            pill="Process, cost, and outcome"
            title="One form, one doctor review, one clear outcome"
            intro="The review fee is shown before payment. Medicine choice and prescription approval remain clinical decisions."
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
            intro="Choose the route that matches what you need today, and choose urgent or in-person care when the pattern is not simple."
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
            title="UTI assessment FAQ"
            subtitle="The essential safety, cost, and pathway questions before you start."
            items={UTI_LANDING_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <section className="bg-background py-14 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
                <SectionPill>Start safely</SectionPill>
                <Heading level="h2" className="mt-4">
                  Start a UTI symptom assessment
                </Heading>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  The link opens the shared women's-health form. Choose UTI symptoms on the next screen, then complete the secure safety questions for doctor review.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : `Start · choose UTI next · ${PRICING_DISPLAY.WOMENS_HEALTH}`}
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
