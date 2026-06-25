import type { Metadata } from "next"

import { MensHealthLanding } from "@/components/marketing/mens-health-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { PRICING_DISPLAY } from "@/lib/constants"
import { MENS_HEALTH_FAQ } from "@/lib/data/mens-health-faq"

export const revalidate = 86400

const reviewPrice = PRICING_DISPLAY.MENS_HEALTH.replace("$", "")

export const metadata: Metadata = {
  title: { absolute: "Men's Health Online Australia | ED + Hair Loss Review | InstantMed" },
  description: `Men's health online in Australia for ED and hair loss concerns. Secure form-first doctor review, clear red flags and in-person care boundaries. From ${PRICING_DISPLAY.MENS_HEALTH}.`,
  keywords: [
    "mens health online australia",
    "men's health online australia",
    "online men's health doctor",
    "ed assessment online australia",
    "hair loss assessment online australia",
    "men's health telehealth australia",
  ],
  openGraph: {
    title: "Men's Health Online Australia | ED + Hair Loss Review | InstantMed",
    description:
      "A practical Australian guide to online men's health assessment for ED and hair loss, including costs, safety boundaries, red flags, and when in-person care is safer.",
    url: "https://instantmed.com.au/mens-health",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Men's Health Online Australia | InstantMed",
    description: "ED and hair-loss doctor review online. Medicine-neutral, safety-led, and Australia-specific.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/mens-health",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("mens-health")

  return (
    <>
      <SpeakableSchema
        name="Men's Health Online Australia"
        description={`Online men's health assessment in Australia for ED and hair loss concerns. From ${PRICING_DISPLAY.MENS_HEALTH}. An AHPRA-registered Australian doctor reviews the request and decides what is clinically appropriate.`}
        url="/mens-health"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...MENS_HEALTH_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Men's Health", url: "https://instantmed.com.au/mens-health" },
        ]}
      />
      <ServiceSchema
        name="Online Men's Health Doctor Review"
        description="Online doctor review for erectile dysfunction and hair loss concerns in Australia. Prescription only if clinically appropriate after review."
        price={reviewPrice}
        url="/mens-health"
      />
      <HealthArticleSchema
        title="Men's Health Online Australia"
        description={`How online men's health assessment works in Australia for ED and hair loss concerns, including eligibility, costs, safety boundaries, red flags, PBS and pharmacy context, and when in-person care is safer. From ${PRICING_DISPLAY.MENS_HEALTH}.`}
        url="/mens-health"
        lastReviewed="2026-06"
      />
      <MensHealthLanding visuals={visuals} />
    </>
  )
}
