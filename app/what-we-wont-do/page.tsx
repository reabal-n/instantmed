import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AccordionSection } from "@/components/sections/accordion-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { IconChecklist } from "@/components/sections/icon-checklist"
import type { ChecklistItem } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")

// =============================================================================
// METADATA
// =============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export const metadata: Metadata = {
  title: { absolute: "What we won't do | InstantMed" },
  description:
    "The limits we lead with. Most platforms hide them. We don't. Clinical scope, what we refuse to prescribe, and how we handle declines.",
  alternates: { canonical: "/what-we-wont-do" },
  openGraph: {
    title: "What we won't do | InstantMed",
    description: "Most platforms hide their limits. We lead with ours.",
    url: `${SITE_URL}/what-we-wont-do`,
    siteName: "InstantMed",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "What we won't do | InstantMed",
    description: "Most platforms hide their limits. We lead with ours.",
  },
}

export const revalidate = 86400

// =============================================================================
// CONTENT
// =============================================================================

const clinicalLimits: ChecklistItem[] = [
  {
    text: "We won't issue a certificate without enough clinical information.",
    subtext:
      "If the form leaves a clinical question unanswered, the doctor messages you for more detail or declines. The form is structured so this is rare, but it happens. The guarantee covers it.",
  },
  {
    text: "We won't prescribe Schedule 8 controlled drugs.",
    subtext:
      "Online assessment is not appropriate for opioids, ADHD stimulants, or other Schedule 8 medications. The intake blocks them at submission and the doctor will redirect you to in-person care.",
  },
  {
    text: "We won't write a certificate for high-stakes use cases.",
    subtext:
      "Court appearances, exam deferrals, fitness-to-drive, fitness-to-fly, custody disputes, NDIS, and workers-compensation cases all need a doctor who has examined you in person and can stand behind the document. We block these at intake.",
  },
  {
    text: "We won't pretend a form replaces an in-person exam.",
    subtext:
      "Some symptoms need a stethoscope, a blood pressure cuff, or a physical examination. When the doctor reads your form and reaches that conclusion, they'll tell you, refund the fee, and recommend the right next step.",
  },
]

const honestyLimits: ChecklistItem[] = [
  {
    text: "We won't pretend AI is a doctor.",
    subtext: CLINICAL_DECISION_MODEL,
  },
  {
    text: "We won't promise a specific minute-by-minute timeline.",
    subtext:
      "We publish a median delivery time and we update you as your request moves. We do not guarantee a specific number of minutes, because clinical follow-up legitimately takes longer on some days. We guarantee an outcome, not a clock.",
  },
  {
    text: "We won't blur protocol with prescribing.",
    subtext:
      "The doctor-owned protocol is limited to eligible low-risk certificate requests. Prescribing decisions stay with an AHPRA-registered doctor.",
  },
  {
    text: "We won't fake trust signals.",
    subtext:
      "We use verifiable badges and plain clinical explanations. We do not publish invented patient quotes or hide behind polished social proof.",
  },
]

const treatmentLimits: ChecklistItem[] = [
  {
    text: "We won't ghost you.",
    subtext:
      "Each request reaches a documented clinical outcome. Eligible protocol-issued certificates receive individual doctor review afterward, and recorded clinical declines start the refund process automatically.",
  },
  {
    text: "We won't sell your health data.",
    subtext:
      `We do not sell health information to advertisers or data brokers. ${CLINICAL_ACCESS_SCOPE} Our privacy policy explains the service providers needed to deliver care.`,
  },
  {
    text: "We won't dark-pattern your refund.",
    subtext: REFUND_PAYMENT_PROCESS,
  },
  {
    text: "We won't lock you out of your records.",
    subtext:
      "Delivered documents remain available in your patient dashboard. You can also request access to or correction of your health information, subject to legal record-retention requirements.",
  },
]

const faqs = [
  {
    question: "Why publish a 'what we won't do' page at all?",
    answer:
      "Most telehealth platforms hide their limits in the small print. We lead with them because trust is built on what a service refuses to do, not just on what it offers. If our limits don't match what you need, the right answer is for you to know that before you pay.",
  },
  {
    question: "What happens if I ask for something on this list?",
    answer:
      "The intake form blocks the most-restricted items at submission (controlled drugs, listed high-stakes use cases) and explains why. For everything else, the doctor reviews the request, declines, refunds the fee, and where appropriate suggests the right place to go.",
  },
  {
    question: "Will the list change over time?",
    answer:
      "Yes. As clinical evidence and regulatory guidance evolve, our scope evolves. Any change to this list is announced publicly. We don't expand quietly into things we previously said we wouldn't do.",
  },
  {
    question: "Is the refund automatic in every case on this list?",
    answer:
      `${REFUND_PAYMENT_PROCESS} If the intake blocks an out-of-scope request before payment, no payment is collected. See the guarantee for detail.`,
  },
  {
    question: "What about the things you do that are not on this list?",
    answer:
      "Our scope is documented across the medical-certificate, prescriptions, erectile-dysfunction, hair-loss, and women's-health service pages, plus the specialty overview and clinical-governance page. This page is the inverse: the things we choose not to do.",
  },
]

// =============================================================================
// PAGE
// =============================================================================

export default function WhatWeWontDoPage() {
  return (
    <>
      <FAQSchema faqs={faqs} />
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <CenteredHero
            pill="The limits we lead with"
            title="What we won't do."
            highlightWords={["won't"]}
            subtitle="Most platforms hide their limits. We lead with ours: clinical scope, what we refuse to prescribe, and how we handle declines."
          />

          <ServiceClaimSection
            eyebrow="The honest version"
            headline={
              <>
                The list nobody else <span className="text-primary">writes down</span>.
              </>
            }
            body="Trust is built on what a service refuses to do, not just on what it offers. If our limits don't match what you need, you should know that before you pay."
          />

          <IconChecklist
            title="Clinical limits"
            subtitle="What we refuse to prescribe or certify, and why."
            items={clinicalLimits}
          />

          <IconChecklist
            title="Honest about what we are"
            subtitle="Where the brand line stops and the operational reality begins."
            items={honestyLimits}
          />

          <IconChecklist
            title="How we treat you"
            subtitle="The things that aren't clinical, but matter just as much."
            items={treatmentLimits}
          />

          <AccordionSection
            title="Reasonable questions about this list"
            subtitle="Direct answers on scope, the refund, and how the list evolves."
            groups={[{ items: faqs }]}
          />

          <CTABanner
            title="Ready when you are."
            subtitle={`Start with a secure form. Takes about 3 minutes. ${REFUND_PAYMENT_PROCESS}`}
            ctaText="Get started"
            ctaHref="/request"
            secondaryText="Read the guarantee"
            secondaryHref="/guarantee"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
