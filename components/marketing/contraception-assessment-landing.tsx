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

import { Hero } from "@/components/marketing/hero"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { CONTRACEPTION_LANDING_FAQ } from "@/lib/data/womens-health-faq"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { FORM_FIRST_WEDGE, GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

const ASSESSMENT_HREF = "/request?service=consult&subtype=womens_health&intent=ocp_new"
const WOMENS_HEALTH_HREF = "/womens-health"

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "womens-health",
  analyticsId: "contraceptive-pill-assessment",
  sticky: {
    ctaText: `Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: ASSESSMENT_HREF,
    mobileSummary: "Contraception health review",
    responseTime: "Doctor review 24/7",
  },
}

const HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · 18+",
    body: getApprovedClaim("prescribing_identity_required"),
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.WOMENS_HEALTH,
    body: "One-off doctor review. Pharmacy costs are separate if a prescription is approved.",
  },
  {
    icon: HeartPulse,
    label: "Safety checks",
    value: "Before payment",
    body: "Possible pregnancy and specified health risks stop this assessment before checkout.",
  },
] as const

const SAFETY_CHECKS = [
  {
    title: "Pregnant or possibly pregnant",
    body: "A yes or not-sure answer stops the assessment so pregnancy can be ruled out or assessed through appropriate care.",
  },
  {
    title: "Migraine with aura",
    body: "A reported history stops this assessment and directs you to a GP or sexual health clinic.",
  },
  {
    title: "Blood clot history",
    body: "A personal or close-family clot history stops this assessment because it changes contraceptive safety.",
  },
  {
    title: "Smoking",
    body: "A yes answer stops this assessment. A GP or sexual health clinic can assess your needs in person.",
  },
] as const

const ELIGIBILITY_ITEMS = [
  "You are in Australia and aged 18 or over.",
  getApprovedClaim("prescribing_identity_required"),
  "You want a focused contraception health assessment. The form checks whether your request fits this online service before payment.",
  "Your pre-checkout answers allow this online assessment to continue.",
  "You can provide current contraception, blood-pressure context, medical history, and medicine details clearly.",
] as const

const OUTSIDE_SCOPE_ITEMS = [
  "Emergency contraception, procedures, device fitting or removal, cervical screening, or STI testing.",
  "Pregnancy or possible pregnancy, migraine with aura, blood clot history, or an unsafe smoking context: the form stops before checkout.",
  "Severe pelvic pain, heavy unexplained bleeding, sexual assault, chest pain, sudden shortness of breath, collapse, or other urgent symptoms.",
] as const

const REVIEW_COST_OUTCOMES = [
  {
    icon: ShieldCheck,
    title: "1 · Complete the safety questions",
    body: "Confirm your contraception needs in the form, then answer the health questions. Answers that rule out this assessment direct you to in-person care before payment.",
  },
  {
    icon: Stethoscope,
    title: "2 · Doctor review",
    body: "If the initial safety checks allow you to continue, an AHPRA-registered doctor reviews your request. They may need more information, such as a current blood pressure reading, before deciding whether to prescribe.",
  },
  {
    icon: WalletCards,
    title: `3 · ${PRICING_DISPLAY.WOMENS_HEALTH}, outcome, or refund`,
    body: `${getApprovedClaim("prescribing_identity_required")} Pharmacy costs are separate. If clinically appropriate, the outcome is sent digitally. Prescription is not guaranteed. ${GUARANTEE}`,
  },
] as const

const ALTERNATIVES = [
  {
    title: "Review your current contraception",
    href: ASSESSMENT_HREF,
    body: "Use this same safety assessment for continuing care. Have your current health and treatment details ready.",
  },
  {
    title: "Women's health hub",
    href: WOMENS_HEALTH_HREF,
    body: "Compare contraception and UTI symptom assessments.",
  },
  {
    title: "High blood pressure guide",
    href: "/conditions/hypertension",
    body: "Understand why blood pressure can change contraceptive suitability.",
  },
] as const

const SOURCES = [
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

export function ContraceptionAssessmentLanding() {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <div className="bg-background text-foreground">
          <Hero
            title="Contraception assessment online"
            availabilityServiceId="womens-health"
            showReviews={false}
            primaryCta={{ text: isDisabled ? "Contact us" : "Start assessment", href: isDisabled ? "/contact" : ASSESSMENT_HREF, ref: heroCTARef, onClick: handleHeroCTA }}
            secondaryCta={{ text: "Check if this is suitable", href: "#eligibility-and-scope" }}
            reassuranceRow={<p className="text-sm leading-6 text-muted-foreground">Safety checks come before payment. {GUARANTEE} Prescription is not guaranteed.</p>}
            mockup={
              <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card">
                <Heading level="h2">Before you start</Heading>
                <dl className="mt-4 divide-y divide-border/50">
                  {HERO_FACTS.map((fact) => (
                    <div key={fact.label} className="py-4">
                      <dt className="flex items-center gap-2 text-sm text-muted-foreground"><fact.icon className="h-4 w-4 text-primary" aria-hidden="true" />{fact.label}</dt>
                      <dd className="mt-1 font-semibold">{fact.value}</dd>
                      <dd className="mt-1 text-sm leading-6 text-muted-foreground">{fact.body}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            }
          >
            <p data-speakable className="mb-4 text-base leading-7 text-muted-foreground sm:text-lg">
              A focused review of your contraception needs and health history by an Australian doctor. For women aged 18+ in Australia. One-off review fee: {PRICING_DISPLAY.WOMENS_HEALTH}.
            </p>
            <p className="mb-6 text-base leading-7 text-muted-foreground">{FORM_FIRST_WEDGE}</p>
          </Hero>

          <SectionShell
            id="safety"
            pill="Safety first"
            title="Four answers can stop this assessment before checkout"
            intro="If you report possible pregnancy, migraine with aura, blood clot history, or smoking, the form directs you to a GP or sexual health clinic before payment."
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

          </SectionShell>

          <SectionShell
            id="eligibility-and-scope"
            pill="Eligibility and scope"
            title="Check whether this online assessment fits your needs"
            intro="This is a limited online assessment, not a full contraception or sexual health service. We do not provide procedures or device fitting. The form checks your needs before payment; a doctor may recommend an in-person service."
            muted
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Checklist title="Usually a reasonable starting point" items={ELIGIBILITY_ITEMS} />
              <Checklist title="Use another assessment or in-person care" items={OUTSIDE_SCOPE_ITEMS} caution />
            </div>
          </SectionShell>

          <SectionShell
            id="review-cost-and-outcomes"
            pill="Process, cost, and outcome"
            title="Safety questions first, then doctor review"
            intro="The doctor decides whether a prescription is appropriate for you. You can share your current contraception and relevant history in the form."
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
            title="If this is not the right assessment"
            intro="Choose the route that matches whether you need a contraception assessment, UTI assessment, or in-person care."
            muted
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {ALTERNATIVES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href === ASSESSMENT_HREF && isDisabled ? "/contact" : item.href}
                  className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/15 dark:bg-card dark:shadow-none"
                >
                  <Heading level="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    {item.href === ASSESSMENT_HREF ? (isDisabled ? "Contact us" : "Start assessment") : "Read more"}
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
            intro="Patient information and standards for online doctor consultations."
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
            title="Contraception assessment FAQ"
            subtitle="The essential safety, cost, and assessment questions before you start."
            items={CONTRACEPTION_LANDING_FAQ}
            onFAQOpen={handleFAQOpen}
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <CTABanner
            title="Request a contraception assessment"
            subtitle="Complete the secure health questions. Safety checks happen before payment. A doctor reviews suitable requests and decides what care is appropriate."
            ctaText={`Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}`}
            ctaHref={ASSESSMENT_HREF}
            isDisabled={isDisabled}
            onCtaClick={handleFinalCTA}
            secondaryText="Compare women's health assessments"
            secondaryHref={WOMENS_HEALTH_HREF}
          />
        </div>
      )}
    </LandingPageShell>
  )
}
