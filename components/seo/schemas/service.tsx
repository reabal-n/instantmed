import { JsonLdScript } from "./json-ld-script"

interface ServiceSchemaProps {
  name: string
  description: string
  price: string
  url: string
  baseUrl?: string
}

/**
 * Schema.org Service structured data.
 * Complements MedicalServiceSchema for pages where the broader
 * schema.org/Service type is more appropriate (e.g. consult pages).
 */
export function ServiceSchema({
  name,
  description,
  price,
  url,
  baseUrl = "https://instantmed.com.au",
}: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: url.startsWith("http") ? url : `${baseUrl}${url}`,
    provider: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
      name: "InstantMed",
    },
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
    },
  }

  return <JsonLdScript id={`service-schema-${name.toLowerCase().replace(/\s+/g, "-")}`} data={schema} />
}
