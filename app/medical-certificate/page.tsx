import type { Metadata } from "next"

import { MedCertLanding } from "@/components/marketing/med-cert-landing"
import { BreadcrumbSchema, FAQSchema, HealthArticleSchema,MedCertHowToSchema, MedicalServiceSchema, SpeakableSchema } from "@/components/seo"
import { PRICING } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Medical Certificate Online Australia | Doctor Review | InstantMed" },
  description: `Get a medical certificate for work or study online. Fill out a secure form, no appointment. From $${PRICING.MED_CERT.toFixed(2)}.`,
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
    title: "Online Medical Certificate | AHPRA Doctor Review | InstantMed",
    description:
      "Start with a secure form that takes about 3 minutes. AHPRA-registered doctor review. Certificate to your inbox.",
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Medical Certificate | AHPRA Doctor Review | InstantMed",
    description: "Start with a secure form that takes about 3 minutes. AHPRA-registered doctor review. Certificate to your inbox.",
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
        description="Get routine sick-leave or study-absence evidence reviewed by an Australian registered doctor. Employer and institution policies may vary."
        price={PRICING.MED_CERT.toFixed(2)}
      />
      <HealthArticleSchema
        title="Online Medical Certificate Australia"
        description="Get routine absence evidence for work or study reviewed by an AHPRA-registered Australian doctor."
        url="/medical-certificate"
      />
      <MedCertLanding />
    </>
  )
}
