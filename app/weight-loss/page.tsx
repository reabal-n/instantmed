import type { Metadata } from "next"

import { WeightLossClient } from "./weight-loss-client"

export const metadata: Metadata = {
  title: { absolute: "Weight Management Assessment | Online, No Clinic | InstantMed" },
  description:
    "Doctor-reviewed weight management assessment online. Start with a confidential form. No clinic visit, no in-person appointment.",
  keywords: [
    "weight management australia",
    "doctor supervised weight management",
    "weight management program online",
    "telehealth weight management australia",
    "healthy weight support",
  ],
  openGraph: {
    title: "Weight Management Assessment | Online, No Clinic | InstantMed",
    description:
      "Doctor-reviewed weight management assessment. Start online, no clinic visit needed.",
    url: "https://instantmed.com.au/weight-loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Management Assessment | Online, No Clinic | InstantMed",
    description: "Doctor-reviewed weight management assessment online. No clinic, no in-person appointment.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-loss",
  },
}

export default function WeightLossPage() {
  return <WeightLossClient />
}
