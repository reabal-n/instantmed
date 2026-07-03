"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
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
import { PILL_FAQ } from "@/lib/data/womens-health-faq"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health"
const WOMENS_HEALTH_HREF = "/womens-health"
const REPEAT_PRESCRIPTION_HREF = "/prescriptions"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "womens-health",
  analyticsId: "contraceptive-pill-assessment",
  sticky: {
    ctaText: `Request pill assessment - ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "Start or switch pill - Doctor-reviewed",
    responseTime: "Doctor review 24/7",
  },
}

const HERO_FACTS = [
  {
    icon: WalletCards,
    label: "Cost",
    value: PRICING_DISPLAY.WOMENS_HEALTH,
    body: "One-off doctor review. Pharmacy cost is separate if a prescription is approved.",
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Form first",
    body: "The form takes about 3 minutes. Review timing depends on clinical detail and queue volume.",
  },
  {
    icon: ShieldCheck,
    label: "Boundary",
    value: "No guarantee",
    body: "The doctor reviews your answers and decides whether online care is appropriate.",
  },
] as const

const HOW_IT_WORKS = [
  {
    title: "Choose women's health",
    body: "Start the secure request and select start or switch pill inside the women's health form.",
  },
  {
    title: "Complete the safety screen",
    body: "Answer questions about pregnancy possibility, migraine with aura, clot history, smoking, blood pressure context, and current contraception.",
  },
  {
    title: "Doctor review",
    body: "An AHPRA-registered doctor reviews the request and may call or message if a safety detail needs clarification.",
  },
  {
    title: "Outcome sent digitally",
    body: "If approved, the outcome is sent digitally. If declined, the doctor explains next steps and the request is refunded.",
  },
] as const

const ELIGIBILITY_ITEMS = [
  "You are in Australia and aged 18 or over.",
  "You want to start an oral contraceptive pill or switch from another method.",
  "You can answer the safety questions clearly.",
  "You understand the doctor may recommend a different method, a call, or in-person care.",
] as const

const NOT_COVERED_ITEMS = [
  "Continuing the same pill at the same dose. Use repeat prescriptions instead.",
  "Emergency contraception or morning-after pill requests.",
  "Implant, IUD, injection, ring fitting, cervical screening, or STI testing.",
  "Pelvic pain, heavy unexplained bleeding, possible pregnancy, sexual assault, or urgent symptoms.",
] as const

const SAFETY_CHECKS = [
  "migraine with aura or new neurological symptoms",
  "blood clot, stroke, heart disease, or strong clotting history",
  "high blood pressure or blood pressure that has not been checked when it matters",
  "smoking status, especially from age 35",
  "pregnancy, recent birth, breastfeeding, or possible pregnancy",
  "current medicines, allergies, liver disease, diabetes, or other relevant conditions",
] as const

const ALTERNATIVES = [
  {
    title: "Repeat prescription",
    href: REPEAT_PRESCRIPTION_HREF,
    body: "For an unchanged pill you already take.",
  },
  {
    title: "Women's health hub",
    href: WOMENS_HEALTH_HREF,
    body: "For UTI and pill assessment options.",
  },
  {
    title: "Migraine background",
    href: "/conditions/migraine",
    body: "Migraine history can affect contraceptive suitability.",
  },
  {
    title: "High blood pressure",
    href: "/conditions/hypertension",
    body: "Blood pressure can change the safest contraception choice.",
  },
] as const

const SOURCES = [
  {
    title: "Healthdirect: combined oral contraceptive pill",
    href: "https://www.healthdirect.gov.au/the-pill-combined-oral-contraceptive-pill",
    body: "Patient information on what the combined pill is, how it is taken, and why a prescription and doctor advice matter.",
  },
  {
    title: "Healthdirect: progestogen-only pill",
    href: "https://www.healthdirect.gov.au/mini-pill-progestogen-only-pill",
    body: "Patient information on the mini-pill and alternatives to progestogen-only contraception.",
  },
  {
    title: "Healthdirect: contraception options",
    href: "https://www.healthdirect.gov.au/contraception-options",
    body: "Plain-English overview of contraceptive options available in Australia.",
  },
  {
    title: "Medical Board of Australia: telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
    body: "Guidance on the standard expected of doctors when care is delivered by telehealth.",
  },
  {
    title: "Australian Digital Health Agency: electronic prescriptions",
    href: "https://www.digitalhealth.gov.au/initiatives-and-programs/electronic-prescriptions",
    body: "Explains electronic prescription tokens sent by SMS or email and used at Australian pharmacies.",
  },
  {
    title: "PBS: Browse by body system",
    href: "https://www.pbs.gov.au/browse/body-system",
    body: "PBS schedule navigation for medicine groups, including hormonal contraceptives for systemic use.",
  },
  {
    title: "TGA: advertising health services involving therapeutic goods",
    href: "https://www.tga.gov.au/resources/guidance/advertising-health-services-involve-therapeutic-goods",
    body: "Advertising guidance relevant to public health-service pages involving medicines.",
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
        "rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none",
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
    <section id={id} className={cn("py-14 sm:py-16 lg:py-20", muted && "bg-muted/30 dark:bg-white/[0.02]")}>
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
    <div className="mt-8 grid gap-4 lg:grid-cols-3">
      {visuals.map((visual) => (
        <div
          key={visual.id}
          className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{visual.eyebrow}</p>
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
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {visual.kind === "warning" ? "Educational guide. Urgent symptoms need urgent care." : "Educational guide."}
          </p>
        </div>
      ))}
    </div>
  )
}

export function ContraceptivePillAssessmentLanding({ visuals }: { visuals: RenderableArticleVisual[] }) {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <section className="relative overflow-hidden bg-background pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_20%,rgba(186,212,245,0.32),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,198,160,0.24),transparent_30%)]"
            />
            <div className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
              <Reveal instant className="max-w-2xl">
                <SectionPill>Women's health</SectionPill>
                <Heading level="display" className="mt-5">
                  Contraceptive pill assessment online
                </Heading>
                <p data-speakable className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Start or switch the contraceptive pill with a secure Australian doctor review. The doctor checks safety first, then decides what is clinically appropriate.
                </p>

                <div ref={heroCTARef} className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
                    disabled={isDisabled}
                    onClick={handleHeroCTA}
                  >
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : "Request pill assessment"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 w-full sm:w-auto">
                    <Link href="#safety">Check safety boundaries</Link>
                  </Button>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  {GUARANTEE} Prescription is not guaranteed. The doctor may call or message you before deciding.
                </p>
              </Reveal>

              <Reveal instant>
                <div className="rounded-3xl border border-border/50 bg-white p-4 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <div className="rounded-2xl bg-muted/40 p-5 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Practical answer</p>
                    <Heading level="h2" as="h2" className="mt-3">
                      What you need to know before you start
                    </Heading>
                    <div className="mt-5 grid gap-3">
                      {HERO_FACTS.map((fact) => (
                        <div key={fact.label} className="rounded-2xl border border-border/50 bg-white p-4 dark:border-white/15 dark:bg-card">
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <fact.icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{fact.label}</p>
                              <p className="mt-1 text-base font-semibold text-foreground">{fact.value}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.body}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <SectionShell
            id="how-it-works"
            pill="How it works"
            title="A structured assessment, not a pill menu"
            intro="The point of the form is to give the doctor enough information to make a safe contraception decision, including when online care is not enough."
          >
            <div className="grid gap-4 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.05}>
                  <div className="h-full rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <Heading level="h3" className="mt-4 text-base">
                      {step.title}
                    </Heading>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-7 text-center">
              <Button asChild size="lg" disabled={isDisabled} onClick={handleHowItWorksCTA}>
                <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                  {isDisabled ? "Contact us" : "Start the secure form"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </SectionShell>

          <SectionShell
            id="eligibility"
            pill="Eligibility"
            title="Who this online assessment is designed for"
            intro="This pathway is narrow by design. It is for starting or switching the oral contraceptive pill after doctor review, not for every contraception or sexual health need."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-emerald-800 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <Heading level="h3">Usually a reasonable starting point</Heading>
                </div>
                <ul className="mt-5 space-y-3">
                  {ELIGIBILITY_ITEMS.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-amber-800 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                  <Heading level="h3">Use another pathway or in-person care</Heading>
                </div>
                <ul className="mt-5 space-y-3">
                  {NOT_COVERED_ITEMS.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="safety"
            pill="Safety"
            title="The checks that matter before a pill is prescribed"
            intro="Oral contraception is common, but it is still prescription medicine. The doctor needs to consider whether oestrogen is suitable, whether another option is safer, and whether remote care gives enough clinical signal."
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <InfoCard
                icon={HeartPulse}
                title="The form asks about risk factors"
                body="It covers the safety points that commonly change pill choice or require a call: migraine with aura, clot history, smoking, blood pressure, pregnancy possibility, medicines, and relevant medical conditions."
              />
              <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                <Heading level="h3">Safety topics the doctor reviews</Heading>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SAFETY_CHECKS.map((item) => (
                    <div key={item} className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground dark:bg-white/[0.05]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <Heading level="h3" className="text-base">
                    See someone in person or seek urgent care
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Do not use this page for chest pain, sudden shortness of breath, one-sided weakness, collapse, severe headache with vision or speech symptoms, calf swelling with pain, heavy unexplained bleeding, severe pelvic pain, sexual assault, or possible pregnancy with pain or bleeding. Call 000 for emergencies.
                  </p>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="covered"
            pill="Scope"
            title="What is covered, and what stays outside this pathway"
            intro="A useful online page is clear about limits. This assessment can support a doctor review for starting or switching the pill. It does not replace a full sexual health clinic, cervical screening, or a physical examination."
            muted
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={Stethoscope}
                title="Covered"
                body="Starting the oral contraceptive pill or switching from another contraception method, where the safety screen gives the doctor enough information to decide."
              />
              <InfoCard
                icon={ShieldCheck}
                title="May need contact"
                body="Unclear history, possible pregnancy, high-risk symptoms, blood pressure uncertainty, or conflicting answers can lead to a call, message, or in-person recommendation."
              />
              <InfoCard
                icon={AlertTriangle}
                title="Not covered"
                body="Emergency contraception, procedures, STI testing, severe symptoms, and continuing the exact same established pill at the same dose."
              />
            </div>
          </SectionShell>

          <SectionShell
            id="costs"
            pill="Costs"
            title="Doctor review, Medicare, PBS, and pharmacy costs"
            intro={`The InstantMed review fee is ${PRICING_DISPLAY.WOMENS_HEALTH}. Medicare is required for prescription and consultation requests. If the doctor approves a prescription, pharmacy pricing is separate and may depend on whether the item is PBS-listed, private, or subject to a brand premium.`}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard
                icon={WalletCards}
                title="Review fee"
                body={`${PRICING_DISPLAY.WOMENS_HEALTH} for the online doctor review. ${GUARANTEE}`}
              />
              <InfoCard
                icon={ShieldCheck}
                title="Medicare details"
                body="Prescription and consultation requests require Medicare or suitable identity details for safe electronic prescribing and clinical records."
              />
              <InfoCard
                icon={Clock3}
                title="Pharmacy cost"
                body="If approved, the pharmacy charges separately. PBS status and brand choice can affect what you pay at the counter."
              />
            </div>
          </SectionShell>

          <SectionShell
            id="visual-guide"
            pill="Visual guide"
            title="Three practical ways to think about pill suitability"
            intro="The figures below are educational. They do not replace doctor review, but they make the assessment logic easier to scan."
            muted
          >
            <ArticleVisuals visuals={visuals} />
            <VisualTextIndex visuals={visuals} />
          </SectionShell>

          <SectionShell
            id="alternatives"
            pill="Alternatives"
            title="If this is not the right pathway"
            intro="The safest option depends on what you need today, what you already use, and whether any symptoms need examination or testing."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ALTERNATIVES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <Heading level="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Read more
                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="expect"
            pill="What to expect"
            title="After you submit"
            intro="The doctor reviews the details you provide. There are three honest outcomes: approval if clinically appropriate, contact for more information, or decline with redirection and refund."
            muted
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={CheckCircle2}
                title="Approved"
                body="A digital outcome is sent if the doctor decides online care is suitable and a prescription is clinically appropriate."
              />
              <InfoCard
                icon={Clock3}
                title="Needs more information"
                body="The doctor may call or message if they need a blood pressure reading, pregnancy context, medication details, or safety clarification."
              />
              <InfoCard
                icon={AlertTriangle}
                title="Declined"
                body="If online prescribing is not safe or suitable, the doctor explains the next step and the request is refunded."
              />
            </div>
          </SectionShell>

          <SectionShell
            id="sources"
            pill="Sources"
            title="Sources and references"
            intro="This page was reviewed against Australian patient information, telehealth guidance, PBS schedule navigation, and advertising rules. Last reviewed: 2026-06."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
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
            subtitle="Static answers for the common clinical, cost, and pathway questions before you start."
            items={PILL_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <section className="py-14 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl border border-border/50 bg-white p-7 text-center shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-9">
                <SectionPill>Start safely</SectionPill>
                <Heading level="h2" className="mt-4">
                  Request a contraceptive pill assessment
                </Heading>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Complete the secure form. An AHPRA-registered doctor reviews your answers and decides whether online care is appropriate.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto" disabled={isDisabled} onClick={handleFinalCTA}>
                    <Link href={isDisabled ? "/contact" : ASSESSMENT_HREF}>
                      {isDisabled ? "Contact us" : `Request assessment - ${PRICING_DISPLAY.WOMENS_HEALTH}`}
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
