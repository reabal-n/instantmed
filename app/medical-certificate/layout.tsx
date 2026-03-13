import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online Medical Certificate | Same Day $19.95",
  description:
    "Get a medical certificate in under an hour. Valid for work, uni or carer's leave. $19.95 flat fee. AHPRA-registered Australian doctors.",
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
    title: "Online Medical Certificate | Under 1 Hour | InstantMed",
    description: "Get a valid medical certificate for work or uni, reviewed by an Australian-registered doctor. $19.95 flat fee.",
    url: "https://instantmed.com.au/medical-certificate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Medical Certificate | Under 1 Hour | InstantMed",
    description: "Get a valid medical certificate for work or uni, reviewed by an Australian-registered doctor. $19.95 flat fee.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate",
  },
}

export default function MedicalCertificateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
