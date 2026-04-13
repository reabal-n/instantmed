import { JsonLdScript } from "./json-ld-script"

/**
 * WebSite schema with SearchAction
 * Enables sitelinks search box in Google results
 */
export function WebSiteSchema({ baseUrl = "https://instantmed.com.au" }: { baseUrl?: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: "InstantMed",
    url: baseUrl,
    description: "Australian telehealth platform for medical certificates, prescription renewals, and online doctor consultations",
    publisher: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
    },
    inLanguage: "en-AU",
  }

  return <JsonLdScript id="website-schema" data={schema} />
}
