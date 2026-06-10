import type { Metadata } from "next"

import { HairLossLanding } from "@/components/marketing/hair-loss-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING } from "@/lib/constants"
import { HAIR_LOSS_FAQ } from "@/lib/data/hair-loss-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Hair Loss Assessment | Doctor Review | InstantMed" },
  description: `Hair loss assessment from an Australian doctor. Fill out a secure form, no booked appointment or clinic visit. From $${PRICING.HAIR_LOSS.toFixed(2)}.`,
  keywords: [
    "hair loss assessment australia",
    "hair loss assessment online",
    "telehealth hair loss consultation",
    "hair loss doctor online",
    "male pattern hair loss assessment",
    "androgenetic alopecia assessment",
  ],
  openGraph: {
    title: "Hair Loss Assessment | Doctor Review | InstantMed",
    description:
      "Hair loss assessment online. Fill out a secure form, no booked appointment or clinic visit. Reviewed by an Australian doctor.",
    url: "https://instantmed.com.au/hair-loss",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hair Loss Assessment Online Australia | InstantMed",
    description: "Doctor-reviewed hair loss assessment, form-first and private.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/hair-loss",
  },
}

export default function HairLossPage() {
  return (
    <>
      <SpeakableSchema
        name="Hair Loss Assessment Online Australia"
        description={`Discreet, doctor-led hair loss assessment from an AHPRA-registered Australian doctor. From $${PRICING.HAIR_LOSS.toFixed(2)}. Start with a private online form. A doctor reviews it and may call you briefly before prescribing.`}
        url="/hair-loss"
      />
      <FAQSchema faqs={[...HAIR_LOSS_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Hair Loss Assessment", url: "https://instantmed.com.au/hair-loss" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Hair Loss Assessment"
        description="Discreet hair loss assessment from an AHPRA-registered Australian doctor. Next steps are decided after clinical review."
        price={PRICING.HAIR_LOSS.toFixed(2)}
      />
      <HealthArticleSchema
        title="Hair Loss Assessment Online Australia"
        description={`Doctor-led hair loss assessment from an AHPRA-registered Australian doctor. Discreet form-first review. From $${PRICING.HAIR_LOSS.toFixed(2)}.`}
        url="/hair-loss"
      />
      <HairLossLanding />
    </>
  )
}
