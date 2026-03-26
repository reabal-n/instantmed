export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import TrustPage from "./trust-client"
import {
  MedicalBusinessSchema,
  FAQPageSchema,
  BreadcrumbSchema,
} from "@/components/seo/structured-data"
import { ReviewAggregateSchema } from "@/components/seo/healthcare-schema"
import { SOCIAL_PROOF } from "@/lib/social-proof"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export const metadata: Metadata = {
  title: "Trust & Safety | InstantMed",
  description:
    "AHPRA-registered doctors, AES-256 encryption, and full Privacy Act compliance. See how InstantMed protects your health information.",
  alternates: {
    canonical: "/trust",
  },
  openGraph: {
    title: "Trust & Safety | InstantMed",
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

// Trust FAQ data for JSON-LD schema (mirrors client-side trustFAQs)
const trustFAQsForSchema = [
  {
    question: "How do I know the doctors are real?",
    answer:
      "Every doctor on InstantMed holds current AHPRA registration — the same regulatory body that governs all Australian medical practitioners. You can verify any doctor's credentials yourself on the AHPRA public register.",
  },
  {
    question: "Will my employer accept certificates from InstantMed?",
    answer:
      "Yes. Our medical certificates are issued by AHPRA-registered Australian doctors and are legally equivalent to certificates from any in-person clinic. They include the doctor's name, registration number, and all required details.",
  },
  {
    question: "What happens to my personal health information?",
    answer:
      "Your data is protected with AES-256 encryption and stored exclusively on Australian servers. We comply with the Privacy Act 1988 and all thirteen Australian Privacy Principles.",
  },
  {
    question: "Is this actually reviewed by a doctor, or is it automated?",
    answer:
      "Every single request is reviewed by a qualified, AHPRA-registered Australian doctor who makes an independent clinical decision. There are no automated approvals — ever.",
  },
  {
    question: "What if I'm not happy with the service?",
    answer:
      "We respond to complaints within 48 hours and offer a full refund if we can't help you. You can also escalate concerns to the Health Complaints Commissioner in your state.",
  },
  {
    question: "Are electronic prescriptions legitimate?",
    answer:
      "Yes. Our eScripts are generated through official PBS channels and work at any Australian pharmacy. Electronic prescriptions are the national standard and fully compliant with the Therapeutic Goods Act.",
  },
]

export default function Page() {
  return (
    <>
      <TrustPage />
      <MedicalBusinessSchema />
      <FAQPageSchema faqs={trustFAQsForSchema} pageUrl="/trust" />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Trust & Safety", url: "/trust" },
        ]}
      />
      <ReviewAggregateSchema
        ratingValue={SOCIAL_PROOF.averageRating}
        reviewCount={SOCIAL_PROOF.reviewCount}
      />
    </>
  )
}
