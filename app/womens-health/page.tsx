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
  title: { absolute: "Women's Health Assessment | UTI + Pill Online | InstantMed" },
  description: `UTI and contraceptive pill assessment from an Australian doctor. Fill out a secure form, no booked appointment or waiting room. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`,
  keywords: [
    "uti assessment online australia",
    "online uti treatment australia",
    "womens health assessment online",
    "contraceptive pill online australia",
    "online doctor uti",
    "telehealth womens health australia",
  ],
  openGraph: {
    title: "Women's Health Assessment | UTI + Pill Online | InstantMed",
    description: "UTI and contraceptive pill assessment online. Fill out a secure form, no booked appointment or waiting room. Reviewed by an Australian doctor.",
    url: "https://instantmed.com.au/womens-health",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Women's Health Assessment Online Australia | InstantMed",
    description: "UTI and contraceptive pill assessment online. Secure form-first doctor review.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/womens-health",
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="Women's Health Assessment Online Australia"
        description={`UTI and contraceptive pill assessment from an AHPRA-registered Australian doctor. From ${PRICING_DISPLAY.WOMENS_HEALTH}. Start with a private online form. A doctor reviews it and decides what is clinically appropriate.`}
        url="/womens-health"
      />
      <FAQSchema faqs={[...WOMENS_HEALTH_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Women's Health Assessment", url: "https://instantmed.com.au/womens-health" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Women's Health Assessment"
        description="UTI and contraceptive pill assessment from an AHPRA-registered Australian doctor. Next steps are decided after clinical review."
        price={PRICING.WOMENS_HEALTH.toFixed(2)}
      />
      <HealthArticleSchema
        title="Women's Health Assessment Online Australia"
        description={`UTI and contraceptive pill assessment from an AHPRA-registered Australian doctor. Secure form-first review. From ${PRICING_DISPLAY.WOMENS_HEALTH}.`}
        url="/womens-health"
      />
      <WomensHealthLanding />
    </>
  )
}
