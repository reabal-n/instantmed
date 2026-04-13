import { JsonLdScript } from "./json-ld-script"

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

  return <JsonLdScript id={`local-business-schema-${city.toLowerCase()}`} data={schema} />
}
