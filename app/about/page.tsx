import type { Metadata } from "next"
import { AboutClient } from "./about-client"

export const metadata: Metadata = {
  title: "About Us",
  description: "InstantMed is an Australian telehealth platform connecting patients with AHPRA-registered doctors for medical certificates, prescriptions, and consultations.",
  openGraph: {
    title: "About InstantMed | Australian Telehealth",
    description: "Learn about InstantMed - connecting Australians with AHPRA-registered doctors for fast, secure online healthcare.",
  },
}

export default function AboutPage() {
  return <AboutClient />
}
