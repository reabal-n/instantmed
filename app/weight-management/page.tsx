import type { Metadata } from "next"
import { WeightManagementClient } from "./weight-management-client"

export const metadata: Metadata = {
  title: "Weight Management | Doctor-Supervised Programs",
  description:
    "Achieve sustainable weight loss with doctor-supervised programs. Personalised treatment plans, GLP-1 options, and ongoing support from Australian GPs. Start your journey today.",
  keywords: [
    "weight management australia",
    "weight loss doctor",
    "GLP-1 medication",
    "medical weight loss",
    "telehealth weight loss",
    "doctor supervised weight loss",
  ],
  openGraph: {
    title: "Weight Management | Doctor-Supervised Programs | InstantMed",
    description:
      "Achieve sustainable weight loss with doctor-supervised programs. Personalised treatment plans and ongoing support from Australian GPs.",
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
