import type { Metadata } from "next"

const siteConfig = {
  name: "InstantMed",
  description:
    "Get medical certificates and prescriptions online. Reviewed by AHPRA-registered Australian doctors. No appointments needed.",
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

  if (type === "FAQPage" && data?.faqs && Array.isArray(data.faqs)) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: data.faqs.map((faq: { question: string; answer: string }) => ({
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
