import type { Metadata } from "next"
import TrustPage from "./trust-client"
import { ReviewAggregateSchema } from "@/components/seo/healthcare-schema"
import { SOCIAL_PROOF } from "@/lib/social-proof"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export const metadata: Metadata = {
  title: "Trust & Safety | AHPRA Doctors & Encryption",
  description:
    "AHPRA-registered doctors, AES-256 encryption, and full Privacy Act compliance. See how InstantMed protects your health information.",
  alternates: {
    canonical: "/trust",
  },
  openGraph: {
    title: "Trust & Safety | AHPRA Doctors & Encryption | InstantMed",
    description:
      "Real doctors. Transparent process. Every request reviewed by a qualified, AHPRA-registered clinician.",
    url: `${SITE_URL}/trust`,
    siteName: "InstantMed",
    type: "website",
    locale: "en_AU",
    images: [
      {
        url: `${SITE_URL}/og/trust.png`,
        width: 1200,
        height: 630,
        alt: "InstantMed Trust & Safety — AHPRA-registered doctors, AES-256 encryption, Privacy Act compliant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trust & Safety | InstantMed",
    description:
      "Real doctors. Transparent process. Every request reviewed by a qualified, AHPRA-registered clinician.",
    images: [`${SITE_URL}/og/trust.png`],
  },
}

// FAQ + Breadcrumb schemas are rendered in layout.tsx to avoid duplication

export default function Page() {
  return (
    <>
      <TrustPage />
      <ReviewAggregateSchema
        ratingValue={SOCIAL_PROOF.averageRating}
        reviewCount={SOCIAL_PROOF.reviewCount}
      />
    </>
  )
}
