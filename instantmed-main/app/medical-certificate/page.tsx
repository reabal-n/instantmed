import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online Medical Certificate Australia | Same Day Doctor's Certificate | InstantMed",
  description:
    "Get an online medical certificate from an Australian registered doctor in under 1 hour. Valid for work, uni, or carer's leave. No phone calls needed. $24.99.",
  keywords: [
    "online medical certificate",
    "medical certificate australia",
    "same day medical certificate",
    "medical certificate for work",
    "medical certificate for uni",
    "sick certificate online",
    "doctor certificate online",
    "telehealth medical certificate",
  ],
  openGraph: {
    title: "Online Medical Certificate | Same Day | InstantMed",
    description:
      "Get a valid medical certificate from an Australian GP in under 1 hour. For work, uni or carer's leave. No appointments needed.",
    url: "https://instantmed.com.au/medical-certificate",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
    images: [
      {
        url: "/og-medical-certificate.png",
        width: 1200,
        height: 630,
        alt: "InstantMed Online Medical Certificate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Medical Certificate Australia | InstantMed",
    description: "Get a same day medical certificate from an Australian doctor. Valid for work, uni or carer's leave.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function MedicalCertificatePage() {
  redirect("/medical-certificate/request")
}
