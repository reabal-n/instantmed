import type { Metadata } from "next"

import { WeightLossLanding } from "@/components/marketing/weight-loss-landing"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { WEIGHT_LOSS_LANDING_FAQ } from "@/lib/data/weight-loss-faq"

export const metadata: Metadata = {
  title: "Weight Management Assessment Online",
  description:
    "Doctor-reviewed weight-management assessment for eligible adults. Structured eligibility and safety screening first; a doctor calls when your history needs it.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Weight Management Assessment Online | InstantMed",
    description:
      "Doctor-reviewed weight-management assessment with eligibility and safety screening first.",
    url: "https://instantmed.com.au/weight-loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weight Management Assessment Online | InstantMed",
    description:
      "Doctor-reviewed weight-management assessment with eligibility and safety screening first.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/weight-loss",
  },
}

export default function WeightLossPage() {
  return (
    <>
      <FAQSchema faqs={WEIGHT_LOSS_LANDING_FAQ.map(({ question, answer }) => ({ question, answer }))} />
      <WeightLossLanding />
    </>
  )
}
