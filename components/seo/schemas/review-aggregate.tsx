import { JsonLdScript } from "./json-ld-script"

interface ReviewAggregateSchemaProps {
  ratingValue: number
  reviewCount: number
  bestRating?: number
  worstRating?: number
}

/**
 * Schema.org aggregate rating for reviews
 */
export function ReviewAggregateSchema({
  ratingValue,
  reviewCount,
  bestRating = 5,
  worstRating = 1
}: ReviewAggregateSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "InstantMed",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
      bestRating,
      worstRating
    }
  }

  return <JsonLdScript id="review-aggregate-schema" data={schema} />
}
