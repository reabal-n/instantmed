import type { Metadata } from "next"

import { BreadcrumbSchema, OrganizationSchema } from "@/components/seo"

import { AboutClient } from "./about-client"

// ISR: Revalidate about page every 24 hours (static content)
export const revalidate = 86400

const SEARCH_DESCRIPTION = "Learn how InstantMed handles medical certificates, repeat medication and focused assessments, including doctor review, privacy and clinical limits."

export const metadata: Metadata = {
  title: { absolute: "About InstantMed | Australian Telehealth, Clearly Explained" },
  description: SEARCH_DESCRIPTION,
  openGraph: {
    title: "About InstantMed | Australian Telehealth, Clearly Explained",
    description: SEARCH_DESCRIPTION,
    url: "https://instantmed.com.au/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About InstantMed | Australian Telehealth, Clearly Explained",
    description: SEARCH_DESCRIPTION,
  },
  alternates: {
    canonical: "https://instantmed.com.au/about",
  },
}

export default function AboutPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "About", url: "https://instantmed.com.au/about" },
        ]}
      />
      <OrganizationSchema />
      <AboutClient />
    </>
  )
}
