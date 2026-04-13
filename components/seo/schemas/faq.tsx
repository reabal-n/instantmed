import { JsonLdScript } from "./json-ld-script"

interface FAQSchemaProps {
  faqs: Array<{ question: string; answer: string }>
}

/**
 * Schema.org FAQ structured data
 */
export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  }

  return <JsonLdScript id="faq-schema" data={schema} />
}
