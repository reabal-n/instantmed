import { CONTACT_EMAIL_HELLO,PRICING,PRICING_DISPLAY } from "@/lib/constants"

import { JsonLdScript } from "./json-ld-script"
import { SAME_AS_PROFILES } from "./same-as"

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
    description: "Australian telehealth service providing medical certificates and prescription requests reviewed by AHPRA-registered doctors under documented clinical governance.",
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
      opens: "00:00",
      closes: "23:59"
    },
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer service",
      email: CONTACT_EMAIL_HELLO,
      availableLanguage: ["English"]
    }],
    // sameAs: verified external identity profiles — the primary entity-linking
    // signal answer engines use to resolve and cite "InstantMed". Identity links
    // only (see ./same-as). aggregateRating intentionally omitted: public
    // surfaces use a stars-only Google badge and never expose review
    // counts/star scores/testimonial schema.
    sameAs: SAME_AS_PROFILES,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "InstantMed Services",
      itemListElement: [
        {
          "@type": "Offer",
          // price + priceCurrency are required for a valid Offer; without them
          // structured-data validators flag "missing field price". Entry price
          // (med cert is "from" this) in AUD.
          price: PRICING.MED_CERT.toFixed(2),
          priceCurrency: "AUD",
          itemOffered: {
            "@type": "MedicalService",
            name: "Medical Certificate",
            description: "Request a routine sick or study certificate reviewed by an Australian registered doctor"
          }
        },
        {
          "@type": "Offer",
          price: PRICING.REPEAT_SCRIPT.toFixed(2),
          priceCurrency: "AUD",
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
