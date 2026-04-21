import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { GuaranteeBadge, MarketingFooter } from "@/components/marketing"
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
  title: "Our Guarantee | 2-Hour Review or Your Money Back",
  description:
    "Doctor approves in 2 hours or your money back. Here is exactly how the guarantee works, what qualifies, and how refunds are processed.",
  alternates: {
    canonical: "/guarantee",
  },
  openGraph: {
    title: "Our Guarantee | InstantMed",
    description:
      "Doctor approves in 2 hours or your money back. Plain English. No fine print.",
    url: `${SITE_URL}/guarantee`,
    siteName: "InstantMed",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Guarantee | InstantMed",
    description: "Doctor approves in 2 hours or your money back.",
  },
}

// =============================================================================
// FAQ DATA
// =============================================================================

const guaranteeFaqs = [
  {
    question: "What counts as the start of the 2-hour window?",
    answer:
      "The clock starts the moment your payment is confirmed and your request hits the doctor queue. You will see a confirmation page and receive an email with a time stamp. That time stamp is the reference.",
  },
  {
    question: "What happens if a doctor has not reviewed within 2 hours?",
    answer:
      "Email support@instantmed.com.au with your request ID and we will process a full refund to the original payment method within one business day. No call, no form, no argument. Your clinical request stays in the queue if you still want it reviewed.",
  },
  {
    question: "Does the guarantee apply overnight?",
    answer:
      "Medical certificates are 24/7 and covered around the clock. Prescription and consult requests are reviewed 8am to 10pm AEST, 7 days. If you submit outside those hours, the 2-hour window starts at 8am AEST the next day. You will see this clearly on the confirmation page before you pay.",
  },
  {
    question: "What if the doctor declines my request?",
    answer:
      "A decline is a clinical decision, not a service failure, so the 2-hour guarantee does not apply. But every declined request is automatically refunded in full. You only pay when a doctor can actually help.",
  },
  {
    question: "What if the doctor needs more information?",
    answer:
      "If the doctor contacts you with a follow-up question, the 2-hour clock pauses until you respond. This protects the guarantee for requests that take longer because of a back-and-forth, not because of us.",
  },
  {
    question: "How do I claim the refund?",
    answer:
      "Email support@instantmed.com.au with your request ID. Refunds are processed to the original payment method within one business day. Stripe typically shows the reversal on your statement within 5 to 10 business days depending on your bank.",
  },
  {
    question: "Does the guarantee include the priority fee?",
    answer:
      "Yes. If you paid the $9.95 Express Review fee and we miss the 2-hour mark, that add-on is refunded alongside the consult fee.",
  },
  {
    question: "Can I get a refund if I change my mind?",
    answer:
      "If a doctor has not yet reviewed your request, yes. Email support@instantmed.com.au and we will cancel and refund. Once a doctor has reviewed and approved the request, the clinical work is complete and standard refund terms apply, not the 2-hour guarantee.",
  },
]

// =============================================================================
// CONTENT
// =============================================================================

const qualifyingFeatures: FeatureItem[] = [
  {
    icon: <StickerIcon name="clock" size={48} />,
    title: "2 hours, from payment to review",
    description:
      "Timed from the moment your request hits the doctor queue. Miss the window, get your money back.",
  },
  {
    icon: <StickerIcon name="user-check" size={48} />,
    title: "Real AHPRA-registered doctors",
    description:
      "Every review is a human clinical decision, not an algorithm. That is the whole point of the guarantee.",
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Full refund, same payment method",
    description:
      "No restocking fee, no partial refund, no hoops. Original payment method, one business day, done.",
  },
  {
    icon: <StickerIcon name="speech-bubble" size={48} />,
    title: "No argument, no form",
    description:
      "One email to support@instantmed.com.au with your request ID. We check the time stamp and refund it.",
  },
]

const whatYouGet: ChecklistItem[] = [
  {
    text: "A doctor reviews your request within 2 hours of payment",
    subtext:
      "Measured from the time stamp on your confirmation email, not from when you hit submit.",
  },
  {
    text: "If we miss the window, you get a full refund",
    subtext:
      "Consult fee, priority fee, the lot. Refunded to the original payment method within one business day.",
  },
  {
    text: "Your clinical request stays active if you still want it",
    subtext:
      "Getting a refund does not mean cancelling the review. A doctor can still approve and deliver the script or certificate if you want to keep going.",
  },
  {
    text: "Every declined request is automatically refunded",
    subtext:
      "This is separate from the 2-hour guarantee and applies to all declines, full stop. You only pay when a doctor can actually help you.",
  },
]

const refundSteps = [
  {
    number: 1,
    title: "Email support with your request ID",
    description:
      "Send a short email to support@instantmed.com.au. Include the request ID from your confirmation email so we can pull the timestamps.",
  },
  {
    number: 2,
    title: "We check the time stamp",
    description:
      "Usually takes under an hour during business hours. If the 2-hour window was missed, refund approved automatically.",
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
            highlightWords={["2 hours", "money back."]}
            subtitle="No fine print, no asterisks. If a doctor has not reviewed your request within 2 hours of payment, we refund the whole thing. You still get the review if you want it."
          >
            <div className="mt-8 flex justify-center">
              <GuaranteeBadge size="lg" linked={false} />
            </div>
          </CenteredHero>

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
            subtitle="Three steps, one email, one business day on our end."
            steps={refundSteps}
          />

          <AccordionSection
            title="Guarantee FAQ"
            subtitle="Straight answers on timing, overnight requests, declines, and refunds."
            groups={[{ items: guaranteeFaqs }]}
          />

          <CTABanner
            title="Ready to see a doctor?"
            subtitle="Start a request now. A doctor reviews it within 2 hours or you get your money back."
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
