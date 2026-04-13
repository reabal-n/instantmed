import { JsonLdScript } from "./json-ld-script"

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

  return <JsonLdScript id={`service-schema-${name.toLowerCase().replace(/\s+/g, '-')}`} data={schema} />
}
