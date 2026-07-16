import { CheckCircle2, ReceiptText, RotateCcw } from "lucide-react"
import Link from "next/link"

import { CenteredHero } from "@/components/heroes"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { ServiceDecisionBoard } from "@/components/marketing/service-decision-board"
import { ComparisonTable } from "@/components/sections/comparison-table"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

import { PricingStickyCta } from "./pricing-sticky-cta"

/* ────────────────────────────── Data ────────────────────────────── */

const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")

const FEE_LEDGER_ITEMS = [
  "Secure service-specific form",
  "Clinical assessment and decision",
  "Follow-up questions needed for the decision",
  "Digital document or eScript delivery, if approved",
] as const

const comparisonItems = [
  { label: "No scheduled appointment for active pathways", us: true, them: false },
  { label: "AHPRA-registered doctors", us: true, them: true },
  { label: GUARANTEE, us: true, them: false },
  { label: "No subscription or membership", us: true, them: true },
  { label: "Physical examination available", us: false, them: true },
  { label: "Ongoing comprehensive care", us: false, them: true },
]

const pricingFaqs = [
  {
    question: "What payment methods do you accept?",
    answer: "We accept major credit and debit cards, Apple Pay, and Google Pay through Stripe.",
  },
  {
    question: "Can I get a receipt for my health insurance?",
    answer:
      "Yes. We email a tax invoice after payment. Reimbursement depends on your insurer and policy.",
  },
  {
    question: "Is InstantMed bulk billed, and do I need Medicare?",
    answer:
      "InstantMed is a private service and does not bulk bill or claim Medicare rebates. Medical certificates do not require Medicare. Prescribing requests require Medicare details for identity, prescribing records, and pharmacy continuity.",
  },
  {
    question: "How much do prescriptions cost at the pharmacy?",
    answer:
      "The request fee covers the doctor review and eScript, if approved. Medication is paid for separately at the pharmacy, where PBS rules may affect the price.",
  },
  {
    question: "How long does a refund take?",
    answer:
      "A recorded clinical decline starts the refund automatically. Your bank or card issuer controls when it appears on your statement.",
  },
  {
    question: "Can I use InstantMed for a family member?",
    answer:
      "No. Each patient must be 18 or older and submit through their own profile. InstantMed does not accept requests for children.",
  },
]

function FeeCoverageLedger() {
  return (
    <section
      aria-labelledby="fee-coverage-title"
      data-fee-coverage-ledger="request-fee"
      className="px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:items-center">
        <div>
          <SectionPill>Fee anatomy</SectionPill>
          <Heading id="fee-coverage-title" level="h2" className="mt-4 text-balance">
            What your fee covers.
          </Heading>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Choose the service above. Its listed price covers the request pathway from secure intake to a documented outcome. Optional priority review and pharmacy costs stay separate.
          </p>
          <p className="mt-5 max-w-xl border-t border-border/50 pt-5 text-sm leading-6 text-muted-foreground dark:border-white/10">
            {CLINICAL_REVIEW_SEQUENCE}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
          <div className="flex flex-col items-start gap-4 border-b border-border/50 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-foreground">InstantMed request</p>
                <p className="text-sm text-muted-foreground">One-off fee in AUD</p>
              </div>
            </div>
            <span className="text-sm font-medium text-foreground">Price shown above</span>
          </div>

          <dl className="divide-y divide-border/50 px-5 dark:divide-white/10 sm:px-6">
            {FEE_LEDGER_ITEMS.map((item) => (
              <div key={item} className="flex items-start justify-between gap-3 py-4 sm:gap-5">
                <dt className="flex min-w-0 items-start gap-2.5 text-base leading-6 text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </dt>
                <dd className="shrink-0 text-sm font-medium text-foreground">Included</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-border/50 bg-muted/30 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:px-6">
            <p className="text-sm font-semibold text-foreground">Kept separate</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3 sm:gap-5">
                <dt className="text-muted-foreground">Optional priority review</dt>
                <dd className="shrink-0 font-medium text-foreground">{PRICING_DISPLAY.PRIORITY_FEE}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 sm:gap-5">
                <dt className="text-muted-foreground">Medication at the pharmacy</dt>
                <dd className="shrink-0 font-medium text-foreground">Paid separately</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-start gap-3 border-t border-primary/15 bg-primary/5 px-5 py-4 sm:px-6">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">{REFUND_PAYMENT_PROCESS}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────── Component ────────────────────────────── */

export function PricingContent() {
  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden">
        <Navbar variant="marketing" />

        <main className="relative">
          <FAQSchema faqs={pricingFaqs} />

        {/* Hero */}
        <CenteredHero
          pill="Simple pricing"
          title="Choose the service. See the fee upfront."
          highlightWords={["fee upfront."]}
          subtitle={`No subscription or membership. ${REFUND_PAYMENT_PROCESS}`}
          className="pb-16 pt-14 sm:pb-20 sm:pt-20 lg:py-24"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span>Australia only</span>
              <span aria-hidden="true">·</span>
              <span>18+</span>
              <span aria-hidden="true">·</span>
              <span>{`Fees from ${PRICING_DISPLAY.MED_CERT} AUD`}</span>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {CLINICAL_REVIEW_SEQUENCE} Medical certificates do not require Medicare; prescribing
              requests do. Medication costs are separate.
            </p>
            <Button asChild size="lg" className="rounded-full">
              <Link href="#pricing-cards">Choose a service</Link>
            </Button>
          </div>
        </CenteredHero>

        <ServiceDecisionBoard id="pricing-cards" className="pb-14 pt-2 sm:pb-20 sm:pt-4" />

        <FeeCoverageLedger />

        {/* Comparison Table */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <ComparisonTable
            pill="Choose the right setting"
            title="Focused online requests or a GP visit"
            highlightWords={["right setting"]}
            subtitle="InstantMed handles a narrow set of remote requests. GP clinics provide broader and in-person care."
            usLabel="InstantMed"
            themLabel="GP clinic"
            items={comparisonItems}
          />
        </div>

        {/* FAQ */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <FAQSection
            title="Common questions"
            subtitle="Everything you need to know about our pricing."
            highlightWords={["questions"]}
            items={pricingFaqs}
          />
        </div>

        {/* CTA */}
        <CTABanner
          title="Choose the request that fits."
          subtitle={`Five focused services, with the fee shown before checkout. ${GUARANTEE}`}
          ctaText="Choose a service"
          ctaHref="/request"
        />
        </main>

        <MarketingFooter />
        <PricingStickyCta targetId="pricing-cards" />
      </div>
    </MarketingPageShell>
  )
}
