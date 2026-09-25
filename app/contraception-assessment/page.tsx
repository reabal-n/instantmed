import type { Metadata } from "next"

import { ContraceptionAssessmentLanding } from "@/components/marketing/contraception-assessment-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING_DISPLAY, PRICING_SCHEMA } from "@/lib/constants"
import { CONTRACEPTION_LANDING_FAQ } from "@/lib/data/womens-health-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Contraception Assessment Online | InstantMed" },
  description: `Contraception assessment with Australian doctor review. Secure form-first assessment, no booked appointment. One-off review fee: ${PRICING_DISPLAY.WOMENS_HEALTH}.`,
  keywords: ["contraception assessment online", "online contraception doctor"],
  openGraph: {
    title: "Contraception Assessment Online | InstantMed",
    description:
      "Contraception assessment with secure form-first review by an Australian doctor.",
    url: "https://instantmed.com.au/contraception-assessment",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contraception Assessment Online | InstantMed",
    description: "Secure contraception assessment reviewed by an Australian doctor.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/contraception-assessment",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Contraception Assessment Online"
        description={`Contraception assessment with AHPRA-registered Australian doctor review. One-off review fee: ${PRICING_DISPLAY.WOMENS_HEALTH}. The doctor reviews your safety screen and decides what is clinically appropriate.`}
        url="/contraception-assessment"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...CONTRACEPTION_LANDING_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Women's Health Assessment", url: "https://instantmed.com.au/womens-health" },
          {
            name: "Contraception Assessment",
            url: "https://instantmed.com.au/contraception-assessment",
          },
        ]}
      />
      <ServiceSchema
        name="Online Contraception Assessment"
        description="Contraception assessment with AHPRA-registered Australian doctor review. Next steps are decided after clinical review."
        price={PRICING_SCHEMA.WOMENS_HEALTH}
        url="/contraception-assessment"
      />
      <ContraceptionAssessmentLanding />
    </>
  )
}
