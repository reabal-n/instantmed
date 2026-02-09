import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"

// Revalidate every 24 hours — trust content is mostly static
export const revalidate = 86400

export const metadata: Metadata = {
  title: "Why Trust InstantMed? | AHPRA Registered Doctors",
  description:
    "Doctor verification, data security and Medicare compliance. 100% Australian-based with AHPRA-registered doctors. Bank-level encryption.",
  keywords: [
    "AHPRA registered telehealth",
    "Australian online doctor",
    "telehealth security",
    "Medicare compliant telehealth",
    "verified online doctors Australia",
    "telehealth trust safety",
    "legitimate online doctor Australia",
  ],
  openGraph: {
    title: "Why Trust InstantMed? | AHPRA Registered Doctors",
    description:
      "Learn about our doctor verification process, data security, and Medicare compliance. 100% Australian-based with AHPRA registered doctors.",
    type: "website",
    url: "https://instantmed.com.au/trust",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Trust InstantMed? | AHPRA Registered Doctors",
    description: "100% Australian-based with AHPRA registered doctors. Bank-level security. Full transparency.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/trust",
  },
}

// FAQ data for schema - mirrors page content
const faqSchemaData = [
  { question: "How do I know the doctors are real?", answer: "Every doctor on InstantMed holds current AHPRA registration — the same regulatory body that governs all Australian medical practitioners. You can verify any doctor's credentials yourself on the AHPRA public register." },
  { question: "Will my employer accept certificates from InstantMed?", answer: "Yes. Our medical certificates are issued by AHPRA-registered Australian GPs and are legally equivalent to certificates from any in-person clinic. They include the doctor's name, registration number, and all required details." },
  { question: "What happens to my personal health information?", answer: "Your data is protected with 256-bit SSL encryption (the same as banks) and stored exclusively on Australian servers. We comply with the Privacy Act 1988 and Australian Privacy Principles." },
  { question: "Is this actually reviewed by a doctor, or is it automated?", answer: "Every single request is reviewed by a qualified Australian GP who makes an independent clinical decision. There are no automated approvals." },
  { question: "What if I'm not happy with the service?", answer: "We respond to complaints within 48 hours and offer a full refund if we can't help you. You can also escalate concerns to the Health Complaints Commissioner in your state." },
  { question: "Are electronic prescriptions legitimate?", answer: "Yes. Our eScripts are sent via official PBS channels and work at any Australian pharmacy. eScripts are the standard across Australia and are fully compliant with the Therapeutic Goods Act." },
]

export default function TrustLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* SEO Structured Data */}
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Trust & Safety", url: "https://instantmed.com.au/trust" }
        ]}
      />
      {children}
    </>
  )
}
