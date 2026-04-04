import type { Metadata } from "next"
import { BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"
import { PRICING } from "@/lib/constants"
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
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Weight Management", url: "https://instantmed.com.au/weight-management" },
        ]}
      />
      <MedicalServiceSchema
        name="Doctor-Supervised Weight Management"
        description="Personalised weight management program reviewed by AHPRA-registered Australian GPs. Sustainable results with ongoing doctor support."
        price={PRICING.WEIGHT_LOSS.toFixed(2)}
      />
      <WeightManagementClient />
    </>
  )
}
