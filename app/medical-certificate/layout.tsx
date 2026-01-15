import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Online Medical Certificate Australia | Same Day Sick Note | InstantMed",
  description:
    "Get an online medical certificate in under an hour. Valid for work, uni, or carer's leave. $19.95 flat fee. No phone calls, no video. AHPRA-registered Australian doctors.",
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

// FAQ data for schema
const faqSchemaData = [
  { question: "Will my employer accept this?", answer: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers and universities." },
  { question: "Can I use this for university?", answer: "Yes. Our medical certificates are accepted by all Australian universities, TAFEs, and educational institutions for special consideration or extensions." },
  { question: "How do I receive my certificate?", answer: "Once approved, your certificate is emailed to you as a PDF. You can also download it from your patient dashboard." },
  { question: "Is this legal?", answer: "Yes. Our doctors are AHPRA-registered and practicing in Australia. Medical certificates issued through telehealth are legally equivalent to in-person consultations." },
  { question: "What if my request is declined?", answer: "You'll receive a full refund. Our doctors may decline requests if they believe an in-person consultation is more appropriate for your situation." },
]

export default function MedicalCertificateLayout({
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
          { name: "Medical Certificate", url: "https://instantmed.com.au/medical-certificate" }
        ]} 
      />
      <MedicalServiceSchema 
        name="Online Medical Certificate"
        description="Get a valid medical certificate for work or study reviewed by an Australian registered doctor. Available same day."
        price="19.95"
      />
      {children}
    </>
  )
}
