import type { Metadata } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

interface ServiceSEO {
  title: string
  description: string
  keywords: string[]
  faqSchema: { question: string; answer: string }[]
}

export const serviceSEO: Record<string, ServiceSEO> = {
  "medical-certificate": {
    title: "Online Medical Certificate Australia | Same Day | InstantMed",
    description:
      "Get a medical certificate online in Australia. Same-day certificates for work, uni, or carer's leave. Reviewed by AHPRA-registered doctors. From $24.95.",
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
          "Most certificates are reviewed and issued within 1 hour during operating hours (8am–10pm AEST). You'll receive it via email as a PDF.",
      },
      {
        question: "Is an online medical certificate valid for work?",
        answer:
          "Yes. Online medical certificates issued by AHPRA-registered doctors are legally valid for employers, universities, and other institutions in Australia.",
      },
      {
        question: "Do I need to make a phone call?",
        answer:
          "No phone call is needed for most requests. You submit your information online and a doctor reviews it. The doctor may contact you if they need more information.",
      },
      {
        question: "What does it cost?",
        answer: "Medical certificates start from $24.95. The exact price depends on the type of certificate required.",
      },
    ],
  },
  prescriptions: {
    title: "Online Prescription Australia | Repeat Scripts | InstantMed",
    description:
      "Request prescriptions online from Australian doctors. Repeat scripts and medication reviews handled online. Reviewed by AHPRA-registered GPs.",
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
          "Most requests are handled online without a phone call. The doctor may contact you if they need more information to make a clinical decision.",
      },
    ],
  },
  "pathology-referrals": {
    title: "Online Pathology Referral Australia | Blood Test Referral | InstantMed",
    description:
      "Request pathology referrals online for blood tests and lab work. Same-day referrals from AHPRA-registered Australian doctors. No phone call needed.",
    keywords: [
      "online pathology referral",
      "blood test referral online",
      "pathology request online",
      "online blood test order",
      "telehealth pathology referral",
      "lab test referral australia",
    ],
    faqSchema: [
      {
        question: "Can I get a blood test referral online?",
        answer:
          "Yes. You can request a pathology referral online and an AHPRA-registered doctor will review your request. If appropriate, they'll issue a referral you can take to any pathology collection centre.",
      },
      {
        question: "Which pathology tests can be requested?",
        answer:
          "Common tests include full blood count, liver function, kidney function, thyroid, cholesterol, iron studies, diabetes screening, and STI tests. The doctor will assess whether the requested tests are appropriate.",
      },
      {
        question: "Where can I get my blood test done?",
        answer:
          "You can take your referral to any pathology collection centre in Australia, including Laverty, Douglass Hanly Moir, QML, and others.",
      },
    ],
  },
  "imaging-referrals": {
    title: "Online Imaging Referral Australia | X-Ray & Ultrasound | InstantMed",
    description:
      "Request imaging referrals online for X-rays, ultrasounds, CT and MRI scans. Reviewed by AHPRA-registered Australian doctors. Same-day service.",
    keywords: [
      "online imaging referral",
      "x-ray referral online",
      "ultrasound referral online",
      "CT scan referral",
      "MRI referral online",
      "radiology referral australia",
    ],
    faqSchema: [
      {
        question: "Can I get an X-ray referral online?",
        answer:
          "Yes. You can request imaging referrals online for X-rays, ultrasounds, CT scans, and MRIs. An AHPRA-registered doctor will review your request and determine if a referral is appropriate.",
      },
      {
        question: "Do I need to see a doctor in person for imaging?",
        answer:
          "For many imaging requests, an in-person consultation is not required. However, the doctor may contact you if they need more information, or recommend an in-person assessment for complex cases.",
      },
      {
        question: "Where can I get my imaging done?",
        answer:
          "You can take your referral to any radiology clinic in Australia. The referral will specify what imaging is required.",
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
    medicalSpecialty: "GeneralPractice",
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
    related: ["/prescriptions", "/referrals/pathology-imaging", "/how-it-works", "/pricing"],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Medical Certificates", href: "/medical-certificate" },
    ],
  },
  prescriptions: {
    related: ["/medical-certificate", "/referrals/pathology-imaging", "/how-it-works", "/pricing"],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Prescriptions", href: "/prescriptions" },
    ],
  },
  "pathology-imaging": {
    related: ["/medical-certificate", "/prescriptions", "/how-it-works", "/pricing"],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Referrals", href: "/referrals" },
      { name: "Pathology & Imaging", href: "/referrals/pathology-imaging" },
    ],
  },
}
