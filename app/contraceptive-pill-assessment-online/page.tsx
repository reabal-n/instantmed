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
import { PILL_FAQ } from "@/lib/data/womens-health-faq"

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
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Contraceptive Pill Assessment Online"
        description={`Start or switch the contraceptive pill after AHPRA-registered Australian doctor review. From ${PRICING_DISPLAY.WOMENS_HEALTH}. The doctor reviews your safety screen and decides what is clinically appropriate.`}
        url="/contraceptive-pill-assessment-online"
      />
      <FAQSchema faqs={[...PILL_FAQ]} />
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
      <MedicalServiceSchema
        name="Online Contraceptive Pill Assessment"
        description="Start or switch the contraceptive pill after AHPRA-registered Australian doctor review. Next steps are decided after clinical review."
        price={PRICING.WOMENS_HEALTH.toFixed(2)}
      />
      <HealthArticleSchema
        title="Contraceptive Pill Assessment Online"
        description={`Start or switch the contraceptive pill after AHPRA-registered Australian doctor review. Secure form-first review. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`}
        url="/contraceptive-pill-assessment-online"
      />
      <WomensHealthLanding intent="pill" />
    </>
  )
}
