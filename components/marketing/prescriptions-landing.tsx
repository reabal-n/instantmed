"use client"

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Stethoscope,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { Hero } from "@/components/marketing/hero"
import { EScriptHeroMockup } from "@/components/marketing/mockups/escript-hero-mockup"
import {
  type LandingPageConfig,
  LandingPageShell,
} from "@/components/marketing/shared/landing-page-shell"
import { Heading } from "@/components/ui/heading"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { PRESCRIPTION_LANDING_FAQ } from "@/lib/data/prescription-faq"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { FORM_FIRST_WEDGE } from "@/lib/marketing/voice"

const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/regulatory-partners").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((m) => ({ default: m.FAQSection })),
  { loading: () => <div className="min-h-[400px]" /> },
)
const CTABanner = dynamic(
  () => import("@/components/sections/cta-banner").then((m) => ({ default: m.CTABanner })),
  { loading: () => <div className="min-h-[300px]" /> },
)

const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")

const PRESCRIPTION_LIFECYCLE_STEPS = [
  {
    icon: ClipboardList,
    title: "Medication details",
    description: "Tell us about the regular medication you already take.",
  },
  {
    icon: ShieldCheck,
    title: "Identity and safety review",
    description: "Confirm your Medicare details, current dose, directions, and safety answers.",
  },
  {
    icon: Stethoscope,
    title: "Doctor decision",
    description: "A doctor reviews the request before deciding whether a prescription is appropriate.",
    callout: "Brief call if needed",
  },
  {
    icon: Smartphone,
    title: "Token to your phone",
    description: "If approved, the eScript token is sent to you by SMS.",
  },
  {
    icon: Building2,
    title: "Your pharmacy",
    description: "Show the token at an Australian pharmacy. Medicine costs are paid there.",
  },
] as const

const SUITABLE_REQUESTS = [
  "Previously prescribed",
  "Stable medication and dose",
  "One regular medicine per request",
  "Current safety and medical details available",
] as const

const OUT_OF_SCOPE_REQUESTS = [
  "A medicine you have not taken before",
  "Controlled or dependence-forming medicines",
  "Care that needs examination, pathology, or close monitoring",
  "Urgent symptoms or a medical emergency",
] as const

const PRESCRIPTION_RESOURCES = [
  {
    href: "/resources/secure-online-prescription-requests",
    label: "How secure requests work",
  },
  {
    href: "/resources/repeat-prescription-safety-checklist",
    label: "Repeat prescription safety checklist",
  },
  {
    href: "/online-prescriptions",
    label: "Online prescriptions in Australia",
  },
] as const

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "scripts",
  analyticsId: "prescription",
  sticky: {
    ctaText: `Renew your medication - ${PRICING_DISPLAY.REPEAT_SCRIPT}`,
    ctaHref: "/request?service=repeat-script",
    mobileSummary: "Repeat medication request",
    responseTime: "Doctor-reviewed after submission",
  },
}

function RepeatEligibilitySection() {
  return (
    <section aria-labelledby="repeat-eligibility-title" className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <SectionPill>Check the fit</SectionPill>
          <Heading id="repeat-eligibility-title" level="h2" className="mt-4 text-balance">
            For one regular medicine you already take.
          </Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            This pathway is deliberately narrow. The doctor checks that a repeat remains safe and appropriate before making a prescribing decision.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none md:grid md:grid-cols-2 md:divide-x md:divide-border/50 dark:md:divide-white/10">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              <Heading level="h3" className="text-lg">This pathway may fit when</Heading>
            </div>
            <ul className="mt-5 space-y-3">
              {SUITABLE_REQUESTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border/50 p-6 dark:border-white/10 sm:p-8 md:border-t-0">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
              <Heading level="h3" className="text-lg">Use another care pathway when</Heading>
            </div>
            <ul className="mt-5 space-y-3">
              {OUT_OF_SCOPE_REQUESTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              For new medicines or complex care, see your regular GP. For urgent symptoms, seek urgent or emergency care.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PrescriptionLifecycleGraphic() {
  return (
    <section
      aria-labelledby="prescription-lifecycle-title"
      className="bg-muted/30 py-12 dark:bg-white/[0.02] sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-end">
          <div>
            <SectionPill>The eScript lifecycle</SectionPill>
            <Heading id="prescription-lifecycle-title" level="h2" className="mt-4 text-balance">
              From medication details to pharmacy pickup.
            </Heading>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            One repeat request follows a clear clinical path. The doctor may pause for a brief call before deciding, and an eScript is sent only if approved.
          </p>
        </div>

        <ol
          data-prescription-lifecycle="escript"
          className="mt-8 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:divide-white/10 dark:border-white/15 dark:bg-card dark:shadow-none lg:grid lg:grid-cols-5 lg:divide-x lg:divide-y-0"
        >
          {PRESCRIPTION_LIFECYCLE_STEPS.map((step, index) => (
            <li key={step.title} className="min-w-0 p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-primary" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <Heading level="h3" className="mt-5">
                {step.title}
              </Heading>
              <p className="mt-2 text-base leading-6 text-muted-foreground">
                {step.description}
              </p>
              {"callout" in step && (
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary-strong">
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                  {step.callout}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function PrescriptionFeePanel() {
  const feeFacts = [
    {
      term: "Doctor review fee",
      detail: `${PRICING_DISPLAY.REPEAT_SCRIPT} once per request. No subscription.`,
    },
    {
      term: "At the pharmacy",
      detail: "Medicine cost is separate and is paid directly to the pharmacy.",
    },
    {
      term: "PBS and private pricing",
      detail: "PBS eligibility, brand premiums, and the final medicine price are confirmed by your pharmacy.",
    },
    {
      term: "If the doctor declines",
      detail: REFUND_PAYMENT_PROCESS,
    },
  ] as const

  return (
    <section aria-labelledby="prescription-fee-title" className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
          <div>
            <SectionPill>Fee and pharmacy costs</SectionPill>
            <Heading id="prescription-fee-title" level="h2" className="mt-4 text-balance">
              One review fee. Medicine paid separately.
            </Heading>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The request fee covers the online doctor review and, if approved, secure eScript delivery.
            </p>
          </div>

          <dl className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:divide-white/10 dark:border-white/15 dark:bg-card dark:shadow-none">
            {feeFacts.map((fact) => (
              <div key={fact.term} className="grid gap-1 p-5 sm:grid-cols-[10rem_1fr] sm:gap-6 sm:p-6">
                <dt className="text-sm font-semibold text-foreground">{fact.term}</dt>
                <dd className="text-sm leading-6 text-muted-foreground">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

function PrescriptionResourceNav() {
  return (
    <nav aria-label="Repeat prescription resources" className="border-t border-border/50 py-8 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Learn more
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {PRESCRIPTION_RESOURCES.map((resource) => (
            <li key={resource.href}>
              <Link
                href={resource.href}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {resource.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export function PrescriptionsLanding() {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, handleHeroCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          <Hero
            title="Repeat prescription, reviewed from home."
            primaryCta={{
              text: isDisabled
                ? "Contact us"
                : `Renew medication - ${PRICING_DISPLAY.REPEAT_SCRIPT}`,
              href: isDisabled ? "/contact" : "/request?service=repeat-script",
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={null}
            beforeCta={(
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-foreground/75 lg:justify-start sm:text-sm">
                <li>Australia only</li>
                <li>Ages 18+</li>
                <li>Medicare details required</li>
              </ul>
            )}
            reassuranceRow={(
              <p className="text-center text-xs leading-5 text-muted-foreground lg:text-left">
                Takes about 3 minutes. Every request is reviewed before a prescribing decision.
              </p>
            )}
            mockup={<EScriptHeroMockup />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-sm leading-6 text-muted-foreground sm:mb-7 sm:text-base sm:leading-7 lg:mx-0 lg:text-lg">
              {FORM_FIRST_WEDGE} This pathway is for one regular medication you have taken before. If approved, your eScript token is sent by SMS for an Australian pharmacy.
            </p>
          </Hero>

          <RepeatEligibilitySection />
          <PrescriptionLifecycleGraphic />
          <PrescriptionFeePanel />

          <FAQSection
            pill="FAQ"
            title="Before you start"
            subtitle="Short answers about approval, eScripts, and repeats."
            items={PRESCRIPTION_LANDING_FAQ}
            initialCount={PRESCRIPTION_LANDING_FAQ.length}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          <CTABanner
            title="Ready to request your repeat?"
            subtitle="Share your current medication and safety details for doctor review. An eScript is sent only if approved."
            ctaText="Renew your medication"
            ctaHref="/request?service=repeat-script"
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.REPEAT_SCRIPT}
            microcopy="Takes about 3 minutes."
          />

          <PrescriptionResourceNav />
        </>
      )}
    </LandingPageShell>
  )
}
