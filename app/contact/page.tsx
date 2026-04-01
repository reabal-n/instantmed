import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { ContactClient } from "./contact-client"

export const metadata: Metadata = {
  title: "Contact Us | Telehealth Support",
  description: "Get in touch with InstantMed. Our support team helps with medical certificates, prescriptions, and telehealth questions. Available 7 days.",
  openGraph: {
    title: "Contact InstantMed | Get Support",
    description: "Contact our support team for help with telehealth services, medical certificates, and prescriptions.",
    url: "https://instantmed.com.au/contact",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact InstantMed | Get Support",
    description: "Contact our support team for help with telehealth services, medical certificates, and prescriptions.",
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
