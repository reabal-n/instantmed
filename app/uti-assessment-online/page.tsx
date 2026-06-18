import type { Metadata } from "next"

import { WomensHealthLanding } from "@/components/marketing/womens-health-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { WOMENS_HEALTH_FAQ } from "@/lib/data/womens-health-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "UTI Assessment Online Australia | Doctor Review | InstantMed" },
  description: `UTI symptom assessment from an Australian doctor. Start with a secure form, no booked appointment or waiting room. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`,
  keywords: [
    "uti assessment online australia",
    "online uti assessment",
    "uti doctor online australia",
    "telehealth uti australia",
    "urinary symptoms doctor online",
  ],
  openGraph: {
    title: "UTI Assessment Online Australia | InstantMed",
    description:
      "UTI symptom assessment online. Secure form-first doctor review with clear in-person care boundaries.",
    url: "https://instantmed.com.au/uti-assessment-online",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "UTI Assessment Online Australia | InstantMed",
    description: "Secure UTI symptom assessment reviewed by an Australian doctor.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/uti-assessment-online",
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="UTI Assessment Online Australia"
        description={`UTI symptom assessment from an AHPRA-registered Australian doctor. From ${PRICING_DISPLAY.WOMENS_HEALTH}. Start with a secure form. A doctor reviews it and decides what is clinically appropriate.`}
        url="/uti-assessment-online"
      />
      <FAQSchema faqs={[...WOMENS_HEALTH_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Women's Health Assessment", url: "https://instantmed.com.au/womens-health" },
          { name: "UTI Assessment", url: "https://instantmed.com.au/uti-assessment-online" },
        ]}
      />
      <MedicalServiceSchema
        name="Online UTI Assessment"
        description="UTI symptom assessment from an AHPRA-registered Australian doctor. Next steps are decided after clinical review."
        price={PRICING.WOMENS_HEALTH.toFixed(2)}
      />
      <HealthArticleSchema
        title="UTI Assessment Online Australia"
        description={`UTI symptom assessment from an AHPRA-registered Australian doctor. Secure form-first review. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`}
        url="/uti-assessment-online"
      />
      <WomensHealthLanding intent="uti" />
    </>
  )
}
