/**
 * Safe JSON-LD Serialization
 * 
 * Provides secure serialization of structured data to prevent XSS attacks.
 * JSON.stringify already escapes special characters, but this adds an extra
 * layer of protection by explicitly escaping script-closing tags.
 */

/**
 * Safely serialize a schema object to JSON-LD string
 * Prevents XSS by escaping any potential script-breaking sequences
 */
export function safeJsonLd<T extends Record<string, unknown>>(schema: T): string {
  const jsonString = JSON.stringify(schema)
  
  // Escape any closing script tags that could break out of the JSON-LD context
  // This prevents attacks like: {"name": "</script><script>alert('xss')</script>"}
  return jsonString
    .replace(/<\/script/gi, '\\u003c/script')
    .replace(/<!--/g, '\\u003c!--')
}

/**
 * Validate that a URL is safe for inclusion in structured data
 */
export function isValidSchemaUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow http/https protocols
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Sanitize text content for use in schema descriptions
 * Removes any HTML tags and normalizes whitespace
 */
export function sanitizeSchemaText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim()
}
