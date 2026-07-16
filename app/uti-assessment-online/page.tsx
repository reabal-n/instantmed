import type { Metadata } from "next"

import { UtiAssessmentLanding } from "@/components/marketing/uti-assessment-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { UTI_LANDING_FAQ } from "@/lib/data/womens-health-faq"

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
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("uti-assessment-online")

  return (
    <>
      <SpeakableSchema
        name="UTI Assessment Online Australia"
        description={`UTI symptom assessment from an AHPRA-registered Australian doctor. From ${PRICING_DISPLAY.WOMENS_HEALTH}. Start with a secure form. A doctor reviews it and decides what is clinically appropriate.`}
        url="/uti-assessment-online"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...UTI_LANDING_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Women's Health Assessment", url: "https://instantmed.com.au/womens-health" },
          { name: "UTI Assessment", url: "https://instantmed.com.au/uti-assessment-online" },
        ]}
      />
      <ServiceSchema
        name="Online UTI Assessment"
        description="UTI symptom assessment from an AHPRA-registered Australian doctor. Next steps are decided after clinical review."
        price={PRICING.WOMENS_HEALTH.toFixed(2)}
        url="/uti-assessment-online"
      />
      <HealthArticleSchema
        title="UTI Assessment Online Australia"
        description={`UTI symptom assessment from an AHPRA-registered Australian doctor. Secure form-first review. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`}
        url="/uti-assessment-online"
        lastReviewed="2026-06"
      />
      <UtiAssessmentLanding visuals={visuals} />
    </>
  )
}
