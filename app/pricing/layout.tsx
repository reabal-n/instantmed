import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Telehealth Pricing Australia | No Subscriptions | InstantMed",
  description:
    "Simple, transparent telehealth pricing. Medical certificates from $19.95, repeat prescriptions from $29.95. No subscriptions, no hidden fees. Pay only when you need care.",
  keywords: [
    "telehealth pricing australia",
    "online doctor cost",
    "medical certificate price",
    "prescription cost online",
    "telehealth consultation fee",
    "cheap online doctor",
    "affordable telehealth",
    "no subscription telehealth",
  ],
  openGraph: {
    title: "Telehealth Pricing | Simple & Transparent | InstantMed",
    description: "Medical certificates from $19.95, repeat prescriptions from $29.95. No subscriptions, no hidden fees. 100% refund if we can't help.",
    url: "https://instantmed.com.au/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telehealth Pricing | Simple & Transparent | InstantMed",
    description: "Medical certificates from $19.95, repeat prescriptions from $29.95. No subscriptions, no hidden fees.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/pricing",
  },
}

// FAQ data for schema - mirrors page content
const faqSchemaData = [
  { question: "Are there any hidden fees?", answer: "Nope. The price you see is the price you pay. No subscriptions, no memberships, no surprises." },
  { question: "What if my request is declined?", answer: "Full refund, no questions asked. We only charge if we can actually help you." },
  { question: "How do I pay?", answer: "All major credit/debit cards, Apple Pay, and Google Pay. Payment is secure and encrypted." },
  { question: "Is this covered by Medicare?", answer: "Our service fee isn't Medicare rebateable. However, any medications prescribed through our service may be eligible for PBS subsidies where applicable." },
]

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* SEO Structured Data */}
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Pricing", url: "https://instantmed.com.au/pricing" }
        ]}
      />
      {children}
    </>
  )
}
