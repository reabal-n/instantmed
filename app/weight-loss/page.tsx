import type { Metadata } from "next"
import { WeightLossClient } from "./weight-loss-client"

export const metadata: Metadata = {
  title: "Weight Loss Treatment | Medical Weight Loss | InstantMed",
  description:
    "GLP-1 medications, personalised plans and ongoing doctor support. Start with a confidential online consultation.",
  keywords: [
    "weight loss treatment australia",
    "GLP-1 weight loss",
    "medical weight loss online",
    "ozempic alternative",
    "weight loss medication",
    "telehealth weight loss australia",
  ],
  openGraph: {
    title: "Weight Loss Treatment | Medical Weight Loss | InstantMed",
    description:
      "Access clinically proven weight loss treatments online. GLP-1 medications, personalised plans, and ongoing doctor support.",
    url: "https://instantmed.com.au/weight-loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Loss Treatment | InstantMed",
    description: "Clinically proven weight loss treatments with ongoing doctor support.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-loss",
  },
}

export default function WeightLossPage() {
  return <WeightLossClient />
}
