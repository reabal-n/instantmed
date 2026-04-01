import type { Metadata } from "next"
import { BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"
import { PRICING } from "@/lib/constants"
import { HairLossClient } from "./hair-loss-client"

export const metadata: Metadata = {
  title: "Hair Loss Treatment Online Australia",
  description:
    "Consult an AHPRA-registered Australian doctor about hair loss treatment. Discreet online assessment, personalised treatment plan. From $39.95.",
  keywords: [
    "hair loss treatment australia",
    "hair loss treatment online",
    "telehealth hair loss consultation",
    "hair loss doctor online",
    "male pattern baldness treatment",
  ],
  openGraph: {
    title: "Hair Loss Treatment Online Australia | InstantMed",
    description:
      "Consult an AHPRA-registered Australian doctor about hair loss treatment. Discreet online assessment.",
    url: "https://instantmed.com.au/hair-loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hair Loss Treatment Online | InstantMed",
    description:
      "Doctor-led hair loss consultation from AHPRA-registered Australian doctors.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/hair-loss",
  },
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What treatment options are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our doctors can recommend different treatment approaches based on your assessment. One option is an oral treatment that addresses hormonal factors contributing to hair loss — it's most effective for hair loss at the crown and mid-scalp. Another option is a topical treatment applied directly to the scalp that stimulates hair follicles and increases blood flow. Many men use both approaches together for best results.",
      },
    },
    {
      "@type": "Question",
      name: "How long until I see results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hair growth takes time. With topical treatments, some improvement may be visible in 2-4 months. With oral treatments, most men see results in 3-6 months. It can take up to 12 months to see the full effect. Consistency is key — stopping treatment typically leads to reversal of gains.",
      },
    },
    {
      "@type": "Question",
      name: "Are there side effects?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Topical treatments may cause scalp irritation or unwanted facial hair growth (rare). Oral treatments may cause decreased libido or erectile changes in a small percentage of men (1-2%), which typically resolve after stopping treatment. Our doctors will discuss potential side effects with you.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need a doctor consultation for these treatments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oral treatments always require a doctor consultation in Australia. Topical treatments at higher strengths are also prescription-only, though lower strengths are available over the counter. Our doctors can recommend both approaches after assessment.",
      },
    },
    {
      "@type": "Question",
      name: "Is the service really discreet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Completely. No phone calls required. Your pharmacy receives only the prescription — not your consultation details. Medications come in standard pharmacy packaging with no indication of contents. Your bank statement shows 'InstantMed' only.",
      },
    },
    {
      "@type": "Question",
      name: "Can women use these treatments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Topical treatments can be used by women for hair loss (at lower concentrations). Oral treatments are NOT suitable for women, especially those who are or may become pregnant. If you're a woman experiencing hair loss, please indicate this in your consultation.",
      },
    },
  ],
}

export default function HairLossPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Hair Loss Treatment", url: "https://instantmed.com.au/hair-loss" },
        ]}
      />
      <MedicalServiceSchema
        name="Hair Loss Treatment Consultation"
        description="Online hair loss assessment and treatment plan from an AHPRA-registered Australian doctor. Discreet, fast, and clinician-reviewed."
        price={PRICING.HAIR_LOSS.toFixed(2)}
      />
      <HairLossClient faqSchema={faqSchema} />
    </>
  )
}
