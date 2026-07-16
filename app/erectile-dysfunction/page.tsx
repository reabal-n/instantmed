import type { Metadata } from "next"

import { ErectileDysfunctionLanding } from "@/components/marketing/erectile-dysfunction-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { ED_LANDING_FAQ } from "@/lib/data/ed-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Erectile Dysfunction Assessment Online Australia | InstantMed" },
  description: `Private erectile dysfunction assessment from an Australian doctor. Start with a secure safety form, no booked waiting room. From ${PRICING_DISPLAY.MENS_HEALTH}.`,
  keywords: [
    "ed assessment online australia",
    "erectile dysfunction assessment online",
    "mens health assessment online",
    "online doctor ed",
    "telehealth ed australia",
    "discreet ed assessment",
  ],
  openGraph: {
    title: "Erectile Dysfunction Assessment Online Australia | InstantMed",
    description:
      "Private ED assessment online with Australian doctor review, safety screening, and clear in-person care boundaries.",
    url: "https://instantmed.com.au/erectile-dysfunction",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "ED Assessment Online Australia | InstantMed",
    description: "Private ED assessment online. Secure form-first doctor review.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/erectile-dysfunction",
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
        name="Erectile Dysfunction Assessment Online Australia"
        description={`Private erectile dysfunction assessment from an AHPRA-registered Australian doctor. From ${PRICING_DISPLAY.MENS_HEALTH}. Start with a secure form. A doctor reviews it and decides what is clinically appropriate.`}
        url="/erectile-dysfunction"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...ED_LANDING_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "ED Assessment", url: "https://instantmed.com.au/erectile-dysfunction" },
        ]}
      />
      <ServiceSchema
        name="Online Erectile Dysfunction Assessment"
        description="Private erectile dysfunction assessment from an AHPRA-registered Australian doctor. Next steps are decided after clinical review."
        price={PRICING.MENS_HEALTH.toFixed(2)}
        url="/erectile-dysfunction"
      />
      <HealthArticleSchema
        title="Erectile Dysfunction Assessment Online Australia"
        description={`Private ED assessment from an AHPRA-registered Australian doctor. Secure form-first review. From ${PRICING_DISPLAY.MENS_HEALTH}.`}
        url="/erectile-dysfunction"
        lastReviewed="2026-06"
      />
      <ErectileDysfunctionLanding />
    </>
  )
}
