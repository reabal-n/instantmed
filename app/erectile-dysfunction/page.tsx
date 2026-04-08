import type { Metadata } from "next"
import { ErectileDysfunctionLanding } from "@/components/marketing/erectile-dysfunction-landing"
import {
  SpeakableSchema,
  FAQSchema,
  BreadcrumbSchema,
  MedicalServiceSchema,
  ReviewAggregateSchema,
} from "@/components/seo/healthcare-schema"
import { ED_FAQ } from "@/lib/data/ed-faq"
import { PRICING } from "@/lib/constants"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "ED Treatment Online Australia | Doctor-Reviewed | InstantMed",
  description: `Discreet ED treatment from an AHPRA-registered Australian doctor. No call needed. Reviewed within 1–2 hours. From $${PRICING.MENS_HEALTH.toFixed(2)}.`,
  keywords: [
    "ed treatment online australia",
    "erectile dysfunction treatment online",
    "ed medication online",
    "online doctor ed",
    "telehealth ed australia",
    "discreet ed treatment",
  ],
  openGraph: {
    title: "ED Treatment Online Australia | InstantMed",
    description: "Doctor-reviewed ED treatment, no call needed. From an AHPRA-registered Australian doctor.",
    url: "https://instantmed.com.au/erectile-dysfunction",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "ED Treatment Online Australia | InstantMed",
    description: "Doctor-reviewed ED treatment, no call needed.",
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
        description={`Discreet, doctor-reviewed ED treatment from an AHPRA-registered Australian doctor. From $${PRICING.MENS_HEALTH.toFixed(2)}. No call needed.`}
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
        description="Discreet erectile dysfunction assessment and treatment from an AHPRA-registered Australian doctor. No call needed."
        price={PRICING.MENS_HEALTH.toFixed(2)}
      />
      <ReviewAggregateSchema ratingValue={4.8} reviewCount={49} />
      <ErectileDysfunctionLanding />
    </>
  )
}
