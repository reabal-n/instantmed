import { CONTACT_EMAIL_HELLO, PRICING } from "@/lib/constants"

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
    areaServed: {
      "@type": "Country",
      name: "Australia"
    },
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer service",
      email: CONTACT_EMAIL_HELLO,
      availableLanguage: ["English"]
    }],
    // sameAs: verified external identity profiles - the primary entity-linking
    // signal answer engines use to resolve and cite "InstantMed". Identity links
    // only (see ./same-as). Public review markup is intentionally omitted.
    sameAs: SAME_AS_PROFILES,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "InstantMed Services",
      itemListElement: [
        {
          "@type": "Offer",
          // price + priceCurrency are required for a valid Offer.
          price: PRICING.MED_CERT.toFixed(2),
          priceCurrency: "AUD",
          itemOffered: {
            "@type": "Service",
            name: "Medical Certificate",
            serviceType: "Medical certificate request",
            description: "Request a routine sick or study certificate reviewed by an Australian registered doctor"
          }
        },
        {
          "@type": "Offer",
          price: PRICING.REPEAT_SCRIPT.toFixed(2),
          priceCurrency: "AUD",
          itemOffered: {
            "@type": "Service",
            name: "Online Prescription",
            serviceType: "Repeat prescription request",
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
