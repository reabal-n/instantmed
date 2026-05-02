import type { Metadata } from "next"

import { MedCertLanding } from "@/components/marketing"
import { BreadcrumbSchema, FAQSchema, HealthArticleSchema,MedCertHowToSchema, MedicalServiceSchema, ReviewAggregateSchema, SpeakableSchema } from "@/components/seo"
import { PRICING, REVIEW_AGGREGATE } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Medical Certificate | Doctor Reviewed Online | InstantMed" },
  description: `Get a medical certificate for work or study online. Fill out a form for doctor review. From $${PRICING.MED_CERT.toFixed(2)}.`,
  keywords: [
    "medical certificate online australia",
    "sick note online",
    "telehealth medical certificate",
    "doctor certificate for work",
    "online medical certificate",
    "medical certificate for uni",
    "sick certificate australia",
  ],
  openGraph: {
    title: "Medical Certificate | Doctor Reviewed Online | InstantMed",
    description:
      "Medical certificate for work, uni, or carer's leave. Fill out a form for review by an Australian doctor.",
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Certificate | Doctor Reviewed Online | InstantMed",
    description: "Medical certificates reviewed by Australian doctors. Just a form, no video, no waiting room.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate",
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Online Medical Certificate Australia"
        description={`Get a medical certificate for work or study online. Reviewed by an AHPRA-registered Australian doctor. From $${PRICING.MED_CERT.toFixed(2)}. No appointment needed.`}
        url="/medical-certificate"
      />
      <MedCertHowToSchema />
      <FAQSchema faqs={[...MED_CERT_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Medical Certificate", url: "https://instantmed.com.au/medical-certificate" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Medical Certificate"
        description="Get a valid medical certificate for work or study reviewed by an Australian registered doctor."
        price={PRICING.MED_CERT.toFixed(2)}
      />
      <ReviewAggregateSchema ratingValue={REVIEW_AGGREGATE.ratingValue} reviewCount={REVIEW_AGGREGATE.reviewCount} />
      <HealthArticleSchema
        title="Online Medical Certificate Australia"
        description="Get a valid medical certificate for work or study reviewed by an AHPRA-registered Australian doctor."
        url="/medical-certificate"
      />
      <MedCertLanding />
    </>
  )
}
