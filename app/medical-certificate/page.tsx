import type { Metadata } from "next"
import { MedCertLanding } from "@/components/marketing/med-cert-landing"
import { SpeakableSchema, MedCertHowToSchema, FAQSchema, BreadcrumbSchema, MedicalServiceSchema, ReviewAggregateSchema, HealthArticleSchema } from "@/components/seo/healthcare-schema"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { PRICING, REVIEW_AGGREGATE } from "@/lib/constants"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Medical Certificate Online Australia | GP-Reviewed | InstantMed",
  description: `Get a medical certificate for work or study in under an hour. Reviewed by an AHPRA-registered Australian doctor. From $${PRICING.MED_CERT.toFixed(2)}. No appointment needed.`,
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
    title: "Medical Certificate Online Australia | InstantMed",
    description:
      "GP-reviewed medical certificates for work, uni, or carer's leave. From an AHPRA-registered Australian doctor. Typically under an hour.",
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Certificate Online Australia | InstantMed",
    description: "GP-reviewed medical certificates, no appointment needed.",
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
        description={`Get a medical certificate for work or study in under an hour. Reviewed by an AHPRA-registered Australian doctor. From $${PRICING.MED_CERT.toFixed(2)}. No appointment needed.`}
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
        description="Get a valid medical certificate for work or study reviewed by an Australian registered doctor. Available same day."
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
