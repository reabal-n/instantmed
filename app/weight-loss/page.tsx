import type { Metadata } from "next"
import { WeightLossClient } from "./weight-loss-client"

export const metadata: Metadata = {
  title: "Weight Management | Doctor-Guided Programs",
  description:
    "Personalised weight management plans with ongoing doctor support. Start with a confidential online assessment from AHPRA-registered Australian doctors.",
  keywords: [
    "weight management australia",
    "doctor supervised weight management",
    "weight management program online",
    "telehealth weight management australia",
    "healthy weight support",
  ],
  openGraph: {
    title: "Weight Management | Doctor-Guided Programs | InstantMed",
    description:
      "Personalised weight management plans with ongoing doctor support. AHPRA-registered Australian doctors.",
    url: "https://instantmed.com.au/weight-loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Management | InstantMed",
    description: "Doctor-guided weight management programs with personalised support.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-loss",
  },
}

export default function WeightLossPage() {
  return <WeightLossClient />
}
