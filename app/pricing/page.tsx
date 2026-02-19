import type { Metadata } from "next"
import { PricingClient } from "./pricing-client"
import { BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Pricing | Transparent Telehealth Costs",
  description:
    "Simple, transparent pricing for all InstantMed telehealth services. Medical certificates from $24.95, prescriptions from $19.95. No hidden fees, full refund if we can't help.",
  keywords: [
    "telehealth pricing australia",
    "online doctor cost",
    "medical certificate price",
    "prescription renewal cost",
    "telehealth fees",
    "affordable online doctor",
  ],
  openGraph: {
    title: "Pricing | Transparent Telehealth Costs | InstantMed",
    description:
      "Simple, transparent pricing. Medical certificates from $24.95, prescriptions from $19.95. No hidden fees.",
    url: "https://instantmed.com.au/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | InstantMed",
    description: "Transparent telehealth pricing. Medical certificates from $24.95, prescriptions from $19.95.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/pricing",
  },
}

export default function PricingPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "Pricing", url: "https://instantmed.com.au/pricing" },
      ]} />
      <MedicalServiceSchema
        name="Medical Certificate"
        description="Get a valid medical certificate for work or study reviewed by an Australian registered doctor"
        price="19.95"
      />
      <MedicalServiceSchema
        name="Online Prescription"
        description="Request prescriptions for common medications from registered Australian doctors"
        price="29.95"
      />
      <PricingClient />
    </>
  )
}
