import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { GuaranteeBadge, MarketingFooter } from "@/components/marketing"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import type { ChecklistItem, FeatureItem } from "@/components/sections"
import {
  AccordionSection,
  CTABanner,
  FeatureGrid,
  IconChecklist,
  ProcessSteps,
} from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { GUARANTEE } from "@/lib/marketing/voice"

// =============================================================================
// METADATA
// =============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export const metadata: Metadata = {
  title: "Our Guarantee | Full Refund If We Can't Help",
  description:
    "Full refund if our doctor can't help. No fine print. Here is exactly what counts, what does not, and how the refund works.",
  alternates: {
    canonical: "/guarantee",
  },
  openGraph: {
    title: "Our Guarantee | InstantMed",
    description:
      "Full refund if our doctor can't help. Plain English. No fine print.",
    url: `${SITE_URL}/guarantee`,
    siteName: "InstantMed",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Guarantee | InstantMed",
    description: "Full refund if our doctor can't help.",
  },
}

// =============================================================================
// FAQ DATA
// =============================================================================

const guaranteeFaqs = [
  {
    question: "What does 'we can't help' mean exactly?",
    answer:
      "Two cases. (1) Our doctor reviews your request and decides they cannot safely issue what you asked for, given your symptoms or history. That is a clinical decline. (2) Our doctor needs you to see someone in person instead, and tells you so. Either way, you pay nothing.",
  },
  {
    question: "How long until I know if a doctor can help me?",
    answer:
      "Medical certificates: usually under 30 minutes, 24/7. Prescriptions and consultations: typically reviewed within 1 to 2 hours during operating hours (8am to 10pm AEST, 7 days). You will get email updates. We do not guarantee a specific time, only the outcome.",
  },
  {
    question: "What if the doctor needs more information from me?",
    answer:
      "If the doctor messages you with a follow-up question, the request stays open until you reply. The guarantee still applies. The only thing that ends the request without a refund is the doctor approving and issuing what you asked for.",
  },
  {
    question: "What about partial outcomes? Can I get a partial refund?",
    answer:
      "If the doctor issues part of what you asked for and declines part of it (rare, but possible on consults with multiple medications), you keep the issued part and get a full refund on the rest. No bookkeeping on your end.",
  },
  {
    question: "What about the priority fee?",
    answer:
      "The $9.95 Express Review fee is fully refunded alongside the consult fee whenever the guarantee triggers.",
  },
  {
    question: "Does the guarantee apply if I change my mind?",
    answer:
      "If a doctor has not yet reviewed your request, yes. Email support@instantmed.com.au and we will cancel and refund. Once a doctor has reviewed and issued, the clinical work is complete and standard refund terms apply, not this guarantee.",
  },
  {
    question: "How is the refund paid back?",
    answer:
      "To the original payment method, processed within one business day on our end. Stripe typically shows the reversal on your statement within 5 to 10 business days depending on your bank.",
  },
  {
    question: "Do I need to ask for the refund?",
    answer:
      "No. Declines and 'see someone in person' outcomes are auto-refunded the moment the doctor records the decision. The refund email comes within minutes. If you believe a refund is missing, email support@instantmed.com.au with your request ID and we will sort it.",
  },
]

// =============================================================================
// CONTENT
// =============================================================================

const qualifyingFeatures: FeatureItem[] = [
  {
    icon: <StickerIcon name="user-check" size={48} />,
    title: "Real AHPRA-registered doctors",
    description:
      "Every review is a human clinical decision, not an algorithm. That is what makes the outcome promise possible.",
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Full refund, original payment method",
    description:
      "No restocking fee, no partial refund, no hoops. Original payment method, one business day on our end.",
  },
  {
    icon: <StickerIcon name="speech-bubble" size={48} />,
    title: "Auto-refunded, no email needed",
    description:
      "Declines refund automatically the moment the doctor records the decision. You will see the email within minutes.",
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
    text: "If our doctor can't issue what you asked for, full refund",
    subtext:
      "Clinical declines, 'see someone in person' outcomes, and partial-issue cases all trigger the full refund automatically.",
  },
  {
    text: "Refund hits your statement same way you paid",
    subtext:
      "Card, Apple Pay, Google Pay, all original method. Processed within one business day on our end.",
  },
  {
    text: "You only pay when a doctor can actually help",
    subtext:
      "This is the whole point. Money does not stay with us unless our clinical work meets your need.",
  },
  {
    text: "No phone calls, no forms, no friction to claim it",
    subtext:
      "Auto-refunded by default. If anything looks wrong, one email to support@instantmed.com.au with your request ID and we sort it.",
  },
]

const refundSteps = [
  {
    number: 1,
    title: "Doctor reviews your request",
    description:
      "An AHPRA-registered GP looks at your symptoms, history, and what you have asked for. Outcome is one of three: issue, decline, or follow-up question.",
  },
  {
    number: 2,
    title: "Decline triggers an automatic refund",
    description:
      "If the doctor declines or recommends in-person care, the system fires the refund the moment the decision is recorded. No human in the loop on your end.",
  },
  {
    number: 3,
    title: "Refund goes back the way you paid",
    description:
      "Processed within one business day on our end. Your bank or card issuer usually shows the reversal in 5 to 10 business days.",
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
            highlightWords={["doctor can't help."]}
            subtitle="No fine print, no asterisks. If our doctor cannot safely issue what you asked for, you pay nothing. Refunds are automatic."
          >
            <div className="mt-8 flex justify-center">
              <GuaranteeBadge size="lg" linked={false} />
            </div>
          </CenteredHero>

          {/* Page superpower — anchors the auto-refund mechanism that
              differentiates this guarantee from competitor "money-back"
              promises requiring email + ticket + 30-day waits. */}
          <ServiceClaimSection
            eyebrow="No email, no ticket, no wait"
            headline={
              <>
                Refunds fire <span className="text-primary">automatically</span>.
              </>
            }
            body="When the doctor records a decline, the system processes the refund the same instant. The email lands within minutes. You don't have to ask, escalate, or send a request ID. Built that way on purpose."
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
            subtitle="Three steps. Most refunds fire automatically with no action from you."
            steps={refundSteps}
          />

          <AccordionSection
            title="Guarantee FAQ"
            subtitle="Straight answers on declines, partial outcomes, and refund timing."
            groups={[{ items: guaranteeFaqs }]}
          />

          <CTABanner
            title="Ready to see a doctor?"
            subtitle="Start a request. If our doctor can't help, you pay nothing."
            ctaText="Start a request"
            ctaHref="/request"
            secondaryText="Read the full terms"
            secondaryHref="/terms#refunds"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
