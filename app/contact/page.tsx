import type { Metadata } from "next"

import { BreadcrumbSchema } from "@/components/seo"

import { ContactClient } from "./contact-client"

const SEARCH_DESCRIPTION = "Need help with an existing request, certificate, payment or account? Contact InstantMed by email, voice message or secure form. For medical emergencies, call 000."

export const metadata: Metadata = {
  title: { absolute: "Contact InstantMed Support | Requests, Payments & Accounts" },
  description: SEARCH_DESCRIPTION,
  openGraph: {
    title: "Contact InstantMed Support",
    description: SEARCH_DESCRIPTION,
    url: "https://instantmed.com.au/contact",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact InstantMed Support",
    description: SEARCH_DESCRIPTION,
  },
  alternates: {
    canonical: "https://instantmed.com.au/contact",
  },
}

export const revalidate = 86400 // AUDIT FIX: Explicit ISR for static marketing pages

export default function ContactPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Contact", url: "https://instantmed.com.au/contact" },
        ]}
      />
      <ContactClient />
    </>
  )
}
