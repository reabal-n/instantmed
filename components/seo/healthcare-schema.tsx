import Script from "next/script"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

interface OrganizationSchemaProps {
  baseUrl?: string
}

/**
 * Schema.org structured data for healthcare organization
 * Helps search engines understand the business and improves SEO
 */
export function OrganizationSchema({ baseUrl = "https://instantmed.com.au" }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "@id": `${baseUrl}/#organization`,
    name: "InstantMed",
    legalName: "InstantMed Telehealth Pty Ltd",
    alternateName: "InstantMed Australia",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    image: `${baseUrl}/og-image.png`,
    description: "Australian telehealth service providing medical certificates and prescriptions reviewed by AHPRA-registered doctors with Medical Director oversight and RACGP-aligned clinical protocols.",
    slogan: "Healthcare that fits your schedule",
    foundingDate: "2024",
    taxID: "52426403844",
    medicalSpecialty: "GeneralPractice",
    isAccreditedBy: {
      "@type": "Organization",
      name: "Australian Health Practitioner Regulation Agency",
      alternateName: "AHPRA",
      url: "https://www.ahpra.gov.au"
    },
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "AHPRA Registration",
        recognizedBy: {
          "@type": "Organization",
          name: "Australian Health Practitioner Regulation Agency"
        }
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "RACGP Standards Alignment",
        recognizedBy: {
          "@type": "Organization",
          name: "Royal Australian College of General Practitioners"
        }
      }
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Level 1/457-459 Elizabeth Street",
      addressLocality: "Surry Hills",
      addressRegion: "NSW",
      postalCode: "2010",
      addressCountry: "AU"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -33.8830,
      longitude: 151.2108
    },
    areaServed: {
      "@type": "Country",
      name: "Australia"
    },
    serviceType: [
      "Telehealth",
      "Online Medical Consultation",
      "Medical Certificate",
      "Online Prescription"
    ],
    priceRange: "$19.95 - $49.95",
    currenciesAccepted: "AUD",
    paymentAccepted: ["Credit Card", "Debit Card"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00",
      closes: "22:00"
    },
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "hello@instantmed.com.au",
      availableLanguage: ["English"]
    }],
    sameAs: [
      "https://www.facebook.com/instantmedau",
      "https://twitter.com/instantmedau",
      "https://www.instagram.com/instantmedau"
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "InstantMed Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalService",
            name: "Medical Certificate",
            description: "Get a valid medical certificate for work or study reviewed by an Australian registered doctor"
          }
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalService",
            name: "Online Prescription",
            description: "Request prescriptions for common medications from registered doctors"
          }
        }
      ]
    }
  }

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface MedicalServiceSchemaProps {
  name: string
  description: string
  price: string
  baseUrl?: string
}

/**
 * Schema.org structured data for individual medical services
 */
export function MedicalServiceSchema({ 
  name, 
  description, 
  price,
  baseUrl = "https://instantmed.com.au" 
}: MedicalServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalService",
    name,
    description,
    provider: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`
    },
    serviceType: "Telehealth",
    areaServed: {
      "@type": "Country",
      name: "Australia"
    },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock"
    }
  }

  return (
    <Script
      id={`service-schema-${name.toLowerCase().replace(/\s+/g, '-')}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface FAQSchemaProps {
  faqs: Array<{ question: string; answer: string }>
}

/**
 * Schema.org FAQ structured data
 */
export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  }

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>
}

/**
 * Schema.org breadcrumb structured data
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface LocalBusinessSchemaProps {
  city: string
  state: string
  baseUrl?: string
}

/**
 * Schema.org local business for location pages
 */
export function LocalBusinessSchema({ city, state, baseUrl = "https://instantmed.com.au" }: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `InstantMed ${city}`,
    url: `${baseUrl}/locations/${city.toLowerCase().replace(/\s+/g, '-')}`,
    parentOrganization: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: state,
      addressCountry: "AU"
    },
    areaServed: {
      "@type": "City",
      name: city,
      containedInPlace: {
        "@type": "State",
        name: state
      }
    },
    serviceType: "Telehealth",
    description: `Online telehealth services for ${city} residents. Get medical certificates and prescriptions from Australian doctors.`
  }

  return (
    <Script
      id={`local-business-schema-${city.toLowerCase()}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface ArticleSchemaProps {
  title: string
  description: string
  url: string
  imageUrl: string
  authorName: string
  publishedAt: string
  updatedAt: string
  baseUrl?: string
}

/**
 * Schema.org Article structured data for blog posts
 */
export function ArticleSchema({
  title,
  description,
  url,
  imageUrl,
  authorName,
  publishedAt,
  updatedAt,
  baseUrl = "https://instantmed.com.au"
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`,
    url,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: {
      "@type": "Person",
      name: authorName,
      url: baseUrl
    },
    publisher: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
      name: "InstantMed",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    },
    isPartOf: {
      "@type": "WebSite",
      name: "InstantMed Health Guides",
      url: `${baseUrl}/blog`
    }
  }

  return (
    <Script
      id="article-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface ReviewAggregateSchemaProps {
  ratingValue: number
  reviewCount: number
  bestRating?: number
  worstRating?: number
}

/**
 * Schema.org aggregate rating for reviews
 */
export function ReviewAggregateSchema({ 
  ratingValue, 
  reviewCount, 
  bestRating = 5, 
  worstRating = 1 
}: ReviewAggregateSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "InstantMed",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
      bestRating,
      worstRating
    }
  }

  return (
    <Script
      id="review-aggregate-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

interface HowToStep {
  name: string
  text: string
  image?: string
  url?: string
}

interface HowToSchemaProps {
  name: string
  description: string
  steps: HowToStep[]
  totalTime?: string
  estimatedCost?: string
  baseUrl?: string
}

/**
 * Schema.org HowTo structured data for process pages
 * Helps with rich snippets for "how to get medical certificate" searches
 */
export function HowToSchema({
  name,
  description,
  steps,
  totalTime = "PT30M",
  estimatedCost,
  baseUrl = "https://instantmed.com.au"
}: HowToSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    totalTime,
    ...(estimatedCost && {
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "AUD",
        value: estimatedCost
      }
    }),
    tool: {
      "@type": "HowToTool",
      name: "Internet-connected device (phone, tablet, or computer)"
    },
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          "@type": "ImageObject",
          url: step.image.startsWith("http") ? step.image : `${baseUrl}${step.image}`
        }
      }),
      ...(step.url && { url: step.url })
    })),
    provider: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`
    }
  }

  return (
    <Script
      id="howto-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * Pre-configured HowTo schema for medical certificate process
 */
export function MedCertHowToSchema({ baseUrl = "https://instantmed.com.au" }: { baseUrl?: string }) {
  return (
    <HowToSchema
      name="How to Get a Medical Certificate Online in Australia"
      description="Get a valid medical certificate from an AHPRA-registered doctor in under 30 minutes, completely online. No appointment needed."
      totalTime="PT30M"
      estimatedCost="19.95"
      baseUrl={baseUrl}
      steps={[
        {
          name: "Complete the online form",
          text: "Answer a few questions about your symptoms and the type of certificate you need (work, study, or carer's leave). Takes about 2 minutes."
        },
        {
          name: "Verify your identity",
          text: "Provide your details including name, date of birth, and contact information. Medicare is optional for medical certificates."
        },
        {
          name: "Make payment",
          text: "Pay securely online. Medical certificates start at $19.95."
        },
        {
          name: "Doctor reviews your request",
          text: "An AHPRA-registered Australian doctor reviews your request. Most are completed within 30 minutes during operating hours."
        },
        {
          name: "Receive your certificate",
          text: "Your medical certificate is emailed to you as a PDF. It's valid for work, university, and other institutions."
        }
      ]}
    />
  )
}

/**
 * Pre-configured HowTo schema for prescription process
 */
export function PrescriptionHowToSchema({ baseUrl = "https://instantmed.com.au" }: { baseUrl?: string }) {
  return (
    <HowToSchema
      name="How to Get a Prescription Online in Australia"
      description="Request a prescription from an AHPRA-registered doctor online. Reviewed within 30 minutes, eScript sent directly to your phone."
      totalTime="PT30M"
      estimatedCost="29.95"
      baseUrl={baseUrl}
      steps={[
        {
          name: "Select your medication",
          text: "Start typing the name of your medication. We use the PBS database to help you find the right one."
        },
        {
          name: "Answer clinical questions",
          text: "Provide information about your health history and current medications. This helps the doctor make a safe decision."
        },
        {
          name: "Verify your identity",
          text: "Enter your details including Medicare number or IHI (required for eScript). Your address is needed for prescribing compliance."
        },
        {
          name: "Make payment",
          text: "Pay securely online. Prescriptions are $29.95."
        },
        {
          name: "Doctor reviews your request",
          text: "An AHPRA-registered Australian doctor reviews your request and medical history. They may contact you if they need more information."
        },
        {
          name: "Receive your eScript",
          text: "If approved, your eScript QR code is sent via SMS to your phone. Take it to any pharmacy in Australia to fill."
        }
      ]}
    />
  )
}
