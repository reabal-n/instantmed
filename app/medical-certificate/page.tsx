import type { Metadata } from "next"

import { MedCertLanding } from "@/components/marketing/med-cert-landing"
import { BreadcrumbSchema, FAQSchema, HealthArticleSchema,MedCertHowToSchema, MedicalServiceSchema, SpeakableSchema } from "@/components/seo"
import { PRICING_DISPLAY, PRICING_SCHEMA } from "@/lib/constants"
import { MED_CERT_LANDING_FAQ } from "@/lib/data/med-cert-faq"

export const revalidate = 86400

const SEARCH_DESCRIPTION = `Online medical certificates for routine 1-3 day work, study or carer's leave. Secure form, no appointment, from ${PRICING_DISPLAY.MED_CERT}. Issued only when clinically appropriate.`

export const metadata: Metadata = {
  title: { absolute: `Medical Certificates Online | From ${PRICING_DISPLAY.MED_CERT} | InstantMed` },
  description: SEARCH_DESCRIPTION,
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
    title: `Medical Certificates Online | From ${PRICING_DISPLAY.MED_CERT} | InstantMed`,
    description: SEARCH_DESCRIPTION,
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: `Medical Certificates Online | From ${PRICING_DISPLAY.MED_CERT} | InstantMed`,
    description: SEARCH_DESCRIPTION,
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
        description={`Request a routine work or study certificate through a Medical Director-approved clinical pathway. From ${PRICING_DISPLAY.MED_CERT}. No appointment needed.`}
        url="/medical-certificate"
      />
      <MedCertHowToSchema />
      <FAQSchema faqs={[...MED_CERT_LANDING_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Medical Certificate", url: "https://instantmed.com.au/medical-certificate" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Medical Certificate"
        description="Request routine one-to-three-day work or study absence evidence through a bounded clinical pathway. Employer and institution policies may vary."
        price={PRICING_SCHEMA.MED_CERT}
      />
      <HealthArticleSchema
        title="Online Medical Certificate Australia"
        description="Request routine absence evidence for work or study through a Medical Director-approved clinical pathway."
        url="/medical-certificate"
      />
      <MedCertLanding />
    </>
  )
}
