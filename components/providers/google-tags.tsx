"use client"

/**
 * Browser Google tags are intentionally disabled. Connected tags and enhanced
 * measurement forwarded health-flow context despite explicit GA4 routing.
 * Primary Ads purchases/refunds remain server-side; anonymous funnel diagnostics
 * remain in PostHog. Do not restore a tag without browser network privacy proof,
 * including connected destinations and client navigation to capability URLs.
 */
export function GoogleTags() {
  return null
}
