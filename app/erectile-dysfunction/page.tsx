import type { Metadata } from "next"

import { ErectileDysfunctionLanding } from "@/components/marketing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING } from "@/lib/constants"
import { ED_FAQ } from "@/lib/data/ed-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "ED Assessment | Private, No Waiting Room | InstantMed" },
  description: `Discreet ED assessment from an Australian doctor. Fill out a secure form, no booked appointment or waiting room. Reviewed within 1-2 hours. From $${PRICING.MENS_HEALTH.toFixed(2)}.`,
  keywords: [
    "ed treatment online australia",
    "erectile dysfunction treatment online",
    "ed medication online",
    "online doctor ed",
    "telehealth ed australia",
    "discreet ed treatment",
  ],
  openGraph: {
    title: "ED Assessment | Private, No Waiting Room | InstantMed",
    description: "Discreet ED assessment online. Fill out a secure form, no booked appointment or waiting room. Reviewed by an Australian doctor.",
    url: "https://instantmed.com.au/erectile-dysfunction",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "ED Assessment Online Australia | InstantMed",
    description: "Discreet ED assessment online. Secure form-first doctor review.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/erectile-dysfunction",
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="ED Treatment Online Australia"
        description={`Discreet, doctor-reviewed ED assessment from an AHPRA-registered Australian doctor. From $${PRICING.MENS_HEALTH.toFixed(2)}. The doctor contacts you if clinically needed.`}
        url="/erectile-dysfunction"
      />
      <FAQSchema faqs={[...ED_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "ED Treatment", url: "https://instantmed.com.au/erectile-dysfunction" },
        ]}
      />
      <MedicalServiceSchema
        name="Online ED Treatment"
        description="Discreet erectile dysfunction assessment from an AHPRA-registered Australian doctor. Prescription only if clinically appropriate."
        price={PRICING.MENS_HEALTH.toFixed(2)}
      />
      <HealthArticleSchema
        title="ED Treatment Online Australia"
        description={`Discreet ED assessment from an AHPRA-registered Australian doctor. Reviewed within 1-2 hours. From $${PRICING.MENS_HEALTH.toFixed(2)}.`}
        url="/erectile-dysfunction"
      />
      <ErectileDysfunctionLanding />
    </>
  )
}
