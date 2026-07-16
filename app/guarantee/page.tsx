import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AccordionSection } from "@/components/sections/accordion-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { IconChecklist } from "@/components/sections/icon-checklist"
import { ProcessSteps } from "@/components/sections/process-steps"
import type { ChecklistItem, FeatureItem } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

// =============================================================================
// METADATA
// =============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")

export const metadata: Metadata = {
  title: "Our Guarantee | Full Refund If Declined",
  description:
    "Full refund if the doctor declines. No fine print. Here is exactly what counts, what does not, and how the refund works.",
  alternates: {
    canonical: "/guarantee",
  },
  openGraph: {
    title: "Our Guarantee | InstantMed",
    description:
      "Full refund if the doctor declines. Plain English. No fine print.",
    url: `${SITE_URL}/guarantee`,
    siteName: "InstantMed",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Guarantee | InstantMed",
    description: "Full refund if the doctor declines.",
  },
}

// =============================================================================
// FAQ DATA
// =============================================================================

const guaranteeFaqs = [
  {
    question: "What does a doctor decline mean exactly?",
    answer:
      `A clinical decline means the doctor decides the requested service cannot be provided safely online, or that you need in-person care instead. ${REFUND_PAYMENT_PROCESS}`,
  },
  {
    question: "How long until I know the doctor's decision?",
    answer:
      "The service operates 24/7: requests can be submitted and reviewed at any time of day. You will get email updates. We do not guarantee a specific review time, only the refund outcome if the doctor declines.",
  },
  {
    question: "What if the doctor needs more information from me?",
    answer:
      "If the doctor messages you with a follow-up question, the request stays open until you reply. The guarantee applies if the request later ends in a recorded clinical decline. Cancellations, expired requests, and completed services follow the refund policy.",
  },
  {
    question: "Do I pay before the doctor reviews my request?",
    answer:
      REFUND_PAYMENT_PROCESS,
  },
  {
    question: "What about the priority fee?",
    answer: `The ${PRICING_DISPLAY.PRIORITY_FEE} Priority review fee is fully refunded alongside the request fee whenever the guarantee triggers.`,
  },
  {
    question: "Does the guarantee apply if I change my mind?",
    answer:
      "The guarantee covers a clinical decline, not a change of mind. Contact support@instantmed.com.au as soon as possible. Cancellation and refund eligibility depends on whether payment, clinical review, or delivery has already occurred.",
  },
  {
    question: "How is the refund paid back?",
    answer:
      "We start the refund automatically to the original payment method. Your bank or card issuer controls when it appears on your statement, so timing can vary.",
  },
  {
    question: "Do I need to ask for the refund?",
    answer:
      "No. A recorded clinical decline starts the refund automatically. If you believe a refund is missing, email support@instantmed.com.au with your request ID so we can investigate.",
  },
]

// =============================================================================
// CONTENT
// =============================================================================

const qualifyingFeatures: FeatureItem[] = [
  {
    icon: <StickerIcon name="user-check" size={48} />,
    title: "Doctor-owned clinical model",
    description: CLINICAL_DECISION_MODEL,
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Full refund, original payment method",
    description:
      "The full request payment, including any priority fee, goes back to the original payment method after a clinical decline.",
  },
  {
    icon: <StickerIcon name="speech-bubble" size={48} />,
    title: "Automatic refund start",
    description:
      "A recorded clinical decline starts the refund automatically. Contact support if the confirmation or refund does not arrive.",
  },
  {
    icon: <StickerIcon name="clock" size={48} />,
    title: "Time updates, not time promises",
    description:
      "We will tell you when a doctor is reviewing and update you as things move. We do not promise a specific minute.",
  },
]

const whatYouGet: ChecklistItem[] = [
  {
    text: "If the doctor declines, full refund",
    subtext:
      "Clinical declines and recommendations for in-person care trigger the full refund automatically.",
  },
  {
    text: "Refund returns the same way you paid",
    subtext:
      "The refund goes to the original payment method. Your bank or card issuer controls statement timing.",
  },
  {
    text: "Payment is collected before review",
    subtext:
      REFUND_PAYMENT_PROCESS,
  },
  {
    text: "No separate claim form for a clinical decline",
    subtext:
      "The refund starts automatically. If anything looks wrong, email support@instantmed.com.au with your request ID.",
  },
]

const refundSteps = [
  {
    number: 1,
    title: "A clinical outcome is recorded",
    description:
      "The pathway may issue, ask a follow-up question, or record a clinical decline. Prescribing decisions are always made by a doctor.",
  },
  {
    number: 2,
    title: "Decline triggers an automatic refund",
    description:
      "If the doctor declines or recommends in-person care, the recorded decision starts a full refund. You do not need to submit a separate claim.",
  },
  {
    number: 3,
    title: "Refund goes back the way you paid",
    description:
      "The refund returns to the original payment method. Your bank or card issuer controls when it appears on your statement.",
  },
]

export default function GuaranteePage() {
  return (
    <>
      <FAQSchema faqs={guaranteeFaqs} />
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <CenteredHero
            pill="Our Guarantee"
            title={GUARANTEE}
            highlightWords={["doctor declines."]}
            subtitle={REFUND_PAYMENT_PROCESS}
          >
            <div className="mt-8 flex justify-center">
              <GuaranteeBadge size="lg" linked={false} />
            </div>
          </CenteredHero>

          {/* Page superpower — anchors the auto-refund mechanism that
              differentiates this guarantee from competitor "money-back"
              promises requiring email + ticket + 30-day waits. */}
          <ServiceClaimSection
            eyebrow="No separate refund claim"
            headline={
              <>
                Declines start a <span className="text-primary">full refund</span>.
              </>
            }
            body="When the doctor records a clinical decline, the system starts a full refund to the original payment method. Your bank controls when the credit appears."
          />

          <FeatureGrid
            title="What the guarantee covers"
            subtitle="Four things. All four are concrete and easy to verify."
            features={qualifyingFeatures}
            columns={2}
          />

          <IconChecklist
            title="Exactly what you get"
            subtitle="Read this once. It is the whole thing."
            items={whatYouGet}
          />

          <ProcessSteps
            title="How the refund works"
            subtitle="Three steps. A recorded clinical decline starts the refund automatically."
            steps={refundSteps}
          />

          <AccordionSection
            title="Guarantee FAQ"
            subtitle="Straight answers on clinical declines and refund timing."
            groups={[{ items: guaranteeFaqs }]}
          />

          <CTABanner
            title="Ready to see a doctor?"
            subtitle={REFUND_PAYMENT_PROCESS}
            ctaText="Start a request"
            ctaHref="/request"
            secondaryText="Read the full terms"
            secondaryHref="/terms#fees"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
