import type { Metadata } from "next"

import { WeightLossClient } from "./weight-loss-client"

export const metadata: Metadata = {
  title: { absolute: "Weight Loss Treatment | Online, No Clinic | InstantMed" },
  description:
    "Doctor-supported weight loss online. Start with a confidential assessment. No clinic visit, no in-person appointment.",
  keywords: [
    "weight management australia",
    "doctor supervised weight management",
    "weight management program online",
    "telehealth weight management australia",
    "healthy weight support",
  ],
  openGraph: {
    title: "Weight Loss Treatment | Online, No Clinic | InstantMed",
    description:
      "Doctor-supported weight loss. Start with an online assessment, no clinic visit needed.",
    url: "https://instantmed.com.au/weight-loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Loss Treatment | Online, No Clinic | InstantMed",
    description: "Doctor-supported weight loss online. No clinic, no in-person appointment.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-loss",
  },
}

export default function WeightLossPage() {
  return <WeightLossClient />
}
