import { CONTACT_EMAIL_HELLO, CONTACT_PHONE,PRICING_DISPLAY } from "@/lib/constants"

import { JsonLdScript } from "./json-ld-script"
import { SAME_AS_PROFILES } from "./same-as"

interface MedicalBusinessSchemaProps {
  baseUrl?: string
}

/**
 * Schema.org MedicalBusiness structured data for the homepage.
 * Tells Google the site is a legitimate healthcare provider,
 * improving ad Quality Score and local search presence.
 */
export function MedicalBusinessSchema({ baseUrl = "https://instantmed.com.au" }: MedicalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    // Share the organization @id so the homepage's MedicalBusiness +
    // MedicalOrganization nodes resolve to ONE entity in the graph instead of
    // two disconnected business records.
    "@id": `${baseUrl}/#organization`,
    name: "InstantMed",
    description: "Australian telehealth platform for medical certificates, repeat prescriptions, and specialty doctor-reviewed pathways",
    url: baseUrl,
    logo: `${baseUrl}/branding/logo.png`,
    telephone: CONTACT_PHONE,
    email: CONTACT_EMAIL_HELLO,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Level 1/457-459 Elizabeth Street",
      addressLocality: "Surry Hills",
      addressRegion: "NSW",
      postalCode: "2010",
      addressCountry: "AU"
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59"
      }
    ],
    medicalSpecialty: ["PrimaryCare"],
    availableService: [
      {
        "@type": "MedicalProcedure",
        name: "Medical Certificate",
        description: "Online medical certificates reviewed by Australian-registered doctors"
      },
      {
        "@type": "MedicalProcedure",
        name: "Repeat Prescription",
        description: "Online prescription renewals for stable medications"
      },
      {
        "@type": "MedicalProcedure",
        name: "Specialty Consultations",
        description: "Structured doctor-reviewed pathways for eligible ED and hair loss requests"
      }
    ],
    areaServed: {
      "@type": "Country",
      name: "Australia"
    },
    priceRange: PRICING_DISPLAY.RANGE,
    // Verified external identity profiles (entity-linking signal for answer
    // engines). Identity links only — no rating/review schema. See ./same-as.
    sameAs: SAME_AS_PROFILES,
  }

  return <JsonLdScript id="medical-business-schema" data={schema} />
}
