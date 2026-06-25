import type { Metadata } from "next"

import { WeightLossOnlineLanding } from "@/components/marketing/weight-loss-online-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  SpeakableSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { WEIGHT_LOSS_ONLINE_FAQ } from "@/lib/data/weight-loss-online-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Weight Loss Online Australia | Safe Review Boundaries | InstantMed" },
  description:
    "Weight loss online in Australia: what safe weight-management review involves, what needs in-person care, Medicare and PBS boundaries, and why InstantMed is not currently accepting requests.",
  keywords: [
    "weight loss online australia",
    "online weight management australia",
    "weight management doctor online",
    "telehealth weight management australia",
    "obesity management online australia",
  ],
  openGraph: {
    title: "Weight Loss Online Australia | Safe Review Boundaries | InstantMed",
    description:
      "A practical Australian guide to weight-management telehealth, red flags, in-person care boundaries, Medicare and PBS context, and safe alternatives.",
    url: "https://instantmed.com.au/weight-loss-online",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Loss Online Australia | InstantMed",
    description:
      "Medicine-neutral Australian guide to online weight-management review, safety boundaries, and when in-person care is safer.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-loss-online",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("weight-loss-online")

  return (
    <>
      <SpeakableSchema
        name="Weight Loss Online Australia"
        description="Weight loss online in Australia: what safe weight-management review involves, what needs in-person care, and why InstantMed is not currently accepting weight-management treatment requests."
        url="/weight-loss-online"
        speakableSelectors={["h1", "[data-speakable]"]}
      />
      <FAQSchema faqs={[...WEIGHT_LOSS_ONLINE_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Weight Loss Online", url: "https://instantmed.com.au/weight-loss-online" },
        ]}
      />
      <HealthArticleSchema
        title="Weight Loss Online Australia"
        description="How online weight-management review works in Australia, including clinical suitability, in-person care boundaries, red flags, Medicare and PBS context, safe alternatives, and why InstantMed is not currently accepting weight-management treatment requests."
        url="/weight-loss-online"
        lastReviewed="2026-06"
      />
      <WeightLossOnlineLanding visuals={visuals} />
    </>
  )
}
