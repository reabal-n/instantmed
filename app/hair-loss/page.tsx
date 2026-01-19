import type { Metadata } from "next"
import { HairLossClient } from "./hair-loss-client"

export const metadata: Metadata = {
  title: "Hair Loss Consultation Online Australia | InstantMed",
  description:
    "Get hair loss consultations online from Australian doctors. Doctor-led assessment and treatment planning. Discreet service, 100% online.",
  keywords: [
    "hair loss consultation australia",
    "hair loss doctor online",
    "male pattern baldness consultation",
    "hair loss telehealth",
    "hair regrowth consultation",
    "online hair loss doctor",
  ],
  openGraph: {
    title: "Hair Loss Consultation Online | InstantMed",
    description: "Get hair loss consultations from Australian doctors. Discreet, 100% online.",
    url: "https://instantmed.com.au/hair-loss",
  },
  alternates: {
    canonical: "https://instantmed.com.au/hair-loss",
  },
}

const faqs = [
  {
    question: "What treatment options are available?",
    answer:
      "Our doctors can recommend different treatment approaches based on your assessment. One option is an oral treatment that addresses hormonal factors contributing to hair loss — it's most effective for hair loss at the crown and mid-scalp. Another option is a topical treatment applied directly to the scalp that stimulates hair follicles and increases blood flow. Many men use both approaches together for best results.",
  },
  {
    question: "How long until I see results?",
    answer:
      "Hair growth takes time. With topical treatments, some improvement may be visible in 2-4 months. With oral treatments, most men see results in 3-6 months. It can take up to 12 months to see the full effect. Consistency is key — stopping treatment typically leads to reversal of gains.",
  },
  {
    question: "Are there side effects?",
    answer:
      "Topical treatments may cause scalp irritation or unwanted facial hair growth (rare). Oral treatments may cause decreased libido or erectile changes in a small percentage of men (1-2%), which typically resolve after stopping treatment. Our doctors will discuss potential side effects with you.",
  },
  {
    question: "Do I need a doctor consultation for these treatments?",
    answer:
      "Oral treatments always require a doctor consultation in Australia. Topical treatments at higher strengths are also prescription-only, though lower strengths are available over the counter. Our doctors can recommend both approaches after assessment.",
  },
  {
    question: "Is the service really discreet?",
    answer:
      "Completely. No phone calls required. Your pharmacy receives only the prescription — not your consultation details. Medications come in standard pharmacy packaging with no indication of contents. Your bank statement shows 'InstantMed' only.",
  },
  {
    question: "Can women use these treatments?",
    answer:
      "Topical treatments can be used by women for hair loss (at lower concentrations). Oral treatments are NOT suitable for women, especially those who are or may become pregnant. If you're a woman experiencing hair loss, please indicate this in your consultation.",
  },
]

export default function HairLossPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return <HairLossClient faqSchema={faqSchema} />
}
