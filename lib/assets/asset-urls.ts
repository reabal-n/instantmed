/**
 * Asset URL resolution for public branding assets
 * 
 * Resolves absolute URLs for public assets based on NEXT_PUBLIC_APP_URL
 * This is critical for PDF generation (server-side) where relative URLs don't work
 */

export function getAssetUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

/**
 * Get absolute URL for app logo
 * Used in PDF headers and email templates
 */
export function getLogoUrl(): string {
  return getAssetUrl("/branding/instantmed-logo.png")
}

/**
 * Get absolute URL for doctor signature
 * Used in PDF signature area
 */
export function getSignatureUrl(): string {
  return getAssetUrl("/branding/dr-reabal-signature.png")
}

/**
 * Validate that asset URLs resolve (for testing/development)
 */
export async function validateAssetUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch {
    return false
  }
}
