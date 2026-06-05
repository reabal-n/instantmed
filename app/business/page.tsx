import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Receipt,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { FaqCtaSection } from "@/components/marketing/sections/faq-cta-section"
import { WaitCounter } from "@/components/marketing/wait-counter"
import {
  BreadcrumbSchema,
  FAQSchema,
  MedicalServiceSchema,
} from "@/components/seo/healthcare-schema"
import { Button } from "@/components/ui/button"
import { getWaitState } from "@/lib/brand/wait-counter"
import { PRICING_DISPLAY } from "@/lib/constants"

import { BusinessLeadForm } from "./business-lead-form"

/**
 * `/business` · B2B corporate medical certificate offering.
 *
 * The wedge: HR / People Ops teams want a fast, AHPRA-registered way for
 * their team to get a sick certificate without sending people to a clinic
 * or asking them to pay out of pocket. We give them a co-branded URL,
 * monthly invoicing, and the same form-first flow the consumer product
 * already runs.
 *
 * Built 2026-05-25. No billing integration yet · sales-led for the first
 * cohort. The page collects a lead, support replies within one business
 * day with a contract + the co-branded URL.
 */

const valueProps = [
  {
    icon: FileText,
    title: "Sick certificates, in writing",
    body: "Every employee gets a PDF cert with a verifiable reference number. Same flow as our consumer product, same AHPRA-registered doctors.",
  },
  {
    icon: Building2,
    title: "Co-branded URL",
    body: "Your subdomain or a dedicated URL we host for you. Employees see your logo on landing; HR sees the cert under your account.",
  },
  {
    icon: Receipt,
    title: "Monthly invoicing",
    body: "One invoice per month, billed to your account. No per-employee credit-card juggling. Net 14 / Net 30 available.",
  },
  {
    icon: Users,
    title: "Usage reporting",
    body: "Monthly CSV: count of certs issued, average review window, top reasons. No personally identifiable health data · just the numbers HR needs for forecasting.",
  },
] as const

const howItWorks = [
  {
    step: 1,
    title: "We send you the URL",
    body: "After a short call, we provision your co-branded URL and email you the comms kit to share with your team.",
  },
  {
    step: 2,
    title: "Employee fills the form",
    body: "Same 4-question intake. They never see another employee's request. Their health info stays in their account.",
  },
  {
    step: 3,
    title: "Cert in their inbox, you on the invoice",
    body: "Doctor reviews in writing during AEST hours. PDF arrives in the employee's email. Your monthly statement shows the count.",
  },
] as const

interface PricingTier {
  name: string
  headcount: string
  monthly: string
  perCert: string
  note: string
  cta: string
  highlight?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    headcount: "1-25 employees",
    monthly: "No monthly fee",
    perCert: `${PRICING_DISPLAY.MED_CERT} per cert`,
    note: "Pay as you go. Best for teams testing the offering before scaling.",
    cta: "Talk to us",
  },
  {
    name: "Growth",
    headcount: "26-100 employees",
    monthly: "Flat monthly retainer",
    perCert: "Discounted per-cert rate",
    note: "Predictable cost, priority support inbox, monthly reporting.",
    cta: "Get a quote",
    highlight: true,
  },
  {
    name: "Enterprise",
    headcount: "100+ employees",
    monthly: "Custom contract",
    perCert: "Volume pricing",
    note: "SOC-grade security questionnaire, custom SSO discussion, dedicated point of contact.",
    cta: "Contact sales",
  },
]

const businessFaqs = [
  {
    question: "What kinds of certificates can our employees get?",
    answer:
      "Sick leave certificates (1, 2, or 3 days) and carer leave certificates. We don't issue fitness-for-duty, exam deferral, court, or workers' compensation certificates · those need an in-person doctor.",
  },
  {
    question: "Is this compliant with Fair Work?",
    answer:
      "Yes. Australian medical certificates from an AHPRA-registered doctor are accepted as evidence of unfitness for work under the National Employment Standards. The certificate is identical to one issued in a clinic.",
  },
  {
    question: "Can HR see what was wrong with the employee?",
    answer:
      "No. HR sees that a certificate was issued, the dates it covers, and the cost. Clinical details stay between the doctor and the employee.",
  },
  {
    question: "What happens if a request is declined?",
    answer:
      "Full refund to the employee. Declined requests don't appear on your invoice. We'd rather route someone to their GP than charge for something outside online care scope.",
  },
  {
    question: "How long do reviews take?",
    answer:
      "Doctor review happens during AEST hours, 7 days. We don't publish a fixed SLA · most reviews land same-day during business hours and overnight requests are picked up at the start of the next AEST review window.",
  },
  {
    question: "Do you store our employees' health data?",
    answer:
      "Encrypted at rest, accessed only by the reviewing doctor and our compliance team. Full APP-compliant privacy policy applies. Employees own their records and can request export or deletion at any time.",
  },
  {
    question: "Can we trial it before signing?",
    answer:
      "Yes. We'll provision your co-branded URL with no monthly commitment. Pay per cert for the first month, then decide whether to move to a retainer.",
  },
  {
    question: "Do you offer prescription or specialist services for staff?",
    answer:
      "Repeat prescriptions, ED, and hair-loss assessments are all available through our consumer product · we can add those to your account on request. New-condition prescribing and complex cases still need a GP.",
  },
]

export const metadata: Metadata = {
  title: "Medical Certificates for Your Team | InstantMed for Business",
  description:
    "Sick certificates for your employees. Co-branded URL, monthly invoicing, AHPRA-registered Australian doctors, form-first review. Talk to us about a contract.",
  openGraph: {
    title: "InstantMed for Business · Sick certificates for your team",
    description:
      "Co-branded URL, monthly invoicing, form-first review by AHPRA-registered doctors. Built for HR and People Ops.",
    type: "website",
    url: "https://instantmed.com.au/business",
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed for Business · Sick certificates for your team",
    description:
      "Co-branded URL, monthly invoicing, form-first review by AHPRA-registered Australian doctors.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/business",
  },
}

export default async function BusinessLandingPage() {
  const liveWait = await getWaitState()

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "For Business", url: "https://instantmed.com.au/business" },
        ]}
      />
      <MedicalServiceSchema
        name="InstantMed for Business · Medical Certificates"
        description="Sick and carer leave certificates for Australian employees. Co-branded URL, monthly invoicing, AHPRA-registered doctors."
        price={String(19.95)}
      />
      <FAQSchema faqs={businessFaqs} />

      {/* Hero */}
      <section className="border-b border-border/40 bg-background pt-8 pb-8 sm:pt-16 sm:pb-12 lg:pt-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:mb-4">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            For Business
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Sick certificates for your team, in writing, in hours
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Co-branded URL, monthly invoicing, and form-first review by Australian doctors. Built
            for HR teams that don't want to chase clinics or reimburse out-of-pocket bills.
          </p>
          <div className="mt-4 flex items-center justify-center">
            <WaitCounter state={liveWait} variant="inline" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="#contact">
                Talk to us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <ul className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              AHPRA-registered doctors
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Reviewed during AEST hours
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              No-cost decline
            </li>
          </ul>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              What your team gets
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              The same product our consumers use, packaged for HR.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {valueProps.map((prop) => (
              <article
                key={prop.title}
                className="flex items-start gap-4 rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:bg-card"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <prop.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{prop.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{prop.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border/40 bg-muted/20 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              From contract to first cert in under a week.
            </p>
          </div>
          <ol className="space-y-4">
            {howItWorks.map((step) => (
              <li
                key={step.step}
                className="flex items-start gap-4 rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:bg-card sm:p-6"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary"
                  aria-hidden="true"
                >
                  {step.step}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing tiers */}
      <section id="pricing" className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Pricing
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Pay per cert when you're small. Move to a retainer when it's worth it.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`flex flex-col rounded-2xl border bg-white p-6 shadow-md shadow-primary/[0.06] dark:bg-card ${
                  tier.highlight ? "border-primary/40 ring-1 ring-primary/30" : "border-border/50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                  {tier.highlight ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Most teams
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{tier.headcount}</p>
                <div className="mt-4 space-y-1">
                  <p className="text-sm font-medium text-foreground">{tier.monthly}</p>
                  <p className="text-sm text-muted-foreground">{tier.perCert}</p>
                </div>
                <p className="mt-4 flex-1 text-sm text-muted-foreground">{tier.note}</p>
                <Button asChild className="mt-6 w-full" variant={tier.highlight ? "default" : "outline"}>
                  <Link href="#contact">
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="border-t border-border/40 bg-muted/20 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Talk to us
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              One of the founders reads every B2B inquiry. Reply within one business day.
            </p>
          </div>
          <BusinessLeadForm />
        </div>
      </section>

      <FaqCtaSection
        faqs={businessFaqs}
        subtitle="What HR teams ask before signing."
      />
    </>
  )
}
