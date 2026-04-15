import type { Metadata } from "next"

import { BreadcrumbSchema, OrganizationSchema } from "@/components/seo"

import { AboutClient } from "./about-client"

// ISR: Revalidate about page every 24 hours (static content)
export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "About InstantMed | Australia's Online Doctor Service" },
  description: "InstantMed is an Australian telehealth platform. See a doctor online — no waiting room, no call, just a form. AHPRA-registered doctors, 100% online.",
  openGraph: {
    title: "About InstantMed | Australia's Online Doctor Service",
    description: "See a doctor online without the waiting room. Med certs, prescriptions, and consultations from AHPRA-registered Australian doctors.",
    url: "https://instantmed.com.au/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About InstantMed | Australia's Online Doctor Service",
    description: "See a doctor online without the waiting room. Med certs, prescriptions, and consultations from AHPRA-registered Australian doctors.",
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
