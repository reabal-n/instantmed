import { CONTACT_EMAIL_HELLO,PRICING_DISPLAY } from "@/lib/constants"
import { GOOGLE_REVIEWS } from "@/lib/social-proof"

import { JsonLdScript } from "./json-ld-script"

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
    legalName: "InstantMed Pty Ltd",
    alternateName: "InstantMed Australia",
    url: baseUrl,
    logo: `${baseUrl}/branding/logo.png`,
    image: `${baseUrl}/branding/logo.png`,
    description: "Australian telehealth service providing medical certificates and prescriptions reviewed by AHPRA-registered doctors with Medical Director oversight and RACGP-aligned clinical protocols.",
    slogan: "Healthcare that fits your schedule",
    foundingDate: "2025",
    taxID: "64694559334",
    medicalSpecialty: "PrimaryCare",
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
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "LegitScript Certified Healthcare Merchant",
        recognizedBy: {
          "@type": "Organization",
          name: "LegitScript",
          url: "https://www.legitscript.com"
        },
        url: "https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au"
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Google Ads Online Pharmacy Certification",
        recognizedBy: {
          "@type": "Organization",
          name: "Google",
          url: "https://www.google.com"
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
    priceRange: PRICING_DISPLAY.RANGE,
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
      email: CONTACT_EMAIL_HELLO,
      availableLanguage: ["English"]
    }],
    // sameAs omitted - no verified social profiles yet
    // aggregateRating: only injected once Google reviews are live
    ...(GOOGLE_REVIEWS.enabled && GOOGLE_REVIEWS.count > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: GOOGLE_REVIEWS.rating.toFixed(1),
        reviewCount: GOOGLE_REVIEWS.count,
        bestRating: "5",
        worstRating: "1",
        url: GOOGLE_REVIEWS.reviewsUrl,
      }
    } : {}),
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

  return <JsonLdScript id="organization-schema" data={schema} />
}

/**
 * MedicalOrganization schema - named alias for OrganizationSchema.
 * Use on pages where you want to explicitly emit the MedicalOrganization entity
 * (e.g. homepage, service landing pages) without relying solely on layout.tsx.
 */
export const MedicalOrganizationSchema = OrganizationSchema
