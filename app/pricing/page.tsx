import type { Metadata } from "next"

import { BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo"
import { PRICING_DISPLAY } from "@/lib/constants"

import { PricingClient } from "./pricing-client"

export const metadata: Metadata = {
  title: "Pricing | Transparent Telehealth Costs",
  description:
    `Simple, transparent pricing for all InstantMed telehealth services. Medical certificates from ${PRICING_DISPLAY.MED_CERT}, prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}. No hidden fees, full refund if we can't help.`,
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
      `Simple, transparent pricing. Medical certificates from ${PRICING_DISPLAY.MED_CERT}, prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}. No hidden fees.`,
    url: "https://instantmed.com.au/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | InstantMed",
    description: `Transparent telehealth pricing. Medical certificates from ${PRICING_DISPLAY.MED_CERT}, prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}.`,
  },
  alternates: {
    canonical: "https://instantmed.com.au/pricing",
  },
}

export const revalidate = 86400 // AUDIT FIX: Explicit ISR for static marketing pages

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
