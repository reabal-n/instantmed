import Script from "next/script"

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
