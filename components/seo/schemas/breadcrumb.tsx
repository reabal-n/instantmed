import { JsonLdScript } from "./json-ld-script"

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>
}

/**
 * Schema.org breadcrumb structured data
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }

  return <JsonLdScript id="breadcrumb-schema" data={schema} />
}
