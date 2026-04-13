import { safeJsonLd } from "@/lib/seo/safe-json-ld"

/**
 * Renders JSON-LD structured data via a div wrapper.
 *
 * React 19 throws "Encountered a script tag while rendering React component"
 * when it creates a <script> DOM node during client rendering/hydration.
 * Using dangerouslySetInnerHTML on a <div> tells React to set innerHTML
 * directly - React never creates the inner <script> node itself.
 *
 * Google parses JSON-LD from anywhere in the document, including inside divs.
 */
export function JsonLdScript({ id, data }: { id: string; data: Record<string, unknown> }) {
  return (
    <div
      id={id}
      dangerouslySetInnerHTML={{ __html: `<script type="application/ld+json">${safeJsonLd(data)}</script>` }}
    />
  )
}
