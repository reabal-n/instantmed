import type { Metadata } from "next"

import { PRICING_DISPLAY } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Medical Certificate | Under an Hour from ${PRICING_DISPLAY.MED_CERT}`,
  description:
    `Get a medical certificate in under 30 minutes, 24/7. Valid for work, uni or carer's leave. ${PRICING_DISPLAY.MED_CERT} flat fee. AHPRA-registered Australian doctors.`,
  keywords: [
    "online medical certificate",
    "sick certificate online",
    "medical certificate for work",
    "medical certificate for uni",
    "doctor certificate online",
    "same day medical certificate",
    "medical certificate australia",
    "sick note online",
    "telehealth medical certificate",
  ],
  openGraph: {
    title: "Medical Certificate | Under an Hour, No Call | InstantMed",
    description: `Get a valid medical certificate for work or uni, reviewed by an Australian-registered doctor. ${PRICING_DISPLAY.MED_CERT} flat fee.`,
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Certificate | Under an Hour, No Call | InstantMed",
    description: `Get a valid medical certificate for work or uni, reviewed by an Australian-registered doctor. ${PRICING_DISPLAY.MED_CERT} flat fee.`,
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate",
  },
}

export default function MedicalCertificateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
