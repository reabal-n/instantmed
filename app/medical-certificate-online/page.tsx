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

export const metadata: Metadata = {
  title: { absolute: "Medical Certificate Online Australia | InstantMed" },
  description: `Request a medical certificate online for routine work, study, or carer's leave. AHPRA-registered Australian doctor review. From ${PRICING_DISPLAY.MED_CERT}.`,
  keywords: [
    "medical certificate online",
    "medical certificate online australia",
    "online medical certificate",
    "sick certificate online",
    "doctor certificate online",
    "carer's leave certificate online",
  ],
  openGraph: {
    title: "Medical Certificate Online Australia | InstantMed",
    description:
      "Request a routine medical certificate online. Secure form, Australian doctor review, clear safety boundaries.",
    url: "https://instantmed.com.au/medical-certificate-online",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Certificate Online Australia | InstantMed",
    description: "Routine online medical certificate requests with Australian doctor review.",
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
        description={`Request a routine medical certificate online from ${PRICING_DISPLAY.MED_CERT}. An AHPRA-registered Australian doctor reviews the information and decides whether a certificate is clinically appropriate.`}
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
        description="Routine work, study, or carer's leave medical certificate request reviewed by an AHPRA-registered Australian doctor."
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
