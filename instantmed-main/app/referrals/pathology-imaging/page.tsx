import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online Pathology & Imaging Referral Australia | Blood Tests & Scans | InstantMed",
  description:
    "Request pathology and imaging referrals online. Blood tests, X-rays, ultrasounds, CT and MRI referrals from AHPRA-registered Australian doctors. No phone call needed.",
  keywords: [
    "online pathology referral",
    "blood test referral online",
    "pathology request online",
    "online blood test order",
    "imaging referral online",
    "x-ray referral online",
    "ultrasound referral online",
    "CT scan referral",
    "MRI referral online",
    "radiology referral australia",
  ],
  openGraph: {
    title: "Online Pathology & Imaging Referral | InstantMed Australia",
    description:
      "Request pathology and imaging referrals online. Blood tests, X-rays, ultrasounds from Australian doctors.",
    url: "https://instantmed.com.au/referrals/pathology-imaging",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Pathology & Imaging Referral | InstantMed",
    description: "Request blood tests, X-rays, ultrasounds online. Reviewed by Australian GPs.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/referrals/pathology-imaging",
  },
}

export default function PathologyImagingPage() {
  redirect("/referrals/pathology-imaging/request")
}
