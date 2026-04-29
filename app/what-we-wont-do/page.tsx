import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { MarketingFooter } from "@/components/marketing"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import type { ChecklistItem } from "@/components/sections"
import { AccordionSection, CTABanner, IconChecklist } from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"

// =============================================================================
// METADATA
// =============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export const metadata: Metadata = {
  title: { absolute: "What we won't do | InstantMed" },
  description:
    "The limits we lead with. Most platforms hide them. We don't. Clinical scope, what we refuse to prescribe, and how we treat you when we can't help.",
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
    subtext:
      "An AHPRA-registered doctor reads every request and records the clinical decision. AI tools assist with administrative work behind the scenes. They never approve or decline a request.",
  },
  {
    text: "We won't promise a specific minute-by-minute timeline.",
    subtext:
      "We publish a median delivery time and we update you as your request moves. We do not guarantee a specific number of minutes, because clinical follow-up legitimately takes longer on some days. We guarantee an outcome, not a clock.",
  },
  {
    text: "We won't auto-approve to look fast.",
    subtext:
      "Speed is a side effect of removing booking friction, not of removing review. Every outcome is a human decision recorded in the patient record.",
  },
  {
    text: "We won't bury bad reviews.",
    subtext:
      "Our public reviews include the bad ones. If we ever ask you to leave a review, the request is the same regardless of how your experience went.",
  },
]

const treatmentLimits: ChecklistItem[] = [
  {
    text: "We won't ghost you.",
    subtext:
      "Every request gets a real-doctor outcome, even when the answer is no. Declines come with a written explanation and an automatic refund. You don't have to chase us.",
  },
  {
    text: "We won't sell or share your health data.",
    subtext:
      "Your records are encrypted at rest, hosted in Australia, and never shared with advertisers, brokers, or third parties beyond what is required to deliver care. Full detail in our privacy policy.",
  },
  {
    text: "We won't dark-pattern your refund.",
    subtext:
      "Declines auto-refund the moment the doctor records the decision. There is no support form to fill out, no hold music, no escalation tier. The email lands within minutes.",
  },
  {
    text: "We won't lock you out of your records.",
    subtext:
      "You own your medical record. You can export your certificates, prescriptions, and clinical notes from your dashboard at any time. No subscription required, no fee, no hoops.",
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
      "If the doctor records a clinical decline or recommends in-person care, yes. If the intake form blocks the request before payment, you are never charged. Detail in /guarantee.",
  },
  {
    question: "What about the things you do that are not on this list?",
    answer:
      "Our scope is documented across the service pages (medical-certificate, prescriptions, consult, erectile-dysfunction, hair-loss) and the clinical-governance page. This page is the inverse: the things we choose not to do.",
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
            subtitle="Most platforms hide their limits. We lead with ours. Clinical scope, what we refuse to prescribe, and how we treat you when we can't help."
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
            subtitle="If our doctor can't help, you pay nothing. Three minutes. Done."
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
