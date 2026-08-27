import type { Metadata } from "next"

import { MedicalCertificateOnlineLanding } from "@/components/marketing/medical-certificate-online-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedCertHowToSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { MEDICAL_CERTIFICATE_ONLINE_FAQ } from "@/lib/data/medical-certificate-online-faq"

export const revalidate = 86400

const SEARCH_DESCRIPTION = `Understand routine online medical certificates in Australia: costs, eligibility, safety limits and verification. Start a 1-3 day request from ${PRICING_DISPLAY.MED_CERT}.`

export const metadata: Metadata = {
  title: { absolute: "Online Medical Certificates: Costs, Rules & Safety | InstantMed" },
  description: SEARCH_DESCRIPTION,
  keywords: [
    "medical certificate online",
    "medical certificate online australia",
    "online medical certificate",
    "sick certificate online",
    "doctor certificate online",
    "carer's leave certificate online",
  ],
  openGraph: {
    title: "Online Medical Certificates: Costs, Rules & Safety | InstantMed",
    description: SEARCH_DESCRIPTION,
    url: "https://instantmed.com.au/medical-certificate-online",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Medical Certificates: Costs, Rules & Safety | InstantMed",
    description: SEARCH_DESCRIPTION,
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate-online",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("medical-certificate-online")

  return (
    <>
      <SpeakableSchema
        name="Medical Certificate Online Australia"
        description={`Request a routine medical certificate online from ${PRICING_DISPLAY.MED_CERT}. Routine requests follow the bounded protocol; concerns go to an AHPRA-registered Australian doctor.`}
        url="/medical-certificate-online"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <MedCertHowToSchema />
      <FAQSchema faqs={[...MEDICAL_CERTIFICATE_ONLINE_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          {
            name: "Medical Certificate Online",
            url: "https://instantmed.com.au/medical-certificate-online",
          },
        ]}
      />
      <ServiceSchema
        name="Online Medical Certificate Request"
        description="Routine one-to-three-day work, study, or carer's leave request through a Medical Director-approved pathway, with doctor review for concerns."
        price={PRICING.MED_CERT.toFixed(2)}
        url="/medical-certificate-online"
      />
      <HealthArticleSchema
        title="Medical Certificate Online Australia"
        description={`How online medical certificate requests work in Australia, what they can cover, what they cannot cover, and when to seek in-person care. From ${PRICING_DISPLAY.MED_CERT}.`}
        url="/medical-certificate-online"
        lastReviewed="2026-06"
      />
      <MedicalCertificateOnlineLanding visuals={visuals} />
    </>
  )
}
