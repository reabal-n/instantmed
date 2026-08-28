import type { Metadata } from "next"

import { HairLossLanding } from "@/components/marketing/hair-loss-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING_DISPLAY, PRICING_SCHEMA } from "@/lib/constants"
import { HAIR_LOSS_LANDING_FAQ } from "@/lib/data/hair-loss-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Private Hair Loss Assessment | Doctor Review | InstantMed" },
  description: `A private one-off hair loss assessment from an Australian doctor. Complete a secure form for doctor review. From ${PRICING_DISPLAY.HAIR_LOSS}. Prescription is not guaranteed.`,
  keywords: [
    "hair loss assessment australia",
    "hair loss assessment online",
    "telehealth hair loss consultation",
    "hair loss doctor online",
    "male pattern hair loss assessment",
    "androgenetic alopecia assessment",
  ],
  openGraph: {
    title: "Private Hair Loss Assessment | Doctor Review | InstantMed",
    description:
      "A private one-off hair loss assessment. Complete a secure form for Australian doctor review. Prescription is not guaranteed.",
    url: "https://instantmed.com.au/hair-loss",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Hair Loss Assessment | InstantMed",
    description: "A private one-off hair loss assessment, reviewed by an Australian doctor.",
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
        description={`Discreet, doctor-led hair loss assessment from an AHPRA-registered Australian doctor. From ${PRICING_DISPLAY.HAIR_LOSS}. Start with a private online form. A doctor reviews it and may call you briefly before prescribing.`}
        url="/hair-loss"
      />
      <FAQSchema faqs={[...HAIR_LOSS_LANDING_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Hair Loss Assessment", url: "https://instantmed.com.au/hair-loss" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Hair Loss Assessment"
        description="Discreet hair loss assessment from an AHPRA-registered Australian doctor. Next steps are decided after clinical review."
        price={PRICING_SCHEMA.HAIR_LOSS}
      />
      <HealthArticleSchema
        title="Hair Loss Assessment Online Australia"
        description={`Doctor-led hair loss assessment from an AHPRA-registered Australian doctor. Discreet form-first review. From ${PRICING_DISPLAY.HAIR_LOSS}.`}
        url="/hair-loss"
      />
      <HairLossLanding />
    </>
  )
}
