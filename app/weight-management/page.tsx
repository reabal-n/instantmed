import type { Metadata } from "next"
import { WeightManagementClient } from "./weight-management-client"

export const metadata: Metadata = {
  title: "Weight Management | Doctor-Supervised Programs",
  description:
    "Achieve sustainable results with doctor-supervised weight management. Personalised treatment plans and ongoing support from AHPRA-registered Australian GPs.",
  keywords: [
    "weight management australia",
    "doctor supervised weight management",
    "healthy weight program",
    "telehealth weight management",
    "weight management support online",
  ],
  openGraph: {
    title: "Weight Management | Doctor-Supervised Programs | InstantMed",
    description:
      "Doctor-supervised weight management programs with personalised plans and ongoing GP support.",
    url: "https://instantmed.com.au/weight-management",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Management | InstantMed",
    description: "Doctor-supervised weight management programs with personalised treatment plans.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-management",
  },
}

export default function WeightManagementPage() {
  return <WeightManagementClient />
}
