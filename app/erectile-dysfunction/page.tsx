import type { Metadata } from "next"

import { ErectileDysfunctionLanding } from "@/components/marketing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  ReviewAggregateSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING, REVIEW_AGGREGATE } from "@/lib/constants"
import { ED_FAQ } from "@/lib/data/ed-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "ED Treatment | Private, No Call, No Clinic | InstantMed" },
  description: `Discreet ED treatment from an Australian doctor. Fill out a form, no call, no face-to-face appointment. Reviewed within 1-2 hours. From $${PRICING.MENS_HEALTH.toFixed(2)}.`,
  keywords: [
    "ed treatment online australia",
    "erectile dysfunction treatment online",
    "ed medication online",
    "online doctor ed",
    "telehealth ed australia",
    "discreet ed treatment",
  ],
  openGraph: {
    title: "ED Treatment | Private, No Call, No Clinic | InstantMed",
    description: "Discreet ED treatment online. Fill out a form, no call, no face-to-face appointment. Reviewed by an Australian doctor.",
    url: "https://instantmed.com.au/erectile-dysfunction",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "ED Treatment | Private, No Call, No Clinic | InstantMed",
    description: "Discreet ED treatment online. Just a form, no call, no face-to-face.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/erectile-dysfunction",
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="ED Treatment Online Australia"
        description={`Discreet, doctor-reviewed ED treatment from an AHPRA-registered Australian doctor. From $${PRICING.MENS_HEALTH.toFixed(2)}. No call needed.`}
        url="/erectile-dysfunction"
      />
      <FAQSchema faqs={[...ED_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "ED Treatment", url: "https://instantmed.com.au/erectile-dysfunction" },
        ]}
      />
      <MedicalServiceSchema
        name="Online ED Treatment"
        description="Discreet erectile dysfunction assessment and treatment from an AHPRA-registered Australian doctor. No call needed."
        price={PRICING.MENS_HEALTH.toFixed(2)}
      />
      <ReviewAggregateSchema ratingValue={REVIEW_AGGREGATE.ratingValue} reviewCount={REVIEW_AGGREGATE.reviewCount} />
      <HealthArticleSchema
        title="ED Treatment Online Australia"
        description={`Discreet ED treatment from an AHPRA-registered Australian doctor. No call needed. Reviewed within 1-2 hours. From $${PRICING.MENS_HEALTH.toFixed(2)}.`}
        url="/erectile-dysfunction"
      />
      <ErectileDysfunctionLanding />
    </>
  )
}
