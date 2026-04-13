import { JsonLdScript } from "./json-ld-script"

/**
 * Speakable schema for AI assistants and voice search
 *
 * Tells AI crawlers which parts of a page contain the most useful,
 * concise answers. This helps ChatGPT, Google Assistant, Siri, etc.
 * surface InstantMed content in voice/AI responses.
 */
interface SpeakableSchemaProps {
  name: string
  description: string
  url: string
  speakableSelectors?: string[]
  baseUrl?: string
}

export function SpeakableSchema({
  name,
  description,
  url,
  speakableSelectors = ["h1", "[data-speakable]", "meta[name='description']"],
  baseUrl = "https://instantmed.com.au"
}: SpeakableSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: url.startsWith("http") ? url : `${baseUrl}${url}`,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: speakableSelectors,
    },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
    },
  }

  return <JsonLdScript id={`speakable-schema-${name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`} data={schema} />
}
