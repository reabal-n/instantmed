import type { Metadata } from "next"
import { PRICING_DISPLAY } from "@/lib/constants"

const siteConfig = {
  name: "InstantMed",
  description:
    `An asynchronous telehealth platform for Australians. Get medical certificates (${PRICING_DISPLAY.MED_CERT}), repeat prescriptions (${PRICING_DISPLAY.REPEAT_SCRIPT}), and new consultations (${PRICING_DISPLAY.CONSULT}) reviewed by AHPRA-registered doctors. No video calls, mobile-optimized, Medicare-friendly.`,
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au",
  ogImage: "/og-image.png",
  keywords: [
    "online doctor Australia",
    "telehealth Australia",
    "medical certificate online",
    "online prescription",
    "sick certificate",
    "AHPRA registered doctor",
    "Australian telehealth",
  ],
}

export function generateSEOMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
}: {
  title?: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
}): Metadata {
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name
  const fullDescription = description || siteConfig.description
  const url = `${siteConfig.url}${path}`
  const ogImage = image || siteConfig.ogImage

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: siteConfig.keywords,
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url,
      title: fullTitle,
      description: fullDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      images: [ogImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  }
}

export function generateStructuredData(type: "Organization" | "MedicalBusiness" | "FAQPage", data?: Record<string, unknown>) {
  const baseOrg = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    medicalSpecialty: "GeneralPractice",
    availableService: [
      {
        "@type": "MedicalProcedure",
        name: "Medical Certificate",
        description: "Online medical certificates for work, university, or carer's leave",
      },
      {
        "@type": "MedicalProcedure",
        name: "Prescription",
        description: "Repeat prescriptions for ongoing medications",
      },
    ],
  }

  if (type === "Organization" || type === "MedicalBusiness") {
    return baseOrg
  }

  if (type === "FAQPage" && data?.faqs) {
    const faqs = data.faqs as { question: string; answer: string }[]
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }
  }

  return baseOrg
}
