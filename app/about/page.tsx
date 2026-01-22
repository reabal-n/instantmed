import type { Metadata } from "next"
import { AboutClient } from "./about-client"

// ISR: Revalidate about page every 24 hours (static content)
export const revalidate = 86400

export const metadata: Metadata = {
  title: "About Us",
  description: "InstantMed is an Australian telehealth platform connecting patients with AHPRA-registered doctors for medical certificates, prescriptions, and consultations.",
  openGraph: {
    title: "About InstantMed | Australian Telehealth",
    description: "Learn about InstantMed - connecting Australians with AHPRA-registered doctors for fast, secure online healthcare.",
    url: "https://instantmed.com.au/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About InstantMed | Australian Telehealth",
    description: "Learn about InstantMed - connecting Australians with AHPRA-registered doctors for fast, secure online healthcare.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/about",
  },
}

export default function AboutPage() {
  return <AboutClient />
}
