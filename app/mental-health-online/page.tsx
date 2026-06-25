import type { Metadata } from "next"

import { MentalHealthOnlineLanding } from "@/components/marketing/mental-health-online-landing"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
} from "@/components/seo"
import { getArticleVisualsForRender } from "@/lib/blog/visuals"
import { MENTAL_HEALTH_ONLINE_FAQ } from "@/lib/data/mental-health-online-faq"

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Mental Health Online Australia | Crisis And Care Boundaries | InstantMed" },
  description:
    "Mental health online in Australia: what telehealth can help with, crisis red flags, GP and Medicare pathways, workplace certificate boundaries, and InstantMed's short-certificate scope.",
  keywords: [
    "mental health online australia",
    "online mental health support australia",
    "mental health medical certificate online",
    "mental health day certificate online",
    "telehealth mental health australia",
  ],
  openGraph: {
    title: "Mental Health Online Australia | Crisis And Care Boundaries | InstantMed",
    description:
      "A practical Australian guide to online mental health support, urgent-care boundaries, Better Access, workplace certificates, and safe next steps.",
    url: "https://instantmed.com.au/mental-health-online",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mental Health Online Australia | InstantMed",
    description:
      "Australian guide to online mental health support, crisis pathways, GP care, Medicare context, and short certificate boundaries.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/mental-health-online",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  const visuals = getArticleVisualsForRender("mental-health-online")

  return (
    <>
      <FAQSchema faqs={[...MENTAL_HEALTH_ONLINE_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Mental Health Online", url: "https://instantmed.com.au/mental-health-online" },
        ]}
      />
      <HealthArticleSchema
        title="Mental Health Online Australia"
        description="How online mental health support works in Australia, including crisis boundaries, GP and Medicare pathways, workplace certificate evidence, privacy, and InstantMed's short medical certificate scope."
        url="/mental-health-online"
        lastReviewed="2026-06"
      />
      <MentalHealthOnlineLanding visuals={visuals} />
    </>
  )
}
