import type { Metadata } from "next"

import { PRICING_DISPLAY } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Medical Certificate Online from ${PRICING_DISPLAY.MED_CERT}`,
  description:
    `Request a routine sick, study or carer's leave certificate online, 24/7. ${PRICING_DISPLAY.MED_CERT} flat fee. AHPRA-registered Australian doctors.`,
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
    title: "Medical Certificate Online | InstantMed",
    description: `Request a routine sick, study or carer's leave certificate, reviewed by an Australian-registered doctor. ${PRICING_DISPLAY.MED_CERT} flat fee.`,
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Certificate Online | InstantMed",
    description: `Request a routine sick, study or carer's leave certificate, reviewed by an Australian-registered doctor. ${PRICING_DISPLAY.MED_CERT} flat fee.`,
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate",
  },
}

export default function MedicalCertificateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
