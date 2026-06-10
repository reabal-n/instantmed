import type { Metadata } from "next"

import { PRICING_DISPLAY } from "@/lib/constants"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

interface ServiceSEO {
  title: string
  description: string
  keywords: string[]
  faqSchema: { question: string; answer: string }[]
}

export const serviceSEO: Record<string, ServiceSEO> = {
  "medical-certificate": {
    title: "Online Medical Certificate Australia | Same Day",
    description: `Get a medical certificate online in Australia. Same-day certificates for work, uni, or carer's leave. Reviewed by AHPRA-registered doctors. From ${PRICING_DISPLAY.MED_CERT}.`,
    keywords: [
      "online medical certificate australia",
      "same day medical certificate",
      "medical certificate for work",
      "medical certificate for uni",
      "sick certificate online",
      "telehealth medical certificate",
      "digital medical certificate",
    ],
    faqSchema: [
      {
        question: "How quickly can I get a medical certificate?",
        answer:
          "You can submit a request 24/7. After approval, you'll receive the certificate via email as a PDF.",
      },
      {
        question: "Can an online medical certificate be used for work?",
        answer:
          "Certificates issued by AHPRA-registered doctors can support workplace, university, and institution evidence requirements. Employer and institution policies may vary.",
      },
      {
        question: "Do I need to make a phone call?",
        answer:
          "You submit your information online and a doctor reviews it. We only interrupt you if something important is missing.",
      },
      {
        question: "What does it cost?",
        answer: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. The exact price depends on the type of certificate required.`,
      },
    ],
  },
  prescriptions: {
    title: "Online Prescription Australia | Repeat Scripts",
    description:
      "Request prescriptions online from Australian doctors. Repeat scripts and medication reviews handled online. Reviewed by AHPRA-registered doctors.",
    keywords: [
      "online prescription australia",
      "repeat prescription online",
      "online script australia",
      "telehealth prescription",
      "medication refill online",
      "digital prescription",
    ],
    faqSchema: [
      {
        question: "Can I get a prescription online in Australia?",
        answer:
          "Yes. AHPRA-registered doctors can issue prescriptions online after reviewing your request. The doctor will assess whether a prescription is appropriate for your situation.",
      },
      {
        question: "What medications can be prescribed online?",
        answer:
          "Many common medications can be prescribed online, including repeat medications you've been taking. Some medications (like Schedule 8 controlled substances) require an in-person consultation.",
      },
      {
        question: "How do I receive my prescription?",
        answer:
          "If approved, you'll receive an electronic prescription (eScript) via SMS and email. You can take this to any pharmacy in Australia.",
      },
      {
        question: "Do I need to speak to a doctor?",
        answer:
          "You start with a secure online form. We only interrupt you if something important is missing before the doctor can decide.",
      },
    ],
  },
}

export function generateServiceMetadata(service: keyof typeof serviceSEO): Metadata {
  const seo = serviceSEO[service]
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}/${service}`,
      siteName: "InstantMed",
      type: "website",
      locale: "en_AU",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    alternates: {
      canonical: `${SITE_URL}/${service}`,
    },
  }
}

export function generateFAQSchema(service: keyof typeof serviceSEO) {
  const seo = serviceSEO[service]
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqSchema.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export function generateMedicalServiceSchema(service: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "InstantMed",
    description,
    url: `${SITE_URL}/${service}`,
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    medicalSpecialty: "PrimaryCare",
    availableService: {
      "@type": "MedicalProcedure",
      name,
      description,
    },
  }
}

// Internal linking structure for SEO
export const internalLinks = {
  "medical-certificate": {
    related: ["/prescriptions", "/how-it-works", "/pricing"],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Medical Certificates", href: "/medical-certificate" },
    ],
  },
  prescriptions: {
    related: ["/medical-certificate", "/how-it-works", "/pricing"],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Prescriptions", href: "/prescriptions" },
    ],
  },
}
