import type { Metadata } from "next"

import { ContraceptivePillAssessmentLanding } from "@/components/marketing/contraceptive-pill-assessment-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { PRICING_DISPLAY, PRICING_SCHEMA } from "@/lib/constants"
import { PILL_LANDING_FAQ } from "@/lib/data/womens-health-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Contraceptive Pill Assessment Online | InstantMed" },
  description: `Start or switch the contraceptive pill after Australian doctor review. Secure form-first assessment, no booked appointment. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`,
  keywords: [
    "contraceptive pill assessment online",
    "contraceptive pill online australia",
    "pill prescription online australia",
    "start contraceptive pill online",
    "switch contraceptive pill online",
  ],
  openGraph: {
    title: "Contraceptive Pill Assessment Online | InstantMed",
    description:
      "Start or switch the contraceptive pill after secure form-first review by an Australian doctor.",
    url: "https://instantmed.com.au/contraceptive-pill-assessment-online",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contraceptive Pill Assessment Online | InstantMed",
    description: "Secure contraception assessment reviewed by an Australian doctor.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/contraceptive-pill-assessment-online",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("contraceptive-pill-assessment-online")

  return (
    <>
      <SpeakableSchema
        name="Contraceptive Pill Assessment Online"
        description={`Start or switch the contraceptive pill after AHPRA-registered Australian doctor review. From ${PRICING_DISPLAY.WOMENS_HEALTH}. The doctor reviews your safety screen and decides what is clinically appropriate.`}
        url="/contraceptive-pill-assessment-online"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...PILL_LANDING_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Women's Health Assessment", url: "https://instantmed.com.au/womens-health" },
          {
            name: "Contraceptive Pill Assessment",
            url: "https://instantmed.com.au/contraceptive-pill-assessment-online",
          },
        ]}
      />
      <ServiceSchema
        name="Online Contraceptive Pill Assessment"
        description="Start or switch the contraceptive pill after AHPRA-registered Australian doctor review. Next steps are decided after clinical review."
        price={PRICING_SCHEMA.WOMENS_HEALTH}
        url="/contraceptive-pill-assessment-online"
      />
      <HealthArticleSchema
        title="Contraceptive Pill Assessment Online"
        description={`Start or switch the contraceptive pill after AHPRA-registered Australian doctor review. Secure form-first review. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`}
        url="/contraceptive-pill-assessment-online"
        lastReviewed="2026-06"
      />
      <ContraceptivePillAssessmentLanding visuals={visuals} />
    </>
  )
}
