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
  // Attach the aggregate rating to the canonical org node (@id from
  // app/layout.tsx Organization schema) rather than declaring a separate
  // MedicalOrganization. Without @id merging, Google treats this as a
  // second unrelated org with its own rating.
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "@id": "https://instantmed.com.au/#organization",
    name: "InstantMed",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toFixed(1),
      reviewCount,
      bestRating,
      worstRating
    }
  }

  return <JsonLdScript id="review-aggregate-schema" data={schema} />
}
