import type { Metadata } from "next"
import { AboutClient } from "./about-client"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

// ISR: Revalidate about page every 24 hours (static content)
export const revalidate = 86400

export const metadata: Metadata = {
  title: "About Us | Australian Online Doctors",
  description: "Australian telehealth platform connecting patients with AHPRA-registered doctors for medical certificates, medication, and consultations. 100% online.",
  openGraph: {
    title: "About InstantMed | Australian Online Doctors",
    description: "Connecting Australians with AHPRA-registered doctors for secure online healthcare. Med certs, medication, and consultations.",
    url: "https://instantmed.com.au/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About InstantMed | Australian Online Doctors",
    description: "Connecting Australians with AHPRA-registered doctors for secure online healthcare. Med certs, medication, and consultations.",
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
      <AboutClient />
    </>
  )
}
