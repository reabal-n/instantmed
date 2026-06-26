import type { Metadata } from "next"

import { OnlinePrescriptionsLanding } from "@/components/marketing/online-prescriptions-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  ServiceSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { PRICING_DISPLAY } from "@/lib/constants"
import { ONLINE_PRESCRIPTIONS_FAQ } from "@/lib/data/online-prescriptions-faq"

export const revalidate = 86400

const reviewPrice = PRICING_DISPLAY.REPEAT_SCRIPT.replace("$", "")

export const metadata: Metadata = {
  title: { absolute: "Online Prescriptions Australia | Doctor Review | InstantMed" },
  description: `Online prescriptions in Australia for existing regular medicines. A doctor reviews your repeat request and decides what is clinically appropriate. From ${PRICING_DISPLAY.REPEAT_SCRIPT}.`,
  keywords: [
    "online prescriptions australia",
    "online prescription australia",
    "repeat prescription online australia",
    "online repeat prescription",
    "escript australia",
    "repeat medication review online",
    "telehealth prescription australia",
  ],
  openGraph: {
    title: "Online Prescriptions Australia | Doctor Review | InstantMed",
    description:
      "A practical Australian guide to online repeat prescription review, eScripts, PBS, safety boundaries, and when in-person care is safer.",
    url: "https://instantmed.com.au/online-prescriptions",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Prescriptions Australia | InstantMed",
    description: "Repeat prescription review online. Doctor-reviewed, medicine-neutral, and safety-led.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/online-prescriptions",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("online-prescriptions")

  return (
    <>
      <SpeakableSchema
        name="Online Prescriptions Australia"
        description={`Online prescriptions in Australia for existing regular medicines. A repeat prescription review costs ${PRICING_DISPLAY.REPEAT_SCRIPT}. An AHPRA-registered Australian doctor reviews the request and decides whether prescribing is clinically appropriate.`}
        url="/online-prescriptions"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...ONLINE_PRESCRIPTIONS_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Online Prescriptions", url: "https://instantmed.com.au/online-prescriptions" },
        ]}
      />
      <ServiceSchema
        name="Online Repeat Prescription Review"
        description="Repeat prescription review for existing regular medicines, reviewed by an AHPRA-registered Australian doctor. Prescription only if clinically appropriate."
        price={reviewPrice}
        url="/online-prescriptions"
      />
      <HealthArticleSchema
        title="Online Prescriptions Australia"
        description={`How online prescription requests work in Australia, including repeat prescription suitability, doctor review, eScripts, PBS, Medicare, safety boundaries, and in-person care limits. From ${PRICING_DISPLAY.REPEAT_SCRIPT}.`}
        url="/online-prescriptions"
        lastReviewed="2026-06"
      />
      <OnlinePrescriptionsLanding visuals={visuals} />
    </>
  )
}
