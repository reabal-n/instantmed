import type { Metadata } from "next"

import { HairLossLanding } from "@/components/marketing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  ReviewAggregateSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING, REVIEW_AGGREGATE } from "@/lib/constants"
import { HAIR_LOSS_FAQ } from "@/lib/data/hair-loss-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Hair Loss Treatment | Online, No GP Visit | InstantMed" },
  description: `Hair loss assessment from an Australian doctor. Fill out a form — no call, no clinic visit. From $${PRICING.HAIR_LOSS.toFixed(2)}.`,
  keywords: [
    "hair loss treatment australia",
    "hair loss treatment online",
    "telehealth hair loss consultation",
    "hair loss doctor online",
    "male pattern baldness treatment",
    "androgenetic alopecia treatment",
  ],
  openGraph: {
    title: "Hair Loss Treatment | Online, No GP Visit | InstantMed",
    description:
      "Hair loss treatment online — fill out a form, no call, no clinic visit. Reviewed by an Australian doctor.",
    url: "https://instantmed.com.au/hair-loss",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hair Loss Treatment Online Australia | InstantMed",
    description: "Doctor-reviewed hair loss treatment, no call needed.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/hair-loss",
  },
}

export default function HairLossPage() {
  return (
    <>
      <SpeakableSchema
        name="Hair Loss Treatment Online Australia"
        description={`Discreet, doctor-led hair loss assessment from an AHPRA-registered Australian doctor. From $${PRICING.HAIR_LOSS.toFixed(2)}. No call needed.`}
        url="/hair-loss"
      />
      <FAQSchema faqs={[...HAIR_LOSS_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Hair Loss Treatment", url: "https://instantmed.com.au/hair-loss" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Hair Loss Treatment"
        description="Discreet hair loss assessment and treatment from an AHPRA-registered Australian doctor. No call needed."
        price={PRICING.HAIR_LOSS.toFixed(2)}
      />
      <ReviewAggregateSchema ratingValue={REVIEW_AGGREGATE.ratingValue} reviewCount={REVIEW_AGGREGATE.reviewCount} />
      <HealthArticleSchema
        title="Hair Loss Treatment Online Australia"
        description={`Doctor-led hair loss assessment from an AHPRA-registered Australian doctor. Discreet, no call needed. From $${PRICING.HAIR_LOSS.toFixed(2)}.`}
        url="/hair-loss"
      />
      <HairLossLanding />
    </>
  )
}
