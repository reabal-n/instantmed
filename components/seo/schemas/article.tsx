import { JsonLdScript } from "./json-ld-script"

interface ArticleSchemaProps {
  title: string
  description: string
  url: string
  imageUrl: string
  authorName: string
  publishedAt: string
  updatedAt: string
  baseUrl?: string
}

/**
 * Schema.org Article structured data for blog posts
 */
export function ArticleSchema({
  title,
  description,
  url,
  imageUrl,
  authorName,
  publishedAt,
  updatedAt,
  baseUrl = "https://instantmed.com.au"
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`,
    url,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: {
      "@type": "Person",
      name: authorName,
      url: baseUrl
    },
    publisher: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
      name: "InstantMed",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/branding/logo.png`
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    },
    isPartOf: {
      "@type": "WebSite",
      name: "InstantMed Health Guides",
      url: `${baseUrl}/blog`
    }
  }

  return <JsonLdScript id="article-schema" data={schema} />
}

// ============================================================================
// HEALTH GUIDE / ARTICLE SCHEMA (for guides, compare, intent pages)
// ============================================================================

interface HealthArticleSchemaProps {
  title: string
  description: string
  url: string
  baseUrl?: string
}

export function HealthArticleSchema({
  title,
  description,
  url,
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
  }

  return <JsonLdScript id={`health-article-schema-${url.replace(/\//g, "-")}`} data={schema} />
}
