import type { Metadata } from "next"

import { OnlinePrescriptionsLanding } from "@/components/marketing/online-prescriptions-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { ONLINE_PRESCRIPTIONS_FAQ } from "@/lib/data/online-prescriptions-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "How Online Prescriptions Work in Australia | InstantMed" },
  description:
    "Learn how online prescription requests work in Australia, including doctor review, eScripts, PBS, Medicare, safety checks, and when in-person care is needed.",
  keywords: [
    "how online prescriptions work australia",
    "online prescriptions australia",
    "escript australia",
    "online prescription safety",
    "pbs online prescriptions",
    "telehealth prescription rules australia",
  ],
  openGraph: {
    title: "How Online Prescriptions Work in Australia | InstantMed",
    description:
      "A practical Australian guide to doctor review, eScripts, PBS, Medicare, safety boundaries, and when in-person care is safer.",
    url: "https://instantmed.com.au/online-prescriptions",
    type: "article",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Online Prescriptions Work in Australia | InstantMed",
    description:
      "A practical guide to online prescription review, eScripts, PBS, Medicare, and safety boundaries.",
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
        name="How Online Prescriptions Work in Australia"
        description="A practical guide to online prescription requests in Australia, including doctor review, eScripts, PBS, Medicare, safety checks, and when in-person care is needed."
        url="/online-prescriptions"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...ONLINE_PRESCRIPTIONS_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          {
            name: "How Online Prescriptions Work",
            url: "https://instantmed.com.au/online-prescriptions",
          },
        ]}
      />
      <HealthArticleSchema
        title="How Online Prescriptions Work in Australia"
        description="How online prescription requests work in Australia, including repeat prescription suitability, doctor review, eScripts, PBS, Medicare, safety boundaries, and in-person care limits."
        url="/online-prescriptions"
        lastReviewed="2026-07"
      />
      <OnlinePrescriptionsLanding visuals={visuals} />
    </>
  )
}
