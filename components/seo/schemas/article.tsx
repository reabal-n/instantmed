import { JsonLdScript } from "./json-ld-script"

interface HealthArticleSchemaProps {
  title: string
  description: string
  url: string
  lastReviewed?: string
  baseUrl?: string
}

export function HealthArticleSchema({
  title,
  description,
  url,
  lastReviewed,
  baseUrl = "https://instantmed.com.au",
}: HealthArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: title,
    description,
    url: `${baseUrl}${url}`,
    publisher: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
      name: "InstantMed",
    },
    inLanguage: "en-AU",
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}${url}` },
    ...(lastReviewed ? { lastReviewed } : {}),
  }

  return <JsonLdScript id={`health-article-schema-${url.replace(/\//g, "-")}`} data={schema} />
}
